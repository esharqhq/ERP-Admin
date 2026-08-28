"use client";

import React, {useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {useLogin} from "@/hooks/use-login";
import {useTranslations} from "next-intl";
import {AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail,} from "lucide-react";

/**
 * Fields follow the admin system-pages spec: overline labels, 46px controls at
 * radius 14, 15px value text, leading icon in the muted neutral. 46px is the
 * spec's own control height for the auth and system surface — between the DS
 * console sizes of 40 and 48 — and the submit is 50px, because it is the single
 * decision on the page.
 *
 * "Forgot password?" is in the design, so it is here — but it cannot go where
 * the design's screens 03/04 go. There is no reset endpoint:
 * `/api/profile/password` needs an authenticated session AND the current
 * password, which is a change-password flow, not a reset. Rather than a link to
 * `#` or to a screen that cannot work, it reveals the one true answer — a staff
 * password is reset by an owner-admin — which needs no backend and never lies.
 * The reset endpoint is filed in BACKEND-ASKS.md; when it lands, this becomes a
 * link.
 */
export function LoginForm() {
    const t = useTranslations('login');
    const [showPassword, setShowPassword] = useState(false);
    const [showReset, setShowReset] = useState(false);
    const {mutate: login, isPending, error} = useLogin();

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        login({
            email: String(form.get("email") ?? "").trim(),
            password: String(form.get("password") ?? ""),
        });
    }

    const errorMessage = error
        ? (error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message ?? t('error')
        : null;

    return (
        <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-col gap-3.5">

            <input type="text" name="fake-user" className="hidden" aria-hidden="true" readOnly/>
            <input type="password" name="fake-pass" className="hidden" aria-hidden="true" readOnly/>
            {errorMessage ? (
                <div
                    className="flex items-start gap-2 rounded-lg bg-status-cancelled-tint p-3 text-sm text-status-cancelled-deep">
                    <AlertCircle className="mt-0.5 size-4 shrink-0"/>
                    <span>{errorMessage}</span>
                </div>
            ) : null}

            <div className="flex flex-col gap-[7px]">
                <Label htmlFor="email" className="overline-label text-[var(--neutral-muted)]">
                    {t('email')}
                </Label>
                <div className="relative">
                    <Mail
                        className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-[var(--neutral-muted)]"/>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="off"
                        required
                        placeholder={t('emailPlaceholder')}
                        className="h-[46px] pl-11"
                    />
                </div>
            </div>

            <div className="flex flex-col gap-[7px]">
                <Label htmlFor="password" className="overline-label text-[var(--neutral-muted)]">
                    {t('password')}
                </Label>
                <div className="relative">
                    <Lock
                        className="pointer-events-none absolute left-3.5 top-1/2 size-[17px] -translate-y-1/2 text-[var(--neutral-muted)]"/>
                    <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        className="h-[46px] pl-11 pr-11"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={t('password')}
                        className="absolute right-3 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-[var(--neutral-muted)] transition-colors hover:bg-muted hover:text-foreground"
                    >
                        {showPassword ? <EyeOff className="size-[17px]"/> : <Eye className="size-[17px]"/>}
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2.5 py-0.5 text-sm text-foreground/85">
                    <input
                        type="checkbox"
                        name="remember"
                        className="size-[18px] rounded-sm border-border accent-primary"
                    />
                    <span>{t('rememberMe30')}</span>
                </label>
                <button
                    type="button"
                    onClick={() => setShowReset((v) => !v)}
                    aria-expanded={showReset}
                    className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                >
                    {t('forgotPassword')}
                </button>
            </div>
            {showReset ? (
                <p className="rounded-lg bg-accent px-3 py-2 text-[13px] leading-[1.5] text-foreground/85">
                    {t('forgotPasswordHelp')}
                </p>
            ) : null}

            <Button
                type="submit"
                className="group mt-1 h-[50px] w-full gap-2 text-[15px] font-semibold"
                disabled={isPending}
            >
                {isPending ? (
                    <>
                        <Loader2 className="size-4 animate-spin"/>
                        {t('submit')}
                    </>
                ) : (
                    <>
                        {t('submit')}
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5"/>
                    </>
                )}
            </Button>
        </form>
    );
}
