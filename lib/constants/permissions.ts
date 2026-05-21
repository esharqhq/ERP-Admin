// lib/constants/permissions.ts

export interface PermissionItem {
  name: string;
  label: string;
}

export interface PermissionGroup {
  id: string;
  label: string;
  permissions: PermissionItem[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: "workers",
    label: "Ishchilar",
    permissions: [
      { name: "worker:list",         label: "Ro'yxatni ko'rish" },
      { name: "worker:read",         label: "Batafsil ko'rish" },
      { name: "worker:approve",      label: "Tasdiqlash" },
      { name: "worker:reject",       label: "Rad etish" },
      { name: "worker:soft_delete",  label: "O'chirish" },
      { name: "worker:doc:read_any", label: "Hujjatlarni ko'rish" },
    ],
  },
  {
    id: "owners",
    label: "Mulkdorlar",
    permissions: [
      { name: "owner:list",        label: "Ro'yxatni ko'rish" },
      { name: "owner:read",        label: "Batafsil ko'rish" },
      { name: "owner:soft_delete", label: "O'chirish" },
    ],
  },
  {
    id: "kyc",
    label: "KYC",
    permissions: [
      { name: "kyc:read",    label: "Ko'rish" },
      { name: "kyc:review",  label: "Ko'rib chiqish" },
      { name: "kyc:approve", label: "Tasdiqlash" },
      { name: "kyc:reject",  label: "Rad etish" },
    ],
  },
  {
    id: "properties",
    label: "Mulklar",
    permissions: [
      { name: "property:list",    label: "Ro'yxatni ko'rish" },
      { name: "property:restore", label: "Tiklash" },
    ],
  },
  {
    id: "tasks",
    label: "Vazifalar",
    permissions: [
      { name: "task_group:list_any",      label: "Guruhlarni ko'rish" },
      { name: "task_group:read_any",      label: "Guruh batafsil" },
      { name: "task_group:cancel_any",    label: "Guruhni bekor qilish" },
      { name: "task:list_any",            label: "Vazifalarni ko'rish" },
      { name: "task:read_any",            label: "Vazifa batafsil" },
      { name: "task:assign_worker_any",   label: "Ishchi tayinlash" },
      { name: "task:media:read_any",      label: "Media ko'rish" },
    ],
  },
  {
    id: "support",
    label: "Qo'llab-quvvatlash",
    permissions: [
      { name: "support_ticket:list_any",        label: "Tiketlarni ko'rish" },
      { name: "support_ticket:read_any",        label: "Tiket batafsil" },
      { name: "support_ticket:assign",          label: "Tiket tayinlash" },
      { name: "support_ticket:resolve",         label: "Tiketni yechish" },
      { name: "support_ticket:close",           label: "Tiketni yopish" },
      { name: "conversation:read_any",          label: "Chatlarni ko'rish" },
      { name: "conversation:message:send_any",  label: "Xabar yuborish" },
    ],
  },
  {
    id: "system",
    label: "Tizim",
    permissions: [
      { name: "system:audit:read",      label: "Audit logni ko'rish" },
      { name: "system:settings:read",   label: "Sozlamalarni ko'rish" },
      { name: "system:settings:write",  label: "Sozlamalarni o'zgartirish" },
      { name: "admin:create",           label: "Admin yaratish" },
      { name: "admin:list",             label: "Adminlarni ko'rish" },
      { name: "admin:read",             label: "Admin batafsil" },
      { name: "admin:update",           label: "Admin ma'lumotlarini tahrirlash" },
      { name: "admin:deactivate",       label: "Adminni deactivate qilish" },
      { name: "system:role:create",     label: "Rol yaratish" },
      { name: "system:role:update",     label: "Rolni tahrirlash" },
      { name: "profession:create",      label: "Kasb yaratish" },
      { name: "profession:update",      label: "Kasbni tahrirlash" },
      { name: "profession:delete",      label: "Kasbni o'chirish" },
    ],
  },
];

export function getAllPermissionNames(): string[] {
  return PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.name));
}
