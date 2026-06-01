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
    label: "Workers",
    permissions: [
      { name: "worker:list",         label: "View list" },
      { name: "worker:read",         label: "View details" },
      { name: "worker:approve",      label: "Approve" },
      { name: "worker:reject",       label: "Reject" },
      { name: "worker:soft_delete",  label: "Delete" },
      { name: "worker:doc:read_any", label: "View documents" },
    ],
  },
  {
    id: "owners",
    label: "Owners",
    permissions: [
      { name: "owner:list",        label: "View list" },
      { name: "owner:read",        label: "View details" },
      { name: "owner:soft_delete", label: "Delete" },
    ],
  },
  {
    id: "kyc",
    label: "KYC",
    permissions: [
      { name: "kyc:read",    label: "View list" },
      { name: "kyc:review",  label: "View details" },
      { name: "kyc:approve", label: "Approve" },
      { name: "kyc:reject",  label: "Reject" },
    ],
  },
  {
    id: "properties",
    label: "Properties",
    permissions: [
      { name: "property:list",    label: "View list" },
      { name: "property:restore", label: "Restore" },
    ],
  },
  {
    id: "tasks",
    label: "Tasks",
    permissions: [
      { name: "task_group:list_any",      label: "View groups" },
      { name: "task_group:read_any",      label: "Group details" },
      { name: "task_group:cancel_any",    label: "Cancel group" },
      { name: "task:list_any",            label: "View tasks" },
      { name: "task:read_any",            label: "Task details" },
      { name: "task:assign_worker_any",   label: "Assign worker" },
      { name: "task:media:read_any",      label: "View media" },
    ],
  },
  {
    id: "support",
    label: "Support",
    permissions: [
      { name: "support_ticket:list_any",        label: "View tickets" },
      { name: "support_ticket:read_any",        label: "Ticket details" },
      { name: "support_ticket:assign",          label: "Assign ticket" },
      { name: "support_ticket:resolve",         label: "Resolve ticket" },
      { name: "support_ticket:close",           label: "Close ticket" },
      { name: "conversation:read_any",          label: "View chats" },
      { name: "conversation:message:send_any",  label: "Send message" },
    ],
  },
  {
    id: "system",
    label: "System",
    permissions: [
      { name: "system:audit:read",      label: "View audit log" },
      { name: "system:settings:read",   label: "View settings" },
      { name: "system:settings:write",  label: "Edit settings" },
      { name: "admin:create",           label: "Create admin" },
      { name: "admin:list",             label: "View admins" },
      { name: "admin:read",             label: "Admin details" },
      { name: "admin:update",           label: "Edit admin" },
      { name: "admin:deactivate",       label: "Deactivate admin" },
      { name: "system:role:create",     label: "Create role" },
      { name: "system:role:update",     label: "Edit role" },
      { name: "profession:create",      label: "Create profession" },
      { name: "profession:update",      label: "Edit profession" },
      { name: "profession:delete",      label: "Delete profession" },
    ],
  },
];

export function getAllPermissionNames(): string[] {
  return PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.name));
}
