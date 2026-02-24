"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Document } from "@/types";

async function fetchDocuments(projectId: string): Promise<Document[]> {
  const res = await fetch(`/api/projects/${projectId}/documents`);
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
}

async function deleteDocument(projectId: string, docId: string): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/documents/${docId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Failed to delete document");
  }
}

export function useDocuments(projectId: string) {
  return useQuery({
    queryKey: ["documents", projectId],
    queryFn: () => fetchDocuments(projectId),
    enabled: !!projectId,
    // Poll every 2s while any document is still being processed
    refetchInterval: (query) => {
      const hasPending = query.state.data?.some(
        (d) => d.status === "PENDING" || d.status === "PROCESSING"
      );
      return hasPending ? 2000 : false;
    },
  });
}

export function useDeleteDocument(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => deleteDocument(projectId, docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
