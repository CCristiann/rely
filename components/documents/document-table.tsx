"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
    FileText,
    Trash2,
    ExternalLink,
    Layers,
    Loader2,
    MoreHorizontal,
} from "lucide-react";
import { FileTypeIcon, getFileTypeConfig } from "@/components/documents/file-type-icon";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { formatBytes, cn } from "@/lib/utils";
import type { Document, DocumentStatus } from "@/types";

interface DocumentTableProps {
    documents: Document[];
    isLoading?: boolean;
    onDelete: (id: string) => Promise<void>;
}

function StatusBadge({ status }: { status: DocumentStatus }) {
    if (status === "READY") {
        return (
            <div className="flex w-[100px] items-center">
                <Badge variant="default" className="text-[10px] bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">
                    Ready
                </Badge>
            </div>
        );
    }

    if (status === "PENDING" || status === "PROCESSING") {
        return (
            <div className="flex w-[100px] items-center gap-1.5 text-[11px] font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                <Loader2 className="h-3 w-3 animate-spin" />
                {status === "PENDING" ? "Queued" : "Processing"}
            </div>
        );
    }

    if (status === "ERROR") {
        return (
            <div className="flex w-[100px] items-center">
                <Badge variant="destructive" className="text-[10px]">
                    Error
                </Badge>
            </div>
        );
    }

    return null;
}

export function DocumentTable({ documents, isLoading, onDelete }: DocumentTableProps) {
    const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
    const [deleting, setDeleting] = useState(false);

    async function handleDelete() {
        if (!documentToDelete) return;
        setDeleting(true);
        try {
            await onDelete(documentToDelete.id);
        } finally {
            setDeleting(false);
            setDocumentToDelete(null);
        }
    }

    if (isLoading) {
        return (
            <div className="rounded-md border border-border bg-card overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[40%]">File Name</TableHead>
                            <TableHead className="w-[15%] hidden md:table-cell">Size</TableHead>
                            <TableHead className="w-[20%]">Status</TableHead>
                            <TableHead className="w-[20%] hidden sm:table-cell">Uploaded</TableHead>
                            <TableHead className="w-[5%] text-right"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                                        <Skeleton className="h-4 w-[200px]" />
                                    </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                    <Skeleton className="h-4 w-16" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-5 w-20 rounded-full" />
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                    <Skeleton className="h-4 w-24" />
                                </TableCell>
                                <TableCell>
                                    <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        );
    }

    if (documents.length === 0) {
        return (
            <EmptyState
                icon={FileText}
                title="No documents yet"
                description="Upload PDF or DOCX files to build your knowledge base."
            />
        );
    }

    return (
        <>
            <div className="rounded-md border border-border bg-card overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="font-medium">File Details</TableHead>
                            <TableHead className="font-medium hidden md:table-cell">Size</TableHead>
                            <TableHead className="font-medium hidden lg:table-cell">Chunks</TableHead>
                            <TableHead className="font-medium">Status</TableHead>
                            <TableHead className="font-medium hidden sm:table-cell">Uploaded</TableHead>
                            <TableHead className="text-right"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {documents.map((doc) => {
                            const fileType = getFileTypeConfig(doc.mimeType);
                            return (
                                <TableRow key={doc.id} className="group transition-colors hover:bg-muted/30">
                                    <TableCell className="py-3">
                                        <div className="flex items-center gap-3">
                                            <FileTypeIcon mimeType={doc.mimeType} />
                                            <div className="flex flex-col max-w-[200px] sm:max-w-[300px] lg:max-w-[400px]">
                                                <span className="text-sm font-medium text-foreground truncate" title={doc.name}>
                                                    {doc.name}
                                                </span>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className={cn("text-[10px] font-semibold uppercase tracking-wide", fileType.chipClass)}>
                                                        {fileType.label}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground/40 md:hidden">·</span>
                                                    <span className="text-[11px] text-muted-foreground md:hidden">
                                                        {formatBytes(doc.fileSize)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </TableCell>

                                    <TableCell className="hidden md:table-cell py-3 text-sm text-muted-foreground">
                                        {formatBytes(doc.fileSize)}
                                    </TableCell>

                                    <TableCell className="hidden lg:table-cell py-3">
                                        {doc._count?.chunks !== undefined ? (
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <Layers className="h-3.5 w-3.5 opacity-70" />
                                                <span>{doc._count.chunks}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">-</span>
                                        )}
                                    </TableCell>

                                    <TableCell className="py-3">
                                        <StatusBadge status={doc.status} />
                                    </TableCell>

                                    <TableCell className="hidden sm:table-cell py-3 text-sm text-muted-foreground whitespace-nowrap">
                                        {format(doc.createdAt, "MMM dd, yyyy")}
                                    </TableCell>

                                    <TableCell className="py-3 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 opacity-100 transition-opacity"
                                                >
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-[160px]">
                                                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                                                    Actions
                                                </DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem asChild>
                                                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="cursor-pointer flex items-center gap-2">
                                                        <ExternalLink className="h-4 w-4" />
                                                        <span>View Original</span>
                                                    </a>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => setDocumentToDelete(doc)}
                                                    className="text-destructive focus:text-destructive cursor-pointer flex items-center gap-2"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    <span>Delete file</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={!!documentToDelete} onOpenChange={(open) => !open && !deleting && setDocumentToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete document?</DialogTitle>
                        <DialogDescription>
                            This will permanently delete &ldquo;{documentToDelete?.name}&rdquo; and all
                            its embedded chunks. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDocumentToDelete(null)} disabled={deleting}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                            {deleting && <LoadingSpinner size="sm" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
