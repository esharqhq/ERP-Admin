"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type LoginState } from "./actions";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";

const initialState: LoginState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="lg"
      className="group h-11 w-full gap-2 text-sm font-semibold"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Kirilmoqda...
        </>
      ) : (
        <>
          Tizimga kirish
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </>
      )}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label
          htmlFor="email"
          className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
        >
          Email manzil
        </Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue="admin@erp.com"
            placeholder="you@company.com"
            className="h-11 pl-9 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label
            htmlFor="password"
            className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
          >
            Parol
          </Label>
          <a
            href="#"
            className="text-[11px] font-medium text-primary transition-colors hover:text-primary/80"
          >
            Esladan chiqdimi?
          </a>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="h-11 pl-9 pr-10 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
            className="absolute right-2.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-[12px] text-muted-foreground">
        <input
          type="checkbox"
          name="remember"
          className="size-3.5 rounded border-border text-primary focus:ring-1 focus:ring-primary/30"
        />
        <span>
          Meni eslab qol{" "}
          <span className="text-foreground/60">(7 kungacha sessiya)</span>
        </span>
      </label>

      <SubmitButton />

      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-card px-3 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            yoki
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground">
        <Lock className="size-3" />
        <span>
          Tizim <span className="font-medium text-foreground">2FA</span> bilan
          himoyalangan
        </span>
      </div>
    </form>
  );
}
