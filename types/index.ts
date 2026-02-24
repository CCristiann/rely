// ── Domain types (mirrors Prisma models without the vector field) ──

export type DataSourceType = "FILE" | "NOTION" | "GDRIVE" | "URL";
export type DataSourceStatus = "READY" | "SYNCING" | "ERROR";
export type DocumentStatus = "PENDING" | "PROCESSING" | "READY" | "ERROR";

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  createdAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    documents: number;
    chats: number;
  };
}

export interface DataSource {
  id: string;
  type: DataSourceType;
  name: string;
  config: Record<string, unknown>;
  status: DataSourceStatus;
  lastSyncedAt: Date | null;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id: string;
  name: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  status: DocumentStatus;
  projectId: string;
  dataSourceId: string | null;
  createdAt: Date;
  _count?: {
    chunks: number;
  };
}

export interface Chat {
  id: string;
  name: string;
  projectId: string;
  createdAt: Date;
  updatedAt: Date;
  messages?: Message[];
  _count?: {
    messages: number;
  };
}

export interface Message {
  id: string;
  chatId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

// ── API response types ──────────────────────────────────────────

export interface ApiError {
  error: string;
  details?: string;
}

export interface UploadProgress {
  stage: "uploading" | "processing" | "done" | "error";
  message: string;
}

// ── Form schemas (inferred from Zod) ───────────────────────────

export interface CreateProjectInput {
  name: string;
  description?: string;
}

export interface CreateChatInput {
  name?: string;
}

export interface DeleteChatInput {
  projectId: string;
  chatId: string;
}
