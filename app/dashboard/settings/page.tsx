import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle2, XCircle } from "lucide-react"

const integrations = [
  { name: "Google Maps", purpose: "Live map & geofence",   connected: true  },
  { name: "Cloudinary",  purpose: "Photo & video storage", connected: true  },
  { name: "Firebase",    purpose: "Push notifications",    connected: false },
  { name: "Stripe",      purpose: "Payment processing",    connected: true  },
  { name: "Supabase",    purpose: "Realtime database",     connected: true  },
  { name: "OneSignal",   purpose: "Push notifications",    connected: false },
]

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">System configuration and integrations.</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Update your organization details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input defaultValue="ERP Control Center" />
                </div>
                <div className="space-y-2">
                  <Label>Support Email</Label>
                  <Input defaultValue="support@erp.com" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input defaultValue="+998 71 200 00 00" />
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Input defaultValue="Asia/Tashkent (UTC+5)" />
                </div>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Third-party Integrations</CardTitle>
              <CardDescription>Manage external service connections.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {integrations.map((int, i) => (
                <div key={int.name}>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{int.name}</p>
                      <p className="text-xs text-muted-foreground">{int.purpose}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {int.connected ? (
                        <span className="flex items-center gap-1 text-xs text-green-500">
                          <CheckCircle2 className="size-3.5" /> Connected
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <XCircle className="size-3.5" /> Not connected
                        </span>
                      )}
                      <Button variant={int.connected ? "outline" : "default"} size="sm">
                        {int.connected ? "Configure" : "Connect"}
                      </Button>
                    </div>
                  </div>
                  {i < integrations.length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <p className="text-muted-foreground text-sm mt-4">Notification preferences.</p>
        </TabsContent>
        <TabsContent value="security">
          <p className="text-muted-foreground text-sm mt-4">2FA, sessions, and permissions.</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
