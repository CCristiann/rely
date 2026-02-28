"use client"

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { DocumentTable } from "@/components/documents/document-table";
import { UploadZone } from "@/components/documents/upload-zone";
import { NotionPagePicker } from "@/components/notion/notion-page-picker";
import { NotionDataSourceCard } from "@/components/notion/notion-datasource-card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useDeleteDocument, useDocuments } from "@/hooks/use-documents";
import { useNotionDataSource } from "@/hooks/use-notion";
import { useQueryClient } from "@tanstack/react-query";
import { getActiveProjectIdFromPath } from "@/lib/utils";

export default function DocumentsPage() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const router = useRouter()
    const activeProjectId = getActiveProjectIdFromPath(pathname)!

    const queryClient = useQueryClient()
    const { data: documents, isLoading } = useDocuments(activeProjectId)
    const deleteDocumentMutation = useDeleteDocument(activeProjectId)
    const { data: notionDs } = useNotionDataSource(activeProjectId)

    const [pickerOpen, setPickerOpen] = useState(false)

    useEffect(() => {
        if (searchParams.get("notionConnected") === "true") {
            setPickerOpen(true)
            router.replace(`/dashboard/projects/${activeProjectId}/documents`)
        }
    }, [searchParams, router, activeProjectId])

    const handleDeleteDocument = async (id: string) => {
        try {
            await deleteDocumentMutation.mutateAsync(id)
            toast({
                title: "Document deleted",
                description: "Your document has been deleted",
            })
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "Failed to delete document",
                variant: "destructive",
            })
        }
    }

    return (
        <div className="space-y-8 p-6 overflow-y-scroll">
            <div>
                <h1 className="text-2xl font-bold tracking-tight mb-4">Documents</h1>
                <UploadZone
                    projectId={activeProjectId}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ["documents", activeProjectId] })
                    }}
                />
            </div>

            <div>
                <h2 className="text-lg font-semibold tracking-tight mb-4">Notion</h2>
                {notionDs ? (
                    <>
                        <NotionDataSourceCard
                            projectId={activeProjectId}
                            workspaceName={notionDs.workspaceName}
                            status={notionDs.status}
                            lastSyncedAt={notionDs.lastSyncedAt ? new Date(notionDs.lastSyncedAt) : null}
                            pageCount={notionDs.pageCount}
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-xs text-muted-foreground"
                            onClick={() => setPickerOpen(true)}
                        >
                            Change page selection
                        </Button>
                    </>
                ) : (
                    <Button
                        variant="outline"
                        onClick={() => {
                            window.location.href = `/api/auth/notion?projectId=${activeProjectId}`
                        }}
                    >
                        Connect Notion
                    </Button>
                )}
            </div>

            <div>
                <h2 className="text-lg font-semibold tracking-tight mb-4">Knowledge Base</h2>
                <DocumentTable
                    documents={documents || []}
                    onDelete={handleDeleteDocument}
                    isLoading={isLoading}
                />
            </div>

            <NotionPagePicker
                projectId={activeProjectId}
                open={pickerOpen}
                onOpenChange={setPickerOpen}
            />
        </div>
    )
}
