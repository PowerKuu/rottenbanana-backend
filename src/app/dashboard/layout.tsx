import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { DashboardSidebar } from "@/components/DashboardSidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <DashboardSidebar />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger />
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-semibold">Dashboard</h1>
                    </div>
                </header>
                <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
            </SidebarInset>
        </SidebarProvider>
    )
}
