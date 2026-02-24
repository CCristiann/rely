"use client"

import { DocumentTable } from "@/components/documents/document-table";
import { UploadZone } from "@/components/documents/upload-zone";
import { toast } from "@/components/ui/use-toast";
import { useDeleteDocument, useDocuments } from "@/hooks/use-documents";
import { useQueryClient } from "@tanstack/react-query";
import { getActiveProjectIdFromPath } from "@/lib/utils";
import { usePathname } from "next/navigation";

export default function DocumentsPage() {
    const pathname = usePathname()
    const activeProjectId = getActiveProjectIdFromPath(pathname)
    const queryClient = useQueryClient()
    const { data: documents, isLoading } = useDocuments(activeProjectId!)

    const deleteDocumentMutation = useDeleteDocument(activeProjectId!)
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
                    projectId={activeProjectId!}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ["documents", activeProjectId] })
                    }}
                />
            </div>

            <div>
                <h2 className="text-lg font-semibold tracking-tight mb-4">Knowledge Base</h2>
                <DocumentTable
                    documents={documents || []}
                    onDelete={handleDeleteDocument}
                    isLoading={isLoading}
                />
            </div>
        </div>
    )
}