"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ChevronRight, Home, LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopbarProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
  projectName?: string;
}

export function Topbar({ user, projectName }: TopbarProps) {
  const pathname = usePathname();
  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "U";

  const segments = [
    { label: "Dashboard", href: "/dashboard/projects" },
    ...(projectName ? [{ label: projectName, href: pathname }] : []),
  ];

  return (
    <header className="h-14 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm">
        <Link href="/dashboard/projects" className="text-muted-foreground hover:text-foreground transition-colors">
          <Home className="h-3.5 w-3.5" />
        </Link>
        {segments.map((seg, i) => (
          <span key={seg.href} className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
            {i === segments.length - 1 ? (
              <span className="text-foreground font-medium text-xs">{seg.label}</span>
            ) : (
              <Link href={seg.href} className="text-muted-foreground hover:text-foreground transition-colors text-xs">
                {seg.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-ring">
            <Avatar className="h-7 w-7">
              <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
              <AvatarFallback className="text-xs bg-primary/20 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-muted-foreground font-normal text-xs truncate">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
