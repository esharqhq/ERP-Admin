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
  language: "en" | "de"
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
    name: "Albert Meyer",
    type: "Individual",
    properties: 3,
    risk: "Low",
    status: "Verified",
    email: "albert.meyer@mail.de",
    phone: "+49 170 1234567",
    address: "Kaiserstraße 24, Apt 18",
    city: "Berlin",
    country: "Germany",
    joinedAt: "2024-02-14",
    taxId: "302154789",
    language: "de",
    activeContracts: 3,
    totalRevenue: "84,500 EUR",
    pendingPayments: "0 EUR",
    satisfaction: 4.8,
    bio: "Individual owner of three private properties. All contract payments made on time.",
    tags: ["VIP", "On-time payer", "Long-term"],
    propertiesList: [
      { id: 1, name: "Sunrise Villa",       type: "Villa",     address: "Kaiserstraße, Berlin", status: "Active" },
      { id: 21, name: "Meyer Apartments",   type: "Apartment", address: "Schillerstraße, Berlin",      status: "Active" },
      { id: 22, name: "Meyer Townhouse", type: "Townhouse", address: "Goethestraße, Berlin",      status: "Active" },
    ],
    documents: [
      { id: 1, name: "Passport AA-1234567",   type: "Passport",     status: "Valid",    uploadedAt: "2024-02-14", expiresAt: "2030-02-14" },
      { id: 2, name: "Tax ID 302154789",      type: "Tax ID",       status: "Valid",    uploadedAt: "2024-02-14" },
      { id: 3, name: "Service Contract #19", type: "Contract",    status: "Valid",    uploadedAt: "2024-03-02", expiresAt: "2027-03-02" },
    ],
    activity: [
      { id: 1, kind: "payment",  title: "Payment received",      description: "12,500 EUR — Sunrise Villa",      date: "2026-05-08" },
      { id: 2, kind: "task",     title: "HVAC maintenance completed", description: "By John Schmidt",        date: "2026-05-02" },
      { id: 3, kind: "contract", title: "Contract renewed",       description: "Meyer Apartments — 1 year",       date: "2026-04-21" },
      { id: 4, kind: "document", title: "Passport copy updated", description: "New scan uploaded",              date: "2026-03-14" },
    ],
  },
  {
    id: 2,
    name: "Sunrise LLC",
    type: "Company",
    properties: 12,
    risk: "Medium",
    status: "Verified",
    email: "office@sunrise.de",
    phone: "+49 30 2345678",
    address: "Lindenallee 1A",
    city: "Berlin",
    country: "Germany",
    joinedAt: "2023-08-04",
    taxId: "204871923",
    contactPerson: "Dieter Schmidt",
    language: "de",
    activeContracts: 12,
    totalRevenue: "412,800 EUR",
    pendingPayments: "8,400 EUR",
    satisfaction: 4.4,
    bio: "Network of hotels and business centers. Manages 12 properties, mostly located in the city center.",
    tags: ["Enterprise", "Multi-property", "Hospitality"],
    propertiesList: [
      { id: 3,  name: "Sunrise Hotel",    type: "Hotel",       address: "Schillerstraße, Berlin",     status: "Pending Approval" },
      { id: 31, name: "Sunrise Plaza",    type: "Office",      address: "Rosenweg, Berlin",    status: "Active" },
      { id: 32, name: "Sunrise Suites",   type: "Apartment",   address: "Lilienstraße, Berlin",       status: "Active" },
      { id: 33, name: "Sunrise BC",       type: "Business Ctr.", address: "Goethestraße, Berlin",   status: "Active" },
    ],
    documents: [
      { id: 1, name: "State Registration 14829",  type: "Registration", status: "Valid",    uploadedAt: "2023-08-04" },
      { id: 2, name: "Tax ID 204871923",       type: "Tax ID",       status: "Valid",    uploadedAt: "2023-08-04" },
      { id: 3, name: "License HOT-2024",    type: "License",      status: "Expiring", uploadedAt: "2024-01-10", expiresAt: "2026-07-10" },
      { id: 4, name: "Master Agreement #45",     type: "Contract",     status: "Valid",    uploadedAt: "2023-09-12", expiresAt: "2026-09-12" },
    ],
    activity: [
      { id: 1, kind: "note",     title: "Risk level reassessed", description: "Low → Medium (new property added)", date: "2026-05-10" },
      { id: 2, kind: "payment",  title: "Payment delayed",          description: "8,400 EUR — Sunrise Plaza",            date: "2026-05-05" },
      { id: 3, kind: "contract", title: "New contract signed",       description: "Sunrise BC — 3 years",                 date: "2026-04-18" },
      { id: 4, kind: "task",     title: "Inspection completed",         description: "Sunrise Hotel — 8 issues found",       date: "2026-04-11" },
    ],
  },
  {
    id: 3,
    name: "Frieda Beck",
    type: "Individual",
    properties: 1,
    risk: "Low",
    status: "Pending",
    email: "frieda.b@gmail.com",
    phone: "+49 171 5551122",
    address: "Rosenstraße 12",
    city: "Berlin",
    country: "Germany",
    joinedAt: "2026-04-28",
    taxId: "—",
    language: "en",
    activeContracts: 0,
    totalRevenue: "0 EUR",
    pendingPayments: "0 EUR",
    satisfaction: 0,
    bio: "Newly registered owner. KYC verification in progress.",
    tags: ["New", "KYC pending"],
    propertiesList: [
      { id: 4, name: "Frieda Apartments", type: "Apartment", address: "Rosenweg, Berlin", status: "Pending Approval" },
    ],
    documents: [
      { id: 1, name: "Passport AB-9876543", type: "Passport", status: "Valid",   uploadedAt: "2026-04-28", expiresAt: "2031-05-02" },
      { id: 2, name: "Tax ID",              type: "Tax ID",   status: "Missing" },
    ],
    activity: [
      { id: 1, kind: "document", title: "KYC application submitted", description: "Passport and address confirmation",    date: "2026-04-28" },
    ],
  },
  {
    id: 4,
    name: "GrandBuild Corp",
    type: "Company",
    properties: 24,
    risk: "High",
    status: "Verified",
    email: "legal@grandbuild.de",
    phone: "+49 30 7778899",
    address: "Friedrichstraße 88",
    city: "Berlin",
    country: "Germany",
    joinedAt: "2022-11-30",
    taxId: "201338765",
    contactPerson: "Stefan Jung",
    language: "de",
    activeContracts: 24,
    totalRevenue: "1.24M EUR",
    pendingPayments: "42,600 EUR",
    satisfaction: 3.9,
    bio: "Large construction and investment company. Portfolio of 24 properties, but 5 complaints recorded in the last 3 months.",
    tags: ["Enterprise", "High volume", "Watchlist"],
    propertiesList: [
      { id: 2,  name: "GrandBuild Tower B", type: "Office",        address: "Goethestraße, Berlin",   status: "Active" },
      { id: 6,  name: "GrandBuild Plaza",   type: "Business Ctr.", address: "Lindenstraße, Berlin", status: "Active" },
      { id: 41, name: "GrandBuild Mall",    type: "Retail",        address: "Kaiserstraße, Berlin", status: "Active" },
      { id: 42, name: "GrandBuild Park",    type: "Apartment",     address: "Lindenstraße, Berlin",      status: "Inactive" },
    ],
    documents: [
      { id: 1, name: "State Registration 09122", type: "Registration", status: "Valid",    uploadedAt: "2022-11-30" },
      { id: 2, name: "Tax ID 201338765",      type: "Tax ID",       status: "Valid",    uploadedAt: "2022-11-30" },
      { id: 3, name: "Construction License",  type: "License",      status: "Expired",  uploadedAt: "2023-02-14", expiresAt: "2026-02-14" },
      { id: 4, name: "Master Agreement #12",    type: "Contract",     status: "Valid",    uploadedAt: "2022-12-15", expiresAt: "2027-12-15" },
    ],
    activity: [
      { id: 1, kind: "note",     title: "Added to watchlist",   description: "5 complaints in 3 months",                 date: "2026-05-09" },
      { id: 2, kind: "payment",  title: "Payment delayed",          description: "42,600 EUR — Tower B",                 date: "2026-05-01" },
      { id: 3, kind: "document", title: "License expired", description: "Construction license renewal required", date: "2026-02-14" },
      { id: 4, kind: "contract", title: "New contract",          description: "GrandBuild Park — reactivation", date: "2026-01-22" },
    ],
  },
  {
    id: 5,
    name: "Samuel Kohl",
    type: "Individual",
    properties: 2,
    risk: "Low",
    status: "Rejected",
    email: "samuel.k@inbox.de",
    phone: "+49 172 3332211",
    address: "Hauptstraße 56",
    city: "Munich",
    country: "Germany",
    joinedAt: "2025-09-12",
    taxId: "—",
    language: "en",
    activeContracts: 0,
    totalRevenue: "0 EUR",
    pendingPayments: "0 EUR",
    satisfaction: 0,
    bio: "Did not pass KYC verification — documents did not match. Can re-apply.",
    tags: ["Rejected", "Re-apply eligible"],
    propertiesList: [
      { id: 5,  name: "Samuel Office Suite", type: "Office",    address: "Lilienstraße, Berlin",       status: "Inactive" },
      { id: 51, name: "Kohl House",      type: "Apartment", address: "Maximilianstraße, Munich", status: "Inactive" },
    ],
    documents: [
      { id: 1, name: "Passport",  type: "Passport", status: "Expired", uploadedAt: "2025-09-12", expiresAt: "2026-01-08" },
      { id: 2, name: "Tax ID",    type: "Tax ID",   status: "Missing" },
    ],
    activity: [
      { id: 1, kind: "document", title: "KYC rejected", description: "Passport expired, Tax ID missing", date: "2025-09-20" },
      { id: 2, kind: "note",     title: "Properties deactivated", description: "Both properties set to inactive status", date: "2025-09-21" },
    ],
  },
]

export function getOwnerById(id: number): Owner | undefined {
  return owners.find((o) => o.id === id)
}
