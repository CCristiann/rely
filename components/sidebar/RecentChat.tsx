import { Chat } from "@prisma/client";
import { Button, buttonVariants } from "../ui/button";
import Link from "next/link";
import { cn, getActiveProjectIdFromPath } from "@/lib/utils";
import { Ellipsis, Loader2, Pencil, Trash } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverTitle } from "../ui/popover";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { Field, FieldGroup } from "../ui/field";
import { Label } from "../ui/label";
import { useDeleteChat, useRenameChat } from "@/hooks/use-chats";
import { toast } from "../ui/use-toast";
import { useState } from "react";

interface RecentChatProps {
    chat: Chat,
    isActive: boolean
    pathname: string
}
export default function RecentChat({ chat, isActive, pathname }: RecentChatProps) {
    const activeProjectId = getActiveProjectIdFromPath(pathname)

    const [renameValue, setRenameValue] = useState(chat.name)
    const [renameOpen, setRenameOpen] = useState(false)

    const renameChatMutation = useRenameChat(chat.projectId, chat.id)
    const deleteChatMutation = useDeleteChat(chat.projectId, chat.id)

    const handleRenameChat = async () => {
        if (!renameValue.trim()) return
        try {
            await renameChatMutation.mutateAsync({ name: renameValue.trim() })
            setRenameOpen(false)
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "Failed to rename chat",
                variant: "destructive",
            })
        }
    }

    const handleDeleteChat = async () => {
        try {
            await deleteChatMutation.mutateAsync({ projectId: chat.projectId, chatId: chat.id })
            toast({
                title: "Chat deleted",
                description: "Your chat has been deleted",
            })
        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "Failed to delete chat",
                variant: "destructive",
            })
        }
    }

    return (
        <div key={chat.id} className={cn(buttonVariants({ variant: "ghost", className: "pr-0 w-full justify-start text-sm font-normal" }), "text-start truncate", isActive && "bg-primary/20 border border-primary/50 hover:!bg-primary/20")}>
            <Link href={`/dashboard/projects/${activeProjectId}/chat/${chat.id}`} className="flex-1 group-hover/chat:bg-accent truncate">
                {chat.name}
            </Link>
            <div className="shrink-0">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={"ghost"} className="group-hover/chat:bg-accent cursor-pointer">
                            <Ellipsis className="size-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="max-w-[12rem] flex flex-col gap-y-0">
                        <Dialog open={renameOpen} onOpenChange={(open) => { setRenameOpen(open); if (open) setRenameValue(chat.name); }}>
                            <DialogTrigger asChild className="w-full">
                                <Button variant={"ghost"} className="w-full justify-start group-hover/chat:bg-accent cursor-pointer">
                                    <Pencil className="size-4 ml-1.5" />
                                    Rename
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-sm">
                                <DialogHeader className="mb-6">
                                    <DialogTitle>Rename chat</DialogTitle>
                                </DialogHeader>
                                <FieldGroup>
                                    <Field>
                                        <Label>Chat name</Label>
                                        <Input
                                            value={renameValue}
                                            onChange={(e) => setRenameValue(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === "Enter") handleRenameChat(); }}
                                            maxLength={100}
                                        />
                                    </Field>
                                </FieldGroup>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline">Cancel</Button>
                                    </DialogClose>
                                    <Button onClick={handleRenameChat} disabled={renameChatMutation.isPending || !renameValue.trim()}>
                                        {renameChatMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <Button disabled={deleteChatMutation.isPending} onClick={handleDeleteChat} variant={"ghost"} className="w-full justify-start group-hover/chat:bg-accent cursor-pointer hover:!bg-destructive/30 hover:border-destructive/50 hover:border text-destructive hover:text-destructive">
                            {deleteChatMutation.isPending ? <Loader2 className="size-4 ml-1.5 animate-spin" /> : <Trash className="size-4 ml-1.5" />}
                            Delete
                        </Button>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    )
}