import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface NotionPageMeta {
    id: string;
    title: string;
    url: string;
    icon: string | null;
}

export function useNotionPages(projectId: string, enabled: boolean) {
    return useQuery({
        queryKey: ["notion-pages", projectId],
        queryFn: async () => {
            const res = await fetch(`/api/projects/${projectId}/notion/pages`);
            if (!res.ok) throw new Error("Failed to fetch Notion pages");
            const data = (await res.json()) as { pages: NotionPageMeta[] };
            return data.pages;
        },
        enabled,
    });
}

export function useSaveNotionPages(projectId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: {
            selectedPageIds: string[];
            pageMetadata: Record<string, { title: string; url: string }>;
        }) => {
            const res = await fetch(`/api/projects/${projectId}/notion/pages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error("Failed to save page selection");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["documents", projectId] });
            queryClient.invalidateQueries({ queryKey: ["notion-datasource", projectId] });
        },
    });
}

export function useSyncNotion(projectId: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/projects/${projectId}/notion/sync`, {
                method: "POST",
            });
            if (!res.ok) throw new Error("Failed to trigger sync");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["documents", projectId] });
            queryClient.invalidateQueries({ queryKey: ["notion-datasource", projectId] });
        },
    });
}

export interface NotionDataSource {
    id: string;
    workspaceName: string;
    status: "READY" | "SYNCING" | "ERROR";
    lastSyncedAt: string | null;
    pageCount: number;
}

export function useNotionDataSource(projectId: string) {
    return useQuery({
        queryKey: ["notion-datasource", projectId],
        queryFn: async () => {
            const res = await fetch(`/api/projects/${projectId}/notion/datasource`);
            if (res.status === 404) return null;
            if (!res.ok) throw new Error("Failed to fetch Notion data source");
            return res.json() as Promise<NotionDataSource>;
        },
        refetchInterval: (query) =>
            query.state.data?.status === "SYNCING" ? 2000 : false,
    });
}