import { SidebarGroup, SidebarGroupContent } from "../ui/sidebar";

export default function NoProjectSelected() {
    return (
        <SidebarGroup className="h-full">
            <SidebarGroupContent className="w-full h-full flex flex-col gap-y-1 items-center justify-center text-center">
                <p className="text-sm font-medium">No project selected</p>
                <p className="text-xs text-muted-foreground">Select a project to start a chat</p>
            </SidebarGroupContent>
        </SidebarGroup>
    )
}