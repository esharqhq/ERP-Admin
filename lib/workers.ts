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
    name: "John Schmidt",
    role: "Senior",
    status: "Verified",
    tasks: 12,
    rating: 4.8,
    completedTasks: 147,
    email: "john.s@esharq.com",
    phone: "+49 170 1112233",
    address: "Kaiserstraße 18",
    city: "Berlin",
    joinedAt: "2023-03-15",
    bio: "Installation specialist with 5 years of experience. Certified in HVAC and electrical systems.",
    tags: ["HVAC", "Electrical", "VIP Worker"],
    assignments: [
      { id: 1, title: "Goethestraße – handover",   location: "Goethestraße, Berlin",     date: "2026-05-13", status: "Active" },
      { id: 2, title: "Schillerstraße – installation",        location: "Schillerstraße, Berlin",     date: "2026-05-16", status: "Upcoming" },
      { id: 3, title: "Lindenstraße – installation",     location: "Lindenstraße, Berlin",  date: "2026-05-21", status: "Upcoming" },
    ],
    activity: [
      { id: 1, kind: "task",     title: "Task completed",       description: "Schillerstraße – installation successful",  date: "2026-05-10" },
      { id: 2, kind: "payment",  title: "Salary paid",       description: "3,200 EUR — April",              date: "2026-05-05" },
      { id: 3, kind: "document", title: "Certificate renewed",   description: "HVAC certificate valid until 2028",     date: "2026-04-20" },
      { id: 4, kind: "note",     title: "Performance review",     description: "Rating 4.7 → 4.8",                 date: "2026-04-01" },
    ],
  },
  {
    id: 2,
    name: "Sarah Werner",
    role: "Professional",
    status: "Verified",
    tasks: 8,
    rating: 4.5,
    completedTasks: 89,
    email: "sarah.w@esharq.com",
    phone: "+49 171 2223344",
    address: "Hauptstraße 7",
    city: "Berlin",
    joinedAt: "2023-09-01",
    bio: "Specialist in repair and finishing works. Member of the quality control team.",
    tags: ["Repair", "Design", "QC"],
    assignments: [
      { id: 1, title: "Kaiserstraße – repair",   location: "Kaiserstraße, Berlin", date: "2026-05-14", status: "Active" },
      { id: 2, title: "Hauptstraße – repair",         location: "Hauptstraße, Berlin",       date: "2026-05-17", status: "Upcoming" },
    ],
    activity: [
      { id: 1, kind: "task",    title: "Task completed",     description: "Kaiserstraße – repair",            date: "2026-05-12" },
      { id: 2, kind: "payment", title: "Salary paid",     description: "2,800 EUR — April",            date: "2026-05-05" },
      { id: 3, kind: "note",    title: "Quality rating",          description: "Client gave 5/5 rating",             date: "2026-04-28" },
    ],
  },
  {
    id: 3,
    name: "Michael Kaiser",
    role: "Junior",
    status: "Pending",
    tasks: 3,
    rating: 3.9,
    completedTasks: 14,
    email: "michael.k@esharq.com",
    phone: "+49 172 3334455",
    address: "Schillerstraße 12",
    city: "Berlin",
    joinedAt: "2025-11-10",
    bio: "New employee. Document verification in progress. Delivery and minor repair tasks.",
    tags: ["New", "KYC In Progress"],
    assignments: [
      { id: 1, title: "Rosenweg – delivery",  location: "Rosenweg, Berlin",  date: "2026-05-14", status: "Active" },
      { id: 2, title: "Eichenweg – delivery",  location: "Eichenweg, Berlin",  date: "2026-05-23", status: "Upcoming" },
    ],
    activity: [
      { id: 1, kind: "document", title: "Application submitted",        description: "Passport and employment record",  date: "2025-11-10" },
      { id: 2, kind: "task",     title: "First task",        description: "Rosenweg – delivery assigned", date: "2026-05-01" },
    ],
  },
  {
    id: 4,
    name: "Emma Schulz",
    role: "Professional",
    status: "Verified",
    tasks: 10,
    rating: 4.7,
    completedTasks: 103,
    email: "emma.s@esharq.com",
    phone: "+49 173 4445566",
    address: "Goethestraße 17",
    city: "Berlin",
    joinedAt: "2023-06-20",
    bio: "Inspection and diagnostics specialist. Reviews 10+ properties per month.",
    tags: ["Inspection", "Diagnostics"],
    assignments: [
      { id: 1, title: "Schillerstraße – inspection",  location: "Schillerstraße, Berlin",  date: "2026-05-13", status: "Active" },
      { id: 2, title: "Lilienstraße – handover",    location: "Lilienstraße, Berlin",    date: "2026-05-26", status: "Upcoming" },
      { id: 3, title: "Rosenweg – inspection",    location: "Rosenweg, Berlin",    date: "2026-05-29", status: "Upcoming" },
    ],
    activity: [
      { id: 1, kind: "task",    title: "Inspection completed",  description: "Schillerstraße – 0 issues found",   date: "2026-05-12" },
      { id: 2, kind: "payment", title: "Salary paid",      description: "3,000 EUR — April",        date: "2026-05-05" },
      { id: 3, kind: "note",    title: "Best employee",       description: "April laureate",           date: "2026-05-02" },
    ],
  },
  {
    id: 5,
    name: "David Fischer",
    role: "Senior",
    status: "Expired",
    tasks: 0,
    rating: 4.2,
    completedTasks: 78,
    email: "david.f@esharq.com",
    phone: "+49 174 5556677",
    address: "Lindenstraße 5",
    city: "Berlin",
    joinedAt: "2022-08-05",
    bio: "Experienced installation technician. Currently inactive due to expired documents.",
    tags: ["Senior", "Pending Documents"],
    assignments: [],
    activity: [
      { id: 1, kind: "document", title: "Certificate expired",  description: "Renewal required",         date: "2026-04-30" },
      { id: 2, kind: "task",     title: "Last task",             description: "Lindenstraße – diagnostics",            date: "2026-04-15" },
    ],
  },
  {
    id: 6,
    name: "Anna Wagner",
    role: "Junior",
    status: "Rejected",
    tasks: 0,
    rating: 3.1,
    completedTasks: 5,
    email: "anna.w@esharq.com",
    phone: "+49 175 6667788",
    address: "Rosenweg 3",
    city: "Berlin",
    joinedAt: "2025-08-20",
    bio: "Did not pass KYC verification. Can re-apply.",
    tags: ["Rejected", "Re-apply"],
    assignments: [],
    activity: [
      { id: 1, kind: "document", title: "KYC rejected",           description: "Documents did not match",   date: "2025-09-01" },
    ],
  },
]

export function getWorkerById(id: number): Worker | undefined {
  return workers.find((w) => w.id === id)
}
