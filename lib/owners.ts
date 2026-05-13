export type OwnerStatus = "Verified" | "Pending" | "Rejected"
export type OwnerRisk = "Low" | "Medium" | "High"
export type OwnerType = "Individual" | "Company"

export type OwnerProperty = {
  id: number
  name: string
  type: string
  address: string
  status: "Active" | "Pending Approval" | "Inactive"
}

export type OwnerDocument = {
  id: number
  name: string
  type: "Passport" | "Tax ID" | "Registration" | "License" | "Contract"
  status: "Valid" | "Expiring" | "Expired" | "Missing"
  uploadedAt?: string
  expiresAt?: string
}

export type OwnerActivity = {
  id: number
  title: string
  description: string
  date: string
  kind: "contract" | "payment" | "document" | "note" | "task"
}

export type Owner = {
  id: number
  name: string
  type: OwnerType
  properties: number
  risk: OwnerRisk
  status: OwnerStatus
  // detail-level fields
  email: string
  phone: string
  address: string
  city: string
  country: string
  joinedAt: string
  taxId: string
  contactPerson?: string
  language: "uz" | "ru" | "en"
  activeContracts: number
  totalRevenue: string
  pendingPayments: string
  satisfaction: number
  bio: string
  tags: string[]
  propertiesList: OwnerProperty[]
  documents: OwnerDocument[]
  activity: OwnerActivity[]
}

