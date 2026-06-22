import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auth } from "@/auth";

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

    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    
    let allowed = false;
    let category = "";
    
    if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      allowed = true;
      category = "pdf";
    } else if (fileType.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/.test(fileName)) {
      allowed = true;
      category = "image";
    } else if (fileType.startsWith("video/") || /\.(mp4|webm|ogv|mov)$/.test(fileName)) {
      allowed = true;
      category = "video";
    }
    
    if (!allowed) {
      return NextResponse.json({ error: "Unsupported file type. Allowed: PDF, Images, Videos" }, { status: 400 });
    }

    // Validate size (max 20MB for videos, 5MB for others)
    const maxSize = category === "video" ? 20 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: `File size exceeds the limit (${category === "video" ? "20MB" : "5MB"})` }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename using user ID, random UUID, and correct extension
    const uniqueId = crypto.randomUUID();
    const ext = path.extname(file.name) || (category === "image" ? ".png" : category === "video" ? ".mp4" : ".pdf");
    const filename = `upload-${session.user.id}-${uniqueId}${ext}`;

    // Ensure uploads directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${filename}`;
    return NextResponse.json({ url: fileUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
