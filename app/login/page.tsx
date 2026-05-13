import Image from "next/image";
import { LoginForm } from "./login-form";
import { Sparkles, ShieldCheck, Zap } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* LEFT — login panel */}
      <div className="relative flex flex-col px-6 py-8 sm:px-10 lg:px-14 lg:py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex aspect-square size-10 items-center justify-center overflow-hidden rounded-xl bg-primary/10 ring-1 ring-primary/15">
              <Image
                src="/mond-logo.png"
                alt="Mond"
                width={28}
                height={28}
                priority
                className="size-7 object-contain"
              />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-heading text-[15px] font-semibold tracking-tight">
                Mond ERP
              </span>
              <span className="text-[11px] text-muted-foreground">
                ERP Control Center
              </span>
            </div>
          </div>

        </header>

        <main className="flex flex-1 flex-col justify-center py-10">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 flex flex-col gap-3">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/8 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-primary ring-1 ring-primary/15">
                <Sparkles className="size-3" />
                Boshqaruv paneli
              </span>
              <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-[34px] sm:leading-[1.1]">
                Xush kelibsiz,
                <br />
                <span className="text-primary">tizimga kiring</span>
              </h1>
              <p className="max-w-sm text-[14px] leading-relaxed text-muted-foreground">
                Workerlar, Ownerlar va tasklarni{" "}
                <span className="font-medium text-foreground">real vaqtda</span>{" "}
                boshqaring. Bir ekrandan butun biznesni nazorat qiling.
              </p>
            </div>

            <div className="rounded-2xl bg-card p-6 shadow-[0_1px_0_rgba(16,54,125,0.04),0_24px_48px_-24px_rgba(16,54,125,0.18)] ring-1 ring-foreground/8 sm:p-7">
              <LoginForm />
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-2.5">
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="size-3.5 text-primary/80" />
                <span className="font-medium uppercase tracking-wider">
                  Test akkaunt
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-foreground/80">
                <span>admin@erp.com</span>
                <span className="text-border">·</span>
                <span>admin123</span>
              </div>
            </div>
          </div>
        </main>

        <footer className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>© 2026 Mond. Barcha huquqlar himoyalangan.</span>
          <div className="hidden items-center gap-4 sm:flex">
            <a href="#" className="transition-colors hover:text-foreground">
              Yordam
            </a>
            <a href="#" className="transition-colors hover:text-foreground">
              Maxfiylik
            </a>
            <span className="font-mono text-[10px]">v1.0.0</span>
          </div>
        </footer>
      </div>

      {/* RIGHT — illustration panel */}
      <aside className="relative hidden overflow-hidden bg-primary lg:block">
        {/* layered backgrounds */}
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

        {/* decorative ring */}

        <div className="relative flex h-full flex-col px-12 py-12 xl:px-16">
          {/* top eyebrow */}


          {/* illustration centered */}
          <div className="relative flex flex-1 items-center justify-center">
            {/* soft glow behind */}
            <div
              aria-hidden
              className="absolute inset-x-12 top-1/2 h-72 -translate-y-1/2 rounded-[50%] bg-white/20 blur-3xl"
            />
            {/* white surface to make illustration pop */}
            <div className="relative w-full max-w-xl rounded-3xl bg-white/95 p-6 shadow-2xl backdrop-blur ring-1 ring-white/20 xl:p-8">
              <Image
                src="/illustration_mond.png"
                alt="Mond service workforce"
                width={1200}
                height={720}
                priority
                className="h-auto w-full object-contain"
              />
              {/* sticker badges */}
              <div className="absolute -left-3 top-8 hidden rotate-6 items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[11px] font-semibold text-accent-foreground shadow-lg ring-2 ring-white/40 xl:flex">
                <Zap className="size-3" />
                Real-time
              </div>
              <div className="absolute -right-2 bottom-10 hidden rotate-[5deg] items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-lg ring-2 ring-white/40 xl:flex">
                <ShieldCheck className="size-3" />
                Verified team
              </div>
            </div>
          </div>

          {/* bottom copy */}

        </div>
      </aside>
    </div>
  );
}
