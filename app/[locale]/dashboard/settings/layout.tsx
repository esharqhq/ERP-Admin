import { SettingsNav } from "@/components/settings/settings-nav"

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-8">
      <aside className="w-full shrink-0 md:w-48">
        <SettingsNav />
      </aside>
      <div className="min-w-0 flex-1">
        {children}
      </div>
    </div>
  )
}
