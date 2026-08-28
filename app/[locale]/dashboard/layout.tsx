import { cookies } from "next/headers"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { OneSignalProvider } from "@/providers/onesignal-provider"
import { NotificationProvider } from "@/providers/notification-provider"
import { Toaster } from "sonner"

/**
 * The nav spec says of collapsing the rail: "The choice persists per user."
 * `SidebarProvider` WRITES `sidebar_state` on every toggle but never reads it
 * back — its own state starts from `defaultOpen`, so the rail sprang open again
 * on every reload and the cookie was write-only. Seeding `defaultOpen` from the
 * cookie here is what closes that loop, and it has to happen in this server
 * layout: read on the client it would flash expanded before hydration.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies()
  const collapsedChoice = store.get("sidebar_state")?.value
  return (
    <SidebarProvider defaultOpen={collapsedChoice !== "false"}>
      <OneSignalProvider />
      <NotificationProvider />
      <Toaster richColors position="top-right" />
      <AppSidebar />
      <SidebarInset>
        {/* Read here rather than in the header: this layout is a server
            component, and `HEALTH_URL` is deliberately not a `NEXT_PUBLIC_*`
            var — those are inlined at build time and so could not be changed by
            whoever runs the container. Unset, the topbar's status chip renders
            nothing rather than claiming health it never checked. */}
        <DashboardHeader healthUrl={process.env.HEALTH_URL} />
        <main className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
