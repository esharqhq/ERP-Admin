"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/auth/can";
import { ConfirmDialog } from "@/components/tasks/confirm-dialog";
import { PropertyEditDialog } from "@/components/properties/property-edit-dialog";
import { useRouter } from "@/i18n/navigation";
import { useUpdateProperty, useSoftDeleteProperty } from "@/hooks/use-properties";
import { getApiErrorCode } from "@/lib/http/api-error";
import type { PropertyDto, UpdatePropertyRequest } from "@/lib/types/property.types";

/**
 * Edit + soft-delete actions for a property. Gated on `property:list`: no admin
 * role holds `property:update`/`property:soft_delete` (owner-scoped BOSS perms),
 * and admins are authorized purely via the controller's `Admin → property:list`
 * branch — so property:list is the correct, behaviour-faithful gate.
 */
export function PropertyActions({ property }: { property: PropertyDto }) {
  const t = useTranslations("properties");
  const router = useRouter();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const update = useUpdateProperty(property.id);
  const softDelete = useSoftDeleteProperty();

  function mapEditError(err: unknown): string {
    const code = getApiErrorCode(err);
    if (code === "property_not_found") return t("edit.errors.notFound");
    return t("edit.errors.generic");
  }

  function mapDeleteError(err: unknown): string {
    const code = getApiErrorCode(err);
    if (code === "property_not_found") return t("delete.errors.notFound");
    return t("delete.errors.generic");
  }

  function handleUpdate(body: UpdatePropertyRequest) {
    setEditError(null);
    update.mutate(body, {
      onSuccess: () => setEditOpen(false),
      onError: (err) => setEditError(mapEditError(err)),
    });
  }

  function handleDelete() {
    setDeleteError(null);
    softDelete.mutate(property.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        router.push("/dashboard/properties");
      },
      onError: (err) => setDeleteError(mapDeleteError(err)),
    });
  }

  return (
    <Can permission="property:list">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            setEditError(null);
            setEditOpen(true);
          }}
        >
          <Pencil className="size-4" />
          {t("edit.action")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-destructive hover:text-destructive"
          onClick={() => {
            setDeleteError(null);
            setDeleteOpen(true);
          }}
        >
          <Trash2 className="size-4" />
          {t("delete.action")}
        </Button>
      </div>

      {editOpen ? (
        <PropertyEditDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          property={property}
          pending={update.isPending}
          error={editError}
          onSubmit={handleUpdate}
        />
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        isPending={softDelete.isPending}
        title={t("delete.title")}
        description={t("delete.description", { name: property.name ?? "" })}
        confirmLabel={t("delete.confirm")}
        destructive
        error={deleteError}
      />
    </Can>
  );
}
