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
import { useOwnerList } from "@/hooks/use-owners";
import {
  PROPERTY_TYPES,
  type PropertyType,
  type CreateAdminPropertyRequest,
} from "@/lib/types/property.types";

interface Props {
  open: boolean;
  onClose: () => void;
  pending: boolean;
  /** Localized parent-mutation error. */
  error?: string | null;
  onSubmit: (body: CreateAdminPropertyRequest) => void;
}

const FLOOR_MIN = 0;
const FLOOR_MAX = 500;

function isType(v: string): v is PropertyType {
  return (PROPERTY_TYPES as string[]).includes(v);
}

export function PropertyCreateDialog({ open, onClose, pending, error, onSubmit }: Props) {
  const t = useTranslations("properties");
  const tCommon = useTranslations("common");

  // KYC-profile owners are the BOSS owners. Creating a property for an owner
  // whose contract isn't covering today is refused by the server's live ACTIVE
  // gate (403), so only offer owners who are `Active` — `Approved` (no contract
  // authored yet) and `Contract` (sent, not yet InForce) would foreseeably 403.
  // `Active` is the stored projection and can lag real cover by up to an hour;
  // the 403 handler below remains the real guard for that edge.
  const { data: ownerRows = [], isLoading: ownersLoading } = useOwnerList();
  // `items` lets <SelectValue> render the owner's NAME in the trigger instead of the raw id.
  const ownerItems = ownerRows
    .filter((o) => o.onboardingStatus === "Active")
    .map((o) => ({
      value: o.ownerUserId,
      label: o.ownerName ?? o.ownerEmail ?? o.ownerUserId.slice(0, 8),
    }));
  const typeItems = PROPERTY_TYPES.map((pt) => ({
    value: pt,
    label: t(`form.types.${pt}` as Parameters<typeof t>[0]),
  }));

  const [ownerUserId, setOwnerUserId] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState<PropertyType>("Other");
  const [entryInstructions, setEntryInstructions] = useState("");
  const [lat, setLat] = useState("");
  const [long, setLong] = useState("");
  const [floorCount, setFloorCount] = useState("");

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
    ownerUserId !== "" &&
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
      ownerUserId,
      name: name.trim(),
      address: address.trim(),
      lat: latNum,
      long: longNum,
      type,
      entryInstructions: entryInstructions.trim(),
      floorCount: floorNum,
      docs: null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !pending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("create.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t("create.ownerLabel")}</label>
            <Select
              value={ownerUserId}
              onValueChange={(v) => setOwnerUserId(v ?? "")}
              items={ownerItems}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("create.ownerPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {ownerItems.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!ownersLoading && ownerItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("create.noEligibleOwners")}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t("form.name")}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("form.namePlaceholder")}
              maxLength={200}
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
              <Select
                value={type}
                onValueChange={(v) => v && isType(v) && setType(v)}
                items={typeItems}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeItems.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label}
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
              <Input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t("form.long")}</label>
              <Input type="number" step="any" value={long} onChange={(e) => setLong(e.target.value)} />
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
            {t("create.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
