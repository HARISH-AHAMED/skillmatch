import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";
import { requireProjectParty } from "@/lib/authz";
import { safeContentType } from "@/lib/uploads";

/**
 * SEC-008 — this route previously joined the caller-supplied file name straight
 * into a filesystem path with no normalization, so `..%2f..%2f.env` escaped the
 * uploads directory and returned server secrets. It also served any file to any
 * authenticated user, with no check that they belonged to the owning project.
 *
 * Both are fixed here:
 *   1. The file is resolved from the SharedFile table, not from the URL. The
 *      caller's input is only ever used to *look up a row*, never to build a
 *      path — so traversal has nothing to act on.
 *   2. Membership of that row's project is enforced with the shared guard.
 *   3. The resolved path is still containment-checked before any read, as
 *      defence in depth against a malformed stored fileUrl.
 */

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileName: string }> }
) {
  const { fileName } = await params;
  const requested = decodeURIComponent(fileName);

  // Look the file up as data. Matching on the stored basename keeps existing
  // links working without ever treating the input as a path.
  const record = await db.sharedFile.findFirst({
    where: { fileUrl: { endsWith: `/${requested}` } },
    select: { id: true, projectId: true, fileName: true, fileUrl: true },
  });

  if (!record) {
    return new Response("Not found", { status: 404 });
  }

  // Only a party to the owning project may download it.
  const access = await requireProjectParty(record.projectId);
  if (!access.ok) {
    return new Response("Not found", { status: 404 });
  }

  // A stored data: URL has no file on disk — hand back the decoded bytes.
  if (record.fileUrl.startsWith("data:")) {
    const [meta, b64] = record.fileUrl.split(",", 2);
    // SEC-015 — records written before upload validation was hardened can carry
    // any MIME the client declared, so anything off the allowlist is downgraded
    // rather than echoed back. Served as an attachment either way.
    const mime = safeContentType(meta.slice(5).replace(/;base64$/, ""));
    return new Response(Buffer.from(b64 ?? "", "base64"), {
      headers: {
        "Content-Type": mime,
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(record.fileName)}"`,
      },
    });
  }

  // Defence in depth: resolve and confirm containment before touching disk.
  const basename = path.basename(record.fileUrl);
  const filePath = path.resolve(UPLOAD_DIR, basename);
  if (filePath !== path.join(UPLOAD_DIR, basename) || !filePath.startsWith(UPLOAD_DIR + path.sep)) {
    return new Response("Not found", { status: 404 });
  }

  if (!fs.existsSync(filePath)) {
    return new Response("Not found", { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  return new Response(fileBuffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(record.fileName)}"`,
    },
  });
}
