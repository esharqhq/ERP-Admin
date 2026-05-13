// lib/workers.ts

export type WorkerRole = "Senior" | "Professional" | "Junior"
export type WorkerStatus = "Verified" | "Pending" | "Expired" | "Rejected"

export type WorkerAssignment = {
  id: number
  title: string
  location: string
  date: string
  status: "Active" | "Upcoming" | "Done"
}

export type WorkerActivity = {
  id: number
  kind: "task" | "document" | "payment" | "note"
  title: string
  description: string
  date: string
}

export type Worker = {
  id: number
  name: string
  role: WorkerRole
  status: WorkerStatus
  tasks: number
  rating: number
  // detail-level
  completedTasks: number
  email: string
  phone: string
  address: string
  city: string
  joinedAt: string
  bio: string
  tags: string[]
  assignments: WorkerAssignment[]
  activity: WorkerActivity[]
}

export const workers: Worker[] = [
  {
    id: 1,
    name: "Jasur Toshmatov",
    role: "Senior",
    status: "Verified",
    tasks: 12,
    rating: 4.8,
    completedTasks: 147,
    email: "jasur.t@esharq.com",
    phone: "+998 90 111 22 33",
    address: "Amir Temur ko'chasi, 18-uy",
    city: "Toshkent",
    joinedAt: "2023-03-15",
    bio: "5 yillik tajribaga ega montaj mutaxassisi. HVAC va elektr tizimlari bo'yicha sertifikatlangan.",
    tags: ["HVAC", "Elektr", "VIP ishchi"],
    assignments: [
      { id: 1, title: "Yunusobod – topshirish",   location: "Yunusobod, Toshkent",     date: "2026-05-13", status: "Active" },
      { id: 2, title: "Yashnobod – montaj",        location: "Yashnobod, Toshkent",     date: "2026-05-16", status: "Upcoming" },
      { id: 3, title: "Shayxontohur – montaj",     location: "Shayxontohur, Toshkent",  date: "2026-05-21", status: "Upcoming" },
    ],
    activity: [
      { id: 1, kind: "task",     title: "Vazifa yakunlandi",       description: "Yashnobod – montaj muvaffaqiyatli",  date: "2026-05-10" },
      { id: 2, kind: "payment",  title: "Ish haqi to'landi",       description: "3.2M so'm — aprel oyi",              date: "2026-05-05" },
      { id: 3, kind: "document", title: "Sertifikat yangilandi",   description: "HVAC sertifikati 2028-yilgacha",     date: "2026-04-20" },
      { id: 4, kind: "note",     title: "Baholash o'tkazildi",     description: "Reyting 4.7 → 4.8",                 date: "2026-04-01" },
    ],
  },
  {
    id: 2,
    name: "Dilnoza Yusupova",
    role: "Professional",
    status: "Verified",
    tasks: 8,
    rating: 4.5,
    completedTasks: 89,
    email: "dilnoza.y@esharq.com",
    phone: "+998 93 222 33 44",
    address: "Navoiy ko'chasi, 7-uy",
    city: "Toshkent",
    joinedAt: "2023-09-01",
    bio: "Ta'mir va bezatish ishlari bo'yicha mutaxassis. Sifat nazorati guruhining a'zosi.",
    tags: ["Ta'mir", "Dizayn", "QC"],
    assignments: [
      { id: 1, title: "Mirzo Ulugbek – ta'mir",   location: "Mirzo Ulug'bek, Toshkent", date: "2026-05-14", status: "Active" },
      { id: 2, title: "Bektemir – ta'mir",         location: "Bektemir, Toshkent",       date: "2026-05-17", status: "Upcoming" },
    ],
    activity: [
      { id: 1, kind: "task",    title: "Vazifa yakunlandi",     description: "Mirzo Ulugbek – ta'mir",            date: "2026-05-12" },
      { id: 2, kind: "payment", title: "Ish haqi to'landi",     description: "2.8M so'm — aprel oyi",            date: "2026-05-05" },
      { id: 3, kind: "note",    title: "Sifat bahosi",          description: "Mijoz 5/5 baho berdi",             date: "2026-04-28" },
    ],
  },
  {
    id: 3,
    name: "Bobur Karimov",
    role: "Junior",
    status: "Pending",
    tasks: 3,
    rating: 3.9,
    completedTasks: 14,
    email: "bobur.k@esharq.com",
    phone: "+998 99 333 44 55",
    address: "Chilonzor, 12-mavze",
    city: "Toshkent",
    joinedAt: "2025-11-10",
    bio: "Yangi xodim. Hujjatlar tekshiruvi davom etmoqda. Yetkazib berish va kichik ta'mir ishlari.",
    tags: ["Yangi", "KYC jarayonida"],
    assignments: [
      { id: 1, title: "Sergeli – yetkazish",  location: "Sergeli, Toshkent",  date: "2026-05-14", status: "Active" },
      { id: 2, title: "Uchtepa – yetkazish",  location: "Uchtepa, Toshkent",  date: "2026-05-23", status: "Upcoming" },
    ],
    activity: [
      { id: 1, kind: "document", title: "Ariza yuborildi",        description: "Pasport va mehnat daftarchasi",  date: "2025-11-10" },
      { id: 2, kind: "task",     title: "Birinchi vazifa",        description: "Sergeli – yetkazish topshirildi", date: "2026-05-01" },
    ],
  },
  {
    id: 4,
    name: "Malika Saidova",
    role: "Professional",
    status: "Verified",
    tasks: 10,
    rating: 4.7,
    completedTasks: 103,
    email: "malika.s@esharq.com",
    phone: "+998 91 444 55 66",
    address: "Yunusobod, 17-mavze",
    city: "Toshkent",
    joinedAt: "2023-06-20",
    bio: "Inspeksiya va diagnostika mutaxassisi. Har oyda 10+ ob'ektni tekshiradi.",
    tags: ["Inspeksiya", "Diagnostika"],
    assignments: [
      { id: 1, title: "Chilonzor – inspeksiya",  location: "Chilonzor, Toshkent",  date: "2026-05-13", status: "Active" },
      { id: 2, title: "Mirobod – topshirish",    location: "Mirobod, Toshkent",    date: "2026-05-26", status: "Upcoming" },
      { id: 3, title: "Sergeli – inspeksiya",    location: "Sergeli, Toshkent",    date: "2026-05-29", status: "Upcoming" },
    ],
    activity: [
      { id: 1, kind: "task",    title: "Inspeksiya yakunlandi",  description: "Chilonzor – 0 ta kamchilik",   date: "2026-05-12" },
      { id: 2, kind: "payment", title: "Ish haqi to'landi",      description: "3.0M so'm — aprel oyi",        date: "2026-05-05" },
      { id: 3, kind: "note",    title: "Eng yaxshi xodim",       description: "Aprel oyi laureati",           date: "2026-05-02" },
    ],
  },
  {
    id: 5,
    name: "Otabek Nazarov",
    role: "Senior",
    status: "Expired",
    tasks: 0,
    rating: 4.2,
    completedTasks: 78,
    email: "otabek.n@esharq.com",
    phone: "+998 97 555 66 77",
    address: "Olmazor, 5-mavze",
    city: "Toshkent",
    joinedAt: "2022-08-05",
    bio: "Tajribali montajchi. Hujjat muddati tugaganligi sababli hozirda faol emas.",
    tags: ["Senior", "Hujjat kutilmoqda"],
    assignments: [],
    activity: [
      { id: 1, kind: "document", title: "Sertifikat muddati tugadi",  description: "Yangilash talab qilinadi",         date: "2026-04-30" },
      { id: 2, kind: "task",     title: "So'nggi vazifa",             description: "Olmazor – diagnostika",            date: "2026-04-15" },
    ],
  },
  {
    id: 6,
    name: "Zulfiya Rakhimova",
    role: "Junior",
    status: "Rejected",
    tasks: 0,
    rating: 3.1,
    completedTasks: 5,
    email: "zulfiya.r@esharq.com",
    phone: "+998 90 666 77 88",
    address: "Yakkasaroy, 3-mavze",
    city: "Toshkent",
    joinedAt: "2025-08-20",
    bio: "KYC tekshiruvidan o'tmadi. Qayta ariza yuborishi mumkin.",
    tags: ["Rad etilgan", "Qayta ariza"],
    assignments: [],
    activity: [
      { id: 1, kind: "document", title: "KYC rad etildi",           description: "Hujjatlar mos kelmadi",   date: "2025-09-01" },
    ],
  },
]

export function getWorkerById(id: number): Worker | undefined {
  return workers.find((w) => w.id === id)
}
