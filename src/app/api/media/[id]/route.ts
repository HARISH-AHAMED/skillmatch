import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { safeContentType } from "@/lib/uploads";

/* ============================================================================
   MEDIA DELIVERY

   Uploads used to come back as `data:` URLs, which meant the bytes were stored
   in a text column and re-serialized into the HTML of every page that rendered
   the image — once per card. The home page shipped 1.06 MB of base64 that way.

   Bytes now live in MediaAsset and are served from here. The id is the sha-256
   of the content, so a given URL can never point at different bytes: the
   response is safe to cache immutably, by the browser and by the CDN.
   ========================================================================= */

/** Ids are hex sha-256 digests. Anything else cannot exist, so reject it early. */
const ID_PATTERN = /^[0-9a-f]{64}$/;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!ID_PATTERN.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const asset = await db.mediaAsset.findUnique({
    where: { id },
    select: { data: true, mimeType: true },
  });

  if (!asset) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(Buffer.from(asset.data) as unknown as BodyInit, {
    headers: {
      // safeContentType is the same allowlist the upload path validates
      // against, so a row can never be served as an active type such as
      // text/html even if one were written directly to the table.
      "Content-Type": safeContentType(asset.mimeType),
      "Content-Length": String(asset.data.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      // The bytes are what was uploaded; never let a browser re-interpret them.
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
