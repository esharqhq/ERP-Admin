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
import { useOwnerList } from "@/hooks/use-owners";
import { usePropertyCategories } from "@/hooks/use-lookups";
import { LocationPicker } from "@/components/properties/location-picker";
import { categoryName } from "@/lib/properties/table-rows";
import {
  AREA_MAX,
  FLOOR_MAX,
  ROOM_MAX,
  parseOptionalNumber,
} from "@/lib/properties/form-fields";
import type { CreateAdminPropertyRequest } from "@/lib/types/property.types";

interface Props {
  open: boolean;
  onClose: () => void;
  pending: boolean;
  /** Localized parent-mutation error. */
  error?: string | null;
  onSubmit: (body: CreateAdminPropertyRequest) => void;
}

export function PropertyCreateDialog({ open, onClose, pending, error, onSubmit }: Props) {
  const t = useTranslations("properties");
  const tCommon = useTranslations("common");
  const locale = useLocale();

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
  // Active-only, which is what the server accepts: assigning a deactivated
  // category is `400 property_category_inactive`. (The edit dialog has to be
  // more forgiving — see the note there.)
  const { data: categories = [], isLoading: categoriesLoading } = usePropertyCategories();
  const categoryItems = categories.map((c) => ({
    value: c.id,
    label: categoryName(c, locale),
  }));

  const [ownerUserId, setOwnerUserId] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [propertyCategoryId, setPropertyCategoryId] = useState("");
  const [entryInstructions, setEntryInstructions] = useState("");
  // The map is now the only source of coordinates, so "not placed" is null
  // rather than two empty strings — and `lat`/`long` are non-nullable
  // server-side, which makes a null here a hard block on submit.
  const [location, setLocation] = useState<{ lat: number; long: number } | null>(null);
  const [floorCount, setFloorCount] = useState("");
  const [roomCount, setRoomCount] = useState("");
  const [areaSqm, setAreaSqm] = useState("");

  const floor = parseOptionalNumber(floorCount, { max: FLOOR_MAX, integer: true });
  const room = parseOptionalNumber(roomCount, { max: ROOM_MAX, integer: true });
  const area = parseOptionalNumber(areaSqm, { max: AREA_MAX, integer: false });

  const canSubmit =
    ownerUserId !== "" &&
    name.trim().length > 0 &&
    address.trim().length > 0 &&
    entryInstructions.trim().length > 0 &&
    // Required, and enforced here rather than left to the server: an omitted
    // category binds to Guid.Empty and comes back as a confusing
    // `property_category_not_found` instead of "pick a category".
    propertyCategoryId !== "" &&
    location !== null &&
    floor.ok &&
    room.ok &&
    area.ok &&
    !pending;

  function handleSubmit() {
    if (!canSubmit || !location) return;
    onSubmit({
      ownerUserId,
      name: name.trim(),
      address: address.trim(),
      lat: location.lat,
      long: location.long,
      propertyCategoryId,
      entryInstructions: entryInstructions.trim(),
      floorCount: floor.value,
      roomCount: room.value,
      areaSqm: area.value,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !pending && onClose()}>
      {/* Wider than the default `sm:max-w-sm` and scrolled internally: the map
          needs the width to be usable, and the form is now taller than a short
          viewport. The header and footer stay put while the body scrolls. */}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("create.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[65vh] flex-col gap-4 overflow-y-auto pr-1">
          {/* Owner and category side by side: the two choices that decide what
              this property *is*, before any of its details. Both are selects of
              the same height, so the row stays even; their hint lines sit under
              their own column rather than pushing the other one down. */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t("create.ownerLabel")}</label>
              <Select
                value={ownerUserId}
                onValueChange={(v) => setOwnerUserId(v ?? "")}
                items={ownerItems}
              >
                <SelectTrigger className="w-full">
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
              <label className="text-sm font-medium">{t("form.category")}</label>
              <Select
                value={propertyCategoryId}
                onValueChange={(v) => setPropertyCategoryId(v ?? "")}
                items={categoryItems}
                disabled={categoriesLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("form.categoryPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {categoryItems.map((it) => (
                    <SelectItem key={it.value} value={it.value}>
                      {it.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!categoriesLoading && categoryItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("form.noCategories")}</p>
              ) : null}
            </div>
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

          {/* Directly under the address: the admin types the street, then points
              at it. Splitting the two apart made the old lat/long pair feel like
              unrelated data entry. */}
          <LocationPicker
            value={location}
            onChange={(lat, long) => setLocation({ lat, long })}
          />

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
            {t("create.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
