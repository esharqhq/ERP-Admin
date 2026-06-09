"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import {
  PROPERTY_TYPES,
  type PropertyDto,
  type PropertyType,
  type UpdatePropertyRequest,
} from "@/lib/types/property.types";

interface Props {
  open: boolean;
  onClose: () => void;
  property: PropertyDto;
  pending: boolean;
  /** Localized parent-mutation error. */
  error?: string | null;
  onSubmit: (body: UpdatePropertyRequest) => void;
}

const FLOOR_MIN = 0;
const FLOOR_MAX = 500;

function isType(v: string): v is PropertyType {
  return (PROPERTY_TYPES as string[]).includes(v);
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

  const [name, setName] = useState(property.name ?? "");
  const [address, setAddress] = useState(property.address ?? "");
  const [type, setType] = useState<PropertyType>(
    isType(property.type ?? "") ? (property.type as PropertyType) : "Other",
  );
  const [entryInstructions, setEntryInstructions] = useState(property.entryInstructions ?? "");
  const [lat, setLat] = useState(String(property.lat));
  const [long, setLong] = useState(String(property.long));
  const [floorCount, setFloorCount] = useState(String(property.floorCount));

  const latNum = Number(lat);
  const longNum = Number(long);
  const floorNum = Number(floorCount);

  const latValid = lat.trim() !== "" && Number.isFinite(latNum);
  const longValid = long.trim() !== "" && Number.isFinite(longNum);
  const floorValid =
    floorCount.trim() !== "" &&
    Number.isInteger(floorNum) &&
    floorNum >= FLOOR_MIN &&
    floorNum <= FLOOR_MAX;

  const canSubmit =
    name.trim().length > 0 &&
    address.trim().length > 0 &&
    entryInstructions.trim().length > 0 &&
    latValid &&
    longValid &&
    floorValid &&
    !pending;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      address: address.trim(),
      lat: latNum,
      long: longNum,
      type,
      entryInstructions: entryInstructions.trim(),
      floorCount: floorNum,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("edit.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
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

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t("form.type")}</label>
              <Select value={type} onValueChange={(v) => v && isType(v) && setType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((pt) => (
                    <SelectItem key={pt} value={pt}>
                      {t(`form.types.${pt}` as Parameters<typeof t>[0])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t("form.floorCount")}</label>
              <Input
                type="number"
                min={FLOOR_MIN}
                max={FLOOR_MAX}
                step={1}
                value={floorCount}
                onChange={(e) => setFloorCount(e.target.value)}
              />
              {floorCount.trim() !== "" && !floorValid ? (
                <p className="text-xs text-destructive">
                  {t("form.floorRange", { min: FLOOR_MIN, max: FLOOR_MAX })}
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t("form.lat")}</label>
              <Input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t("form.long")}</label>
              <Input
                type="number"
                step="any"
                value={long}
                onChange={(e) => setLong(e.target.value)}
              />
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
