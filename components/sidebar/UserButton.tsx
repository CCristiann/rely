"use client"

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from "../ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { signOut } from "next-auth/react"
import { ChevronsUpDown, LogOut } from "lucide-react"
import { User } from "next-auth"
import { buttonVariants } from "../ui/button"

export default function UserButton({ user }: { user: User }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", className: "w-full" }), "py-5")}>
                <div className="flex w-full items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Avatar className="size-8">
                            <AvatarImage src={user.image!} />
                            <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{user.name}</span>
                    </div>
                    <ChevronsUpDown className="h-4 w-4" />
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="space-y-2">
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>

                <div className="flex flex-col gap-y-1">
                    <DropdownMenuItem asChild>
                        <button onClick={() => signOut()}>
                            <LogOut className="h-4 w-4" />
                            Logout
                        </button>
                    </DropdownMenuItem>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}