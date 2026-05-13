export type PropertyStatus = "Active" | "Pending Approval" | "Inactive"
export type PropertyType =
  | "Villa" | "Office" | "Hotel" | "Apartment"
  | "Townhouse" | "Business Ctr." | "Retail"

export type Property = {
  id: number
  name: string
  type: PropertyType
  address: string
  status: PropertyStatus
  ownerId: number
  ownerName: string
  area: number
  rooms?: number
  floor?: number
  totalFloors?: number
  yearBuilt?: number
  description?: string
}

export const properties: Property[] = [
  {
    id: 1,
    name: "Sunrise Villa",
    type: "Villa",
    address: "Mirzo Ulug'bek, Toshkent",
    status: "Active",
    ownerId: 1,
    ownerName: "Akbar Mirzayev",
    area: 320,
    rooms: 6,
    floor: 1,
    totalFloors: 2,
    yearBuilt: 2019,
    description: "Yashil hovlili ikki qavatli villa. Barcha kommunal xizmatlar ulangan.",
  },
  {
    id: 2,
    name: "GrandBuild Tower B",
    type: "Office",
    address: "Yunusobod, Toshkent",
    status: "Active",
    ownerId: 4,
    ownerName: "GrandBuild Corp",
    area: 1200,
    floor: 12,
    totalFloors: 20,
    yearBuilt: 2021,
    description: "Zamonaviy biznes-markaz. Ochiq makon, konferentsiya zallari.",
  },
  {
    id: 3,
    name: "Sunrise Hotel",
    type: "Hotel",
    address: "Chilonzor, Toshkent",
    status: "Pending Approval",
    ownerId: 2,
    ownerName: "Sunrise LLC",
    area: 2400,
    rooms: 48,
    totalFloors: 6,
    yearBuilt: 2020,
    description: "48 xonali mehmonxona. Restoran va basseyn mavjud.",
  },
  {
    id: 4,
    name: "Feruza Apartments",
    type: "Apartment",
    address: "Sergeli, Toshkent",
    status: "Pending Approval",
    ownerId: 3,
    ownerName: "Feruza Abdullayeva",
    area: 78,
    rooms: 3,
    floor: 5,
    totalFloors: 9,
    yearBuilt: 2018,
    description: "3 xonali kvartira. KYC tekshiruvi davom etmoqda.",
  },
  {
    id: 5,
    name: "Sardor Office Suite",
    type: "Office",
    address: "Mirobod, Toshkent",
    status: "Inactive",
    ownerId: 5,
    ownerName: "Sardor Xolmatov",
    area: 95,
    floor: 3,
    totalFloors: 5,
    yearBuilt: 2017,
    description: "Kichik ofis xonasi. Hozirda faol emas.",
  },
  {
    id: 6,
    name: "GrandBuild Plaza",
    type: "Business Ctr.",
    address: "Shayxontohur, Toshkent",
    status: "Active",
    ownerId: 4,
    ownerName: "GrandBuild Corp",
    area: 3800,
    totalFloors: 12,
    yearBuilt: 2022,
    description: "Shahar markazidagi yirik biznes-markaz. 40+ kompaniya ijarada.",
  },
]

export function getPropertyById(id: number): Property | undefined {
  return properties.find((p) => p.id === id)
}
