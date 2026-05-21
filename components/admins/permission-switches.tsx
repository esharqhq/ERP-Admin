// components/admins/permission-switches.tsx
"use client";

import { Switch } from "@/components/ui/switch";
import { PERMISSION_GROUPS } from "@/lib/constants/permissions";

interface Props {
  selected: Set<string>;
  onChange: (updated: Set<string>) => void;
}

export function PermissionSwitches({ selected, onChange }: Props) {
  function toggle(name: string) {
    const next = new Set(selected);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-5">
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.id} className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {group.label}
          </p>
          <div className="flex flex-col gap-2 rounded-xl border border-border px-3 py-2">
            {group.permissions.map((perm) => (
              <div key={perm.name} className="flex items-center justify-between py-1">
                <span className="text-sm">{perm.label}</span>
                <Switch
                  checked={selected.has(perm.name)}
                  onCheckedChange={() => toggle(perm.name)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
