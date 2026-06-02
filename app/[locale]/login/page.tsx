import Image from "next/image";
import {LoginForm} from "./login-form";
import {Sparkles, ShieldCheck, Zap} from "lucide-react";
import {getTranslations} from "next-intl/server";

export default async function LoginPage() {
    const t = await getTranslations('login');
    return (
        <div className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="relative flex flex-col px-6 py-8 sm:px-10 lg:px-14 lg:py-10">
                <header className="flex items-center justify-between">
                    <Image
                        src="/mond-logo.png"
                        alt="Mond"
                        width={100}
                        height={40}
                        priority
                        className="h-auto object-contain"
                    />

                </header>

                <main className="flex flex-1 flex-col justify-center py-2">
                    <div className="mx-auto w-full max-w-md">
                        <div className="mb-8 flex flex-col gap-3">
              <span
                  className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/8 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-primary ring-1 ring-primary/15">
                <Sparkles className="size-3"/>
                {t('badge')}
              </span>
                            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-[34px] sm:leading-[1.1]">
                                {t('heading')}
                            </h1>
                            <p className="max-w-sm text-[14px] leading-relaxed text-muted-foreground">
                                {t('description')}
                            </p>
                        </div>

                        <div
                            className="rounded-2xl bg-card p-6 shadow-[0_1px_0_rgba(16,54,125,0.04),0_24px_48px_-24px_rgba(16,54,125,0.18)] ring-1 ring-foreground/8 sm:p-7">
                            <LoginForm/>
                        </div>
                    </div>
                </main>
                <footer className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{t('footer')}</span>
                    <div className="hidden items-center gap-4 sm:flex">
                        <a href="#" className="transition-colors hover:text-foreground">
                            {t('help')}
                        </a>
                        <a href="#" className="transition-colors hover:text-foreground">
                            {t('privacy')}
                        </a>
                        <span className="font-mono text-[10px]">v1.0.0</span>
                    </div>
                </footer>
            </div>
            <aside className="relative hidden overflow-hidden bg-primary lg:block">
                <div
                    aria-hidden
                    className="absolute inset-0 opacity-[0.12]"
                    style={{
                        backgroundImage:
                            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                        backgroundSize: "20px 20px",
                    }}
                />
                <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                        background:
                            "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(107,174,219,0.35) 0%, transparent 70%)",
                    }}
                />
                <div
                    aria-hidden
                    className="absolute -right-32 -top-32 size-96 rounded-full bg-white/5 blur-3xl"
                />
                <div
                    aria-hidden
                    className="absolute -bottom-40 -left-20 size-112 rounded-full bg-accent/15 blur-3xl"
                />
                <div className="relative flex h-full flex-col px-12 py-12 xl:px-16">
                    <div className="relative flex flex-1 items-center justify-center">
                        <div
                            aria-hidden
                            className="absolute inset-x-12 top-1/2 h-72 -translate-y-1/2 rounded-[50%] bg-white/20 blur-3xl"
                        />
                        <div
                            className="relative w-full max-w-xl rounded-3xl bg-white/95 p-6 shadow-2xl backdrop-blur ring-1 ring-white/20 xl:p-8">
                            <Image
                                src="/illustration_mond.png"
                                alt="Mond service workforce"
                                width={1200}
                                height={720}
                                priority
                                className="h-auto w-full object-contain"
                            />
                            <div
                                className="absolute -left-3 top-8 hidden rotate-6 items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[11px] font-semibold text-accent-foreground shadow-lg ring-2 ring-white/40 xl:flex">
                                <Zap className="size-3"/>
                                {t('realtime')}
                            </div>
                            <div
                                className="absolute -right-2 bottom-10 hidden rotate-[5deg] items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-lg ring-2 ring-white/40 xl:flex">
                                <ShieldCheck className="size-3"/>
                                {t('verifiedTeam')}
                            </div>
                        </div>
                    </div>

                </div>
            </aside>
        </div>
    );
}
