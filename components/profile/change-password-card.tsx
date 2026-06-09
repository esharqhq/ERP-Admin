"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, KeyRound, Loader2, Lock } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChangePassword } from "@/hooks/use-profile";
import { getApiErrorCode } from "@/lib/http/api-error";

const MIN_LENGTH = 6;

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}

function PasswordField({ id, label, value, onChange, autoComplete }: PasswordFieldProps) {
  const t = useTranslations("profile.password");
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="pl-9 pr-10"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? t("hide") : t("show")}
          className="absolute right-2.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

export function ChangePasswordCard() {
  const t = useTranslations("profile.password");
  const change = useChangePassword();

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [success, setSuccess] = useState(false);

  const tooShort = next.length > 0 && next.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== next;
  const canSubmit =
    current.length > 0 &&
    next.length >= MIN_LENGTH &&
    confirm === next &&
    !change.isPending;

  const serverError = change.isError
    ? getApiErrorCode(change.error) === "invalid_current_password"
      ? t("errors.invalidCurrent")
      : t("errors.generic")
    : null;

  // Editing any field after a result clears stale success/error feedback.
  function clearStatus() {
    setSuccess(false);
    if (change.isError) change.reset();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSuccess(false);
    change.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          setSuccess(true);
          setCurrent("");
          setNext("");
          setConfirm("");
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader className="gap-1 pb-2">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-muted-foreground" />
          <h2 className="font-heading text-lg font-semibold tracking-tight">{t("title")}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
          <PasswordField
            id="current-password"
            label={t("current")}
            value={current}
            onChange={(v) => {
              setCurrent(v);
              clearStatus();
            }}
            autoComplete="current-password"
          />
          <PasswordField
            id="new-password"
            label={t("new")}
            value={next}
            onChange={(v) => {
              setNext(v);
              clearStatus();
            }}
            autoComplete="new-password"
          />
          {tooShort ? (
            <p className="-mt-2 text-xs text-muted-foreground">{t("minLength", { min: MIN_LENGTH })}</p>
          ) : null}
          <PasswordField
            id="confirm-password"
            label={t("confirm")}
            value={confirm}
            onChange={(v) => {
              setConfirm(v);
              clearStatus();
            }}
            autoComplete="new-password"
          />
          {mismatch ? <p className="-mt-2 text-xs text-destructive">{t("errors.mismatch")}</p> : null}

          {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
          {success ? <p className="text-sm text-emerald-600">{t("success")}</p> : null}

          <div>
            <Button type="submit" disabled={!canSubmit}>
              {change.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("submit")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
