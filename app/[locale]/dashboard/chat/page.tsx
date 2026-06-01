import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Paperclip, Send, Smile, Phone, MoreVertical } from "lucide-react"

type Conversation = {
  id: number
  name: string
  role: "Worker" | "Owner"
  lastMessage: string
  time: string
  unread?: number
  online?: boolean
  active?: boolean
}

const conversations: Conversation[] = [
  { id: 1, name: "Jasur Toshmatov",    role: "Worker", lastMessage: "Task tugadi, foto yubordim",       time: "12:42", unread: 2, online: true,  active: true },
  { id: 2, name: "Sunrise LLC",        role: "Owner",  lastMessage: "Shartnoma yangilandimi?",          time: "11:58", unread: 1 },
  { id: 3, name: "Malika Saidova",     role: "Worker", lastMessage: "Materiallar yetib keldi",         time: "10:30", online: true },
  { id: 4, name: "GrandBuild Corp",    role: "Owner",  lastMessage: "Worker o'z vaqtida kelmadi",      time: "09:15", unread: 3 },
  { id: 5, name: "Bobur Karimov",      role: "Worker", lastMessage: "Bugun kasalman, kela olmayman",   time: "08:02" },
  { id: 6, name: "Feruza Abdullayeva", role: "Owner",  lastMessage: "Rahmat, hammasi a'lo!",           time: "Kecha" },
  { id: 7, name: "Zulfiya Rahimova",   role: "Worker", lastMessage: "Check-out qildim",                time: "Kecha" },
  { id: 8, name: "Akbar Mirzayev",     role: "Owner",  lastMessage: "Yangi mulk qo'shmoqchiman",       time: "May 10" },
]

type Message = {
  id: number
  from: "me" | "them"
  text: string
  time: string
  attachment?: string
}

const activeMessages: Message[] = [
  { id: 1, from: "them", text: "Assalomu alaykum, Villa Sunrise'ga keldim",            time: "11:20" },
  { id: 2, from: "me",   text: "Vaalaykum assalom. Ish boshlasangiz bo'ladi",          time: "11:22" },
  { id: 3, from: "them", text: "HVAC tizimida muammo katta ekan, kompressorni almashtirish kerak", time: "11:45" },
  { id: 4, from: "me",   text: "Foto yuboring, ko'rib chiqaman",                       time: "11:46" },
  { id: 5, from: "them", text: "Mana, eski kompressor",                                time: "11:50", attachment: "compressor_old.jpg" },
  { id: 6, from: "me",   text: "Tushunarli. Yangi qism uchun zayavka berdim, ertaga keladi", time: "12:05" },
  { id: 7, from: "them", text: "Yaxshi. Bugun esa boshqa nosozliklarni ko'rib chiqaman", time: "12:30" },
  { id: 8, from: "them", text: "Task tugadi, foto yubordim",                           time: "12:42", attachment: "completion.jpg" },
]

export default function ChatPage() {
  const active = conversations.find((c) => c.active) ?? conversations[0]

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chat</h1>
        <p className="text-muted-foreground">Workerlar va Ownerlar bilan ichki yozishmalar.</p>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="grid h-[calc(100vh-13rem)] grid-cols-[320px_1fr]">
          <div className="flex flex-col border-r bg-muted/20">
            <div className="border-b p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input placeholder="Yozishmalarni qidirish..." className="pl-8" />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="flex flex-col">
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    className={`flex items-start gap-3 border-b border-border/50 p-3 text-left transition-colors hover:bg-muted/50 ${
                      c.active ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="relative shrink-0">
                      <Avatar className="size-10">
                        <AvatarFallback>{c.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      {c.online && (
                        <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-background bg-emerald-500" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{c.name}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{c.time}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-muted-foreground">{c.lastMessage}</span>
                        {c.unread ? (
                          <Badge className="h-5 min-w-5 shrink-0 px-1.5 text-[10px]">{c.unread}</Badge>
                        ) : null}
                      </div>
                      <Badge variant="outline" className="mt-0.5 w-fit text-[10px]">{c.role}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center justify-between border-b p-3">
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  <AvatarFallback>{active.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-semibold">{active.name}</div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {active.online && <span className="size-1.5 rounded-full bg-emerald-500" />}
                    {active.online ? "Online" : "Oxirgi: bugun"}
                    <span>·</span>
                    {active.role}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon"><Phone className="size-4" /></Button>
                <Button variant="ghost" size="icon"><MoreVertical className="size-4" /></Button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="flex flex-col gap-3">
                {activeMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm ${
                        m.from === "me"
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md bg-muted"
                      }`}
                    >
                      {m.attachment && (
                        <div
                          className={`mb-1.5 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs ${
                            m.from === "me" ? "bg-primary-foreground/15" : "bg-background"
                          }`}
                        >
                          <Paperclip className="size-3" />
                          {m.attachment}
                        </div>
                      )}
                      <div>{m.text}</div>
                      <div
                        className={`mt-1 text-[10px] ${
                          m.from === "me" ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}
                      >
                        {m.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center gap-2 border-t p-3">
              <Button variant="ghost" size="icon"><Paperclip className="size-4" /></Button>
              <Button variant="ghost" size="icon"><Smile className="size-4" /></Button>
              <Input placeholder="Xabar yozing..." className="flex-1" />
              <Button size="icon">
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