export const owners: Owner[] = [
  {
    id: 1,
    name: "Akbar Mirzayev",
    type: "Individual",
    properties: 3,
    risk: "Low",
    status: "Verified",
    email: "akbar.mirzayev@mail.uz",
    phone: "+998 90 123 45 67",
    address: "Amir Temur ko'chasi, 24-uy, 18-xonadon",
    city: "Toshkent",
    country: "O'zbekiston",
    joinedAt: "2024-02-14",
    taxId: "302154789",
    language: "uz",
    activeContracts: 3,
    totalRevenue: "84.5M so'm",
    pendingPayments: "0 so'm",
    satisfaction: 4.8,
    bio: "Uchta xususiy mulkka egalik qiluvchi yakka tartibdagi mulkdor. Barcha shartnomalar bo'yicha to'lovlar o'z vaqtida.",
    tags: ["VIP", "On-time payer", "Long-term"],
    propertiesList: [
      { id: 1, name: "Sunrise Villa",       type: "Villa",     address: "Mirzo Ulug'bek, Toshkent", status: "Active" },
      { id: 21, name: "Akbar Apartments",   type: "Apartment", address: "Yashnobod, Toshkent",      status: "Active" },
      { id: 22, name: "Mirzayev Townhouse", type: "Townhouse", address: "Yunusobod, Toshkent",      status: "Active" },
    ],
    documents: [
      { id: 1, name: "Passport AA-1234567",   type: "Passport",     status: "Valid",    uploadedAt: "2024-02-14", expiresAt: "2030-02-14" },
      { id: 2, name: "STIR 302154789",        type: "Tax ID",       status: "Valid",    uploadedAt: "2024-02-14" },
      { id: 3, name: "Xizmat shartnomasi #19", type: "Contract",    status: "Valid",    uploadedAt: "2024-03-02", expiresAt: "2027-03-02" },
    ],
    activity: [
      { id: 1, kind: "payment",  title: "To'lov qabul qilindi",      description: "12.5M so'm — Sunrise Villa",      date: "2026-05-08" },
      { id: 2, kind: "task",     title: "HVAC profilaktikasi tugadi", description: "Jasur Toshmatov tomonidan",        date: "2026-05-02" },
      { id: 3, kind: "contract", title: "Shartnoma yangilandi",       description: "Akbar Apartments — 1 yilga",       date: "2026-04-21" },
      { id: 4, kind: "document", title: "Pasport nusxasi yangilandi", description: "Yangi skan yuklandi",              date: "2026-03-14" },
    ],
  },
  {
    id: 2,
    name: "Sunrise LLC",
    type: "Company",
    properties: 12,
    risk: "Medium",
    status: "Verified",
    email: "office@sunrise.uz",
    phone: "+998 71 234 56 78",
    address: "Bunyodkor shoh ko'chasi, 1A",
    city: "Toshkent",
    country: "O'zbekiston",
    joinedAt: "2023-08-04",
    taxId: "204871923",
    contactPerson: "Dilshod Ismoilov",
    language: "ru",
    activeContracts: 12,
    totalRevenue: "412.8M so'm",
    pendingPayments: "8.4M so'm",
    satisfaction: 4.4,
    bio: "Mehmonxona va biznes-markazlar tarmog'i. 12 ta ob'ektni boshqaradi, asosan shahar markazida joylashgan.",
    tags: ["Enterprise", "Multi-property", "Hospitality"],
    propertiesList: [
      { id: 3,  name: "Sunrise Hotel",    type: "Hotel",       address: "Chilonzor, Toshkent",     status: "Pending Approval" },
      { id: 31, name: "Sunrise Plaza",    type: "Office",      address: "Yakkasaroy, Toshkent",    status: "Active" },
      { id: 32, name: "Sunrise Suites",   type: "Apartment",   address: "Mirobod, Toshkent",       status: "Active" },
      { id: 33, name: "Sunrise BC",       type: "Business Ctr.", address: "Yunusobod, Toshkent",   status: "Active" },
    ],
    documents: [
      { id: 1, name: "Davlat ro'yxati 14829",  type: "Registration", status: "Valid",    uploadedAt: "2023-08-04" },
      { id: 2, name: "STIR 204871923",         type: "Tax ID",       status: "Valid",    uploadedAt: "2023-08-04" },
      { id: 3, name: "Litsenziya HOT-2024",    type: "License",      status: "Expiring", uploadedAt: "2024-01-10", expiresAt: "2026-07-10" },
      { id: 4, name: "Bosh shartnoma #45",     type: "Contract",     status: "Valid",    uploadedAt: "2023-09-12", expiresAt: "2026-09-12" },
    ],
    activity: [
      { id: 1, kind: "note",     title: "Risk darajasi qayta baholandi", description: "Low → Medium (yangi mulk qo'shildi)", date: "2026-05-10" },
      { id: 2, kind: "payment",  title: "To'lov kechiktirildi",          description: "8.4M so'm — Sunrise Plaza",            date: "2026-05-05" },
      { id: 3, kind: "contract", title: "Yangi shartnoma tuzildi",       description: "Sunrise BC — 3 yilga",                 date: "2026-04-18" },
      { id: 4, kind: "task",     title: "Inspeksiya o'tkazildi",         description: "Sunrise Hotel — 8 ta kamchilik",       date: "2026-04-11" },
    ],
  },
  {
    id: 3,
    name: "Feruza Abdullayeva",
    type: "Individual",
    properties: 1,
    risk: "Low",
    status: "Pending",
    email: "feruza.a@gmail.com",
    phone: "+998 93 555 11 22",
    address: "Buyuk Ipak Yo'li, 12-uy",
    city: "Toshkent",
    country: "O'zbekiston",
    joinedAt: "2026-04-28",
    taxId: "—",
    language: "uz",
    activeContracts: 0,
    totalRevenue: "0 so'm",
    pendingPayments: "0 so'm",
    satisfaction: 0,
    bio: "Yangi ro'yxatga olingan mulkdor. KYC tekshiruvi davom etmoqda.",
    tags: ["New", "KYC pending"],
    propertiesList: [
      { id: 4, name: "Feruza Apartments", type: "Apartment", address: "Sergeli, Toshkent", status: "Pending Approval" },
    ],
    documents: [
      { id: 1, name: "Passport AB-9876543", type: "Passport", status: "Valid",   uploadedAt: "2026-04-28", expiresAt: "2031-05-02" },
      { id: 2, name: "STIR",                type: "Tax ID",   status: "Missing" },
    ],
    activity: [
      { id: 1, kind: "document", title: "KYC arizasi yuborildi", description: "Pasport va manzil tasdig'i",    date: "2026-04-28" },
    ],
  },
  {
    id: 4,
    name: "GrandBuild Corp",
    type: "Company",
    properties: 24,
    risk: "High",
    status: "Verified",
    email: "legal@grandbuild.uz",
    phone: "+998 71 777 88 99",
    address: "Mustaqillik shoh ko'chasi, 88",
    city: "Toshkent",
    country: "O'zbekiston",
    joinedAt: "2022-11-30",
    taxId: "201338765",
    contactPerson: "Sherzod Yo'ldoshev",
    language: "ru",
    activeContracts: 24,
    totalRevenue: "1.24B so'm",
    pendingPayments: "42.6M so'm",
    satisfaction: 3.9,
    bio: "Yirik qurilish-investitsiya kompaniyasi. 24 ta ob'ekt portfeli, lekin so'nggi 3 oyda 5 ta shikoyat qayd etilgan.",
    tags: ["Enterprise", "High volume", "Watchlist"],
    propertiesList: [
      { id: 2,  name: "GrandBuild Tower B", type: "Office",        address: "Yunusobod, Toshkent",   status: "Active" },
      { id: 6,  name: "GrandBuild Plaza",   type: "Business Ctr.", address: "Shayxontohur, Toshkent", status: "Active" },
      { id: 41, name: "GrandBuild Mall",    type: "Retail",        address: "Mirzo Ulug'bek, Toshkent", status: "Active" },
      { id: 42, name: "GrandBuild Park",    type: "Apartment",     address: "Olmazor, Toshkent",      status: "Inactive" },
    ],
    documents: [
      { id: 1, name: "Davlat ro'yxati 09122", type: "Registration", status: "Valid",    uploadedAt: "2022-11-30" },
      { id: 2, name: "STIR 201338765",        type: "Tax ID",       status: "Valid",    uploadedAt: "2022-11-30" },
      { id: 3, name: "Qurilish litsenziyasi",  type: "License",      status: "Expired",  uploadedAt: "2023-02-14", expiresAt: "2026-02-14" },
      { id: 4, name: "Bosh shartnoma #12",    type: "Contract",     status: "Valid",    uploadedAt: "2022-12-15", expiresAt: "2027-12-15" },
    ],
    activity: [
      { id: 1, kind: "note",     title: "Watchlist'ga qo'shildi",   description: "3 oyda 5 ta shikoyat",                 date: "2026-05-09" },
      { id: 2, kind: "payment",  title: "To'lov kechikdi",          description: "42.6M so'm — Tower B",                 date: "2026-05-01" },
      { id: 3, kind: "document", title: "Litsenziya muddati tugadi", description: "Qurilish litsenziyasini yangilash kerak", date: "2026-02-14" },
      { id: 4, kind: "contract", title: "Yangi shartnoma",          description: "GrandBuild Park — qayta faollashtirish", date: "2026-01-22" },
    ],
  },
  {
    id: 5,
    name: "Sardor Xolmatov",
    type: "Individual",
    properties: 2,
    risk: "Low",
    status: "Rejected",
    email: "sardor.x@inbox.uz",
    phone: "+998 99 333 22 11",
    address: "Navoiy ko'chasi, 56-uy",
    city: "Samarqand",
    country: "O'zbekiston",
    joinedAt: "2025-09-12",
    taxId: "—",
    language: "uz",
    activeContracts: 0,
    totalRevenue: "0 so'm",
    pendingPayments: "0 so'm",
    satisfaction: 0,
    bio: "KYC tekshiruvidan o'tmadi — hujjatlar mos kelmadi. Qayta ariza yuborishi mumkin.",
    tags: ["Rejected", "Re-apply eligible"],
    propertiesList: [
      { id: 5,  name: "Sardor Office Suite", type: "Office",    address: "Mirobod, Toshkent",       status: "Inactive" },
      { id: 51, name: "Xolmatov House",      type: "Apartment", address: "Registon ko'chasi, Samarqand", status: "Inactive" },
    ],
    documents: [
      { id: 1, name: "Passport",  type: "Passport", status: "Expired", uploadedAt: "2025-09-12", expiresAt: "2026-01-08" },
      { id: 2, name: "STIR",      type: "Tax ID",   status: "Missing" },
    ],
    activity: [
      { id: 1, kind: "document", title: "KYC rad etildi", description: "Pasport muddati tugagan, STIR yo'q", date: "2025-09-20" },
      { id: 2, kind: "note",     title: "Mulklar deaktiv qilindi", description: "Ikkala mulk inactive holatga o'tkazildi", date: "2025-09-21" },
    ],
  },
]

export function getOwnerById(id: number): Owner | undefined {
  return owners.find((o) => o.id === id)
}
