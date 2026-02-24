import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createServerSupabaseClient, STORAGE_BUCKET } from "@/lib/supabase";
import { inngest } from "@/lib/inngest/client";
import { rateLimit } from "@/lib/rate-limit";
import path from "path";
import { randomUUID } from "crypto";

function sanitizeFileName(raw: string): string {
  const base = path.basename(raw);
  const sanitized = base.replace(/[^a-zA-Z0-9 .\-_]/g, "_");
  return sanitized.slice(0, 200) || "upload";
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 10 uploads per minute per user
  const rl = await rateLimit(`upload:${session.user.id}`, { limit: 10, windowMs: 60_000 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before uploading again." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.reset - Math.floor(Date.now() / 1000)) },
      }
    );
  }

  const { id: projectId } = await params;

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Only PDF and DOCX files are supported" },
      { status: 400 }
    );
  }

  const MAX_SIZE = 25 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large (max 25 MB)" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeFileName = sanitizeFileName(file.name);

  // Upload file to Supabase Storage
  const supabase = createServerSupabaseClient();
  const storagePath = `${session.user.id}/${projectId}/${randomUUID()}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return NextResponse.json({ error: "File storage failed" }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  const fileUrl = urlData.publicUrl;

  console.log("File URL:", fileUrl);

  // All DB operations run inside a try-catch so we can delete the uploaded
  // Supabase file if anything fails — preventing orphaned storage objects.
  try {
    // Find or create the FILE DataSource for this project
    let dataSource = await prisma.dataSource.findFirst({
      where: { projectId, type: "FILE" },
    });

    if (!dataSource) {
      dataSource = await prisma.dataSource.create({
        data: { projectId, type: "FILE", name: "File Uploads", status: "READY" },
      });
    }

    // Create the Document record immediately (status: PENDING)
    const document = await prisma.document.create({
      data: {
        name: safeFileName,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type,
        projectId,
        dataSourceId: dataSource.id,
        status: "PENDING",
      },
    });

    // Dispatch background ingestion job
    await inngest.send({
      name: "document/ingest.requested",
      data: {
        documentId: document.id,
        fileUrl,
        storagePath,
        fileName: safeFileName,
        mimeType: file.type,
        dataSourceId: dataSource.id,
      },
    });

    return NextResponse.json(
      { documentId: document.id, status: "processing" },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /upload] DB error, rolling back Supabase upload:", err);
    // Best-effort rollback — if this also fails we log but don't throw again
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]).catch((e) =>
      console.error("[POST /upload] Supabase rollback failed:", e)
    );
    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 });
  }
}
