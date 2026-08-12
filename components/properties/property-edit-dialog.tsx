"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePropertyCategories } from "@/hooks/use-lookups";
import { LocationPicker } from "@/components/properties/location-picker";
import { categoryName } from "@/lib/properties/table-rows";
import {
  AREA_MAX,
  FLOOR_MAX,
  ROOM_MAX,
  parseOptionalNumber,
} from "@/lib/properties/form-fields";
import type { PropertyDto, UpdatePropertyRequest } from "@/lib/types/property.types";

interface Props {
  open: boolean;
  onClose: () => void;
  property: PropertyDto;
  pending: boolean;
  /** Localized parent-mutation error. */
  error?: string | null;
  onSubmit: (body: UpdatePropertyRequest) => void;
}

export function PropertyEditDialog({
  open,
  onClose,
  property,
  pending,
  error,
  onSubmit,
}: Props) {
  const t = useTranslations("properties");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const { data: categories = [], isLoading: categoriesLoading } = usePropertyCategories();

  const [name, setName] = useState(property.name);
  const [address, setAddress] = useState(property.address);
  const [categoryId, setCategoryId] = useState(property.category.id);
  const [entryInstructions, setEntryInstructions] = useState(property.entryInstructions);
  // Unlike create, this always starts with a point — an existing property
  // cannot lack coordinates — so the picker opens focused on it.
  const [location, setLocation] = useState<{ lat: number; long: number } | null>({
    lat: property.lat,
    long: property.long,
  });
  const [floorCount, setFloorCount] = useState(property.floorCount?.toString() ?? "");
  const [roomCount, setRoomCount] = useState(property.roomCount?.toString() ?? "");
  const [areaSqm, setAreaSqm] = useState(property.areaSqm?.toString() ?? "");

  // The list is active-only, and a deactivated category is never retroactively
  // enforced — the backend validates a category only when it *changes*. So a
  // property legitimately sitting on a deactivated category must keep it as a
  // selectable option, or this form would silently force a change on save.
  const options = categories.some((c) => c.id === property.category.id)
    ? categories.map((c) => ({ value: c.id, label: categoryName(c, locale) }))
    : [
        { value: property.category.id, label: categoryName(property.category, locale) },
        ...categories.map((c) => ({ value: c.id, label: categoryName(c, locale) })),
      ];

  const floor = parseOptionalNumber(floorCount, { max: FLOOR_MAX, integer: true });
  const room = parseOptionalNumber(roomCount, { max: ROOM_MAX, integer: true });
  const area = parseOptionalNumber(areaSqm, { max: AREA_MAX, integer: false });

  const canSubmit =
    name.trim().length > 0 &&
    address.trim().length > 0 &&
    entryInstructions.trim().length > 0 &&
    categoryId !== "" &&
    location !== null &&
    floor.ok &&
    room.ok &&
    area.ok &&
    !pending;

  function handleSubmit() {
    if (!canSubmit || !location) return;
    onSubmit({
      name: name.trim(),
      address: address.trim(),
      lat: location.lat,
      long: location.long,
      propertyCategoryId: categoryId,
      entryInstructions: entryInstructions.trim(),
      floorCount: floor.value,
      roomCount: room.value,
      areaSqm: area.value,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !pending && onClose()}>
      {/* Same frame as the create dialog — both carry a map and the same fields,
          so they should not be two different sizes. */}
      <DialogContent className="sm:max-w-[682px]">
        <DialogHeader>
          <DialogTitle>{t("edit.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t("form.name")}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("form.namePlaceholder")}
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t("form.address")}</label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("form.addressPlaceholder")}
              maxLength={500}
            />
          </div>

          <LocationPicker
            value={location}
            onChange={(lat, long) => setLocation({ lat, long })}
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t("form.category")}</label>
            {/* `items` is load-bearing, not decoration: without it <SelectValue>
                cannot resolve the selected id to its label and the trigger
                renders the raw category UUID. */}
            <Select
              value={categoryId}
              onValueChange={(v) => v && setCategoryId(v as string)}
              items={options}
              disabled={categoriesLoading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("form.categoryPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {options.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t("form.floorCount")}</label>
              <Input
                type="number"
                min={0}
                max={FLOOR_MAX}
                step={1}
                value={floorCount}
                onChange={(e) => setFloorCount(e.target.value)}
                placeholder={t("form.optional")}
              />
              {!floor.ok ? (
                <p className="text-xs text-destructive">
                  {t("form.range", { min: 0, max: FLOOR_MAX })}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t("form.roomCount")}</label>
              <Input
                type="number"
                min={0}
                max={ROOM_MAX}
                step={1}
                value={roomCount}
                onChange={(e) => setRoomCount(e.target.value)}
                placeholder={t("form.optional")}
              />
              {!room.ok ? (
                <p className="text-xs text-destructive">
                  {t("form.range", { min: 0, max: ROOM_MAX })}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t("form.areaSqm")}</label>
              <Input
                type="number"
                min={0}
                max={AREA_MAX}
                step="any"
                value={areaSqm}
                onChange={(e) => setAreaSqm(e.target.value)}
                placeholder={t("form.optional")}
              />
              {!area.ok ? (
                <p className="text-xs text-destructive">
                  {t("form.range", { min: 0, max: AREA_MAX })}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t("form.entryInstructions")}</label>
            <textarea
              value={entryInstructions}
              onChange={(e) => setEntryInstructions(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder={t("form.entryInstructionsPlaceholder")}
              className="resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {tCommon("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
