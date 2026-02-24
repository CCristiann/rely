import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/sidebar/index";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { Project } from "@/types";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { User } from "next-auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Fetch user's projects for sidebar
  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { documents: true, chats: true } } },
  });


  return (
    <SidebarProvider className="h-svh overflow-hidden">

      <Sidebar
        user={session.user as User}
        projects={projects as unknown as Project[]}
      />

      {/* Main content area */}
      <SidebarInset>
        <MobileNav projects={projects as unknown as Project[]} />
        {children}
      </SidebarInset>
    </SidebarProvider >
  );
}
