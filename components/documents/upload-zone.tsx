"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, FileText, FileIcon, CheckCircle, AlertCircle, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

interface UploadZoneProps {
  projectId: string;
  onSuccess?: () => void;
}

type UploadStatus = "idle" | "uploading" | "queued" | "error";

interface FileUpload {
  file: File;
  status: UploadStatus;
  message?: string;
  error?: string;
}

const ACCEPTED_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
};

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export function UploadZone({ projectId, onSuccess }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<FileUpload[]>([]);

  const updateUpload = (fileName: string, update: Partial<FileUpload>) => {
    setUploads((prev) =>
      prev.map((u) => (u.file.name === fileName ? { ...u, ...update } : u))
    );
  };

  const uploadFile = useCallback(
    async (file: File) => {
      if (!Object.keys(ACCEPTED_TYPES).includes(file.type)) {
        toast({ title: "Invalid file type", description: "Only PDF and DOCX files are supported.", variant: "destructive" });
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast({ title: "File too large", description: "Max file size is 25 MB.", variant: "destructive" });
        return;
      }

      setUploads((prev) => [...prev, { file, status: "uploading", message: "Uploading…" }]);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch(`/api/projects/${projectId}/upload`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error ?? "Upload failed");
        }

        // Server returns { documentId, status: "processing" } immediately
        updateUpload(file.name, {
          status: "queued",
          message: "Processing in background…",
        });

        toast({
          title: "Document uploaded",
          description: `${file.name} is being processed. It will appear in the list shortly.`,
          variant: "default",
        });

        onSuccess?.();

        // Auto-remove the queued item after 4 s — the document table already
        // polls every 2 s and will reflect the real status.
        setTimeout(() => removeUpload(file.name), 4000);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        updateUpload(file.name, { status: "error", error: msg });
        toast({ title: "Upload failed", description: msg, variant: "destructive" });
      }
    },
    [projectId, onSuccess]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      Array.from(files).forEach(uploadFile);
    },
    [uploadFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const removeUpload = (fileName: string) => {
    setUploads((prev) => prev.filter((u) => u.file.name !== fileName));
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 cursor-pointer transition-all duration-200",
          isDragging
            ? "border-primary bg-primary/8 scale-[1.01]"
            : "border-border hover:border-primary/50 hover:bg-primary/3"
        )}
      >
        <div className={cn(
          "flex items-center justify-center w-12 h-12 rounded-xl transition-all",
          isDragging ? "bg-primary/20 scale-110" : "bg-muted"
        )}>
          <Upload className={cn("h-5 w-5 transition-colors", isDragging ? "text-primary" : "text-muted-foreground")} />
        </div>

        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {isDragging ? "Drop files here" : "Drag & drop or click to upload"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, DOCX · Max 25 MB per file
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Upload queue */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((upload) => (
            <div
              key={upload.file.name}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="shrink-0">
                {upload.status === "queued" ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : upload.status === "error" ? (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                ) : upload.status === "uploading" ? (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                ) : upload.file.name.endsWith(".pdf") ? (
                  <FileText className="h-4 w-4 text-primary" />
                ) : (
                  <FileIcon className="h-4 w-4 text-primary" />
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-foreground truncate">
                    {upload.file.name}
                  </p>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatBytes(upload.file.size)}
                  </span>
                </div>

                {upload.status === "uploading" && (
                  <p className="text-[10px] text-muted-foreground">{upload.message}</p>
                )}

                {upload.status === "queued" && (
                  <p className="text-[10px] text-muted-foreground">{upload.message}</p>
                )}

                {upload.status === "error" && (
                  <p className="text-[10px] text-destructive">{upload.error}</p>
                )}
              </div>

              {upload.status !== "uploading" && (
                <button
                  onClick={() => removeUpload(upload.file.name)}
                  className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
