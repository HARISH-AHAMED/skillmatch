import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import { validateUpload, buildUploadFilename } from "@/lib/uploads";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // SEC-015 — MIME type and extension must agree on one allowlist entry.
    // SVG is rejected here by both signals.
    const validated = validateUpload({ type: file.type, name: file.name });
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: validated.status });
    }

    const limitLabel = `${Math.round(validated.maxSize / (1024 * 1024))}MB`;
    if (file.size > validated.maxSize) {
      return NextResponse.json({ error: `File size exceeds the limit (${limitLabel})` }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // The declared size is the client's claim; the received bytes are not.
    if (buffer.length > validated.maxSize) {
      return NextResponse.json({ error: `File size exceeds the limit (${limitLabel})` }, { status: 400 });
    }

    // Extension comes from the validated allowlist entry, never from file.name.
    const filename = buildUploadFilename(session.user.id ?? "user", crypto.randomUUID(), validated.extension);

    // Serverless hosts (Vercel) have a read-only filesystem and no persistence
    // between invocations, so disk writes 500 and the saved URL later 404s.
    // There, return a data URL the client can store and render directly.
    if (process.env.VERCEL || process.env.NODE_ENV === "production") {
      // Content type is the validated one, so a mislabelled upload cannot be
      // stored as an active type such as text/html.
      const dataUrl = `data:${validated.contentType};base64,${buffer.toString("base64")}`;
      return NextResponse.json({ url: dataUrl });
    }

    // Local development keeps writing to public/uploads.
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);
    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
