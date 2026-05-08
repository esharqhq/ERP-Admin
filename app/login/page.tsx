import Image from "next/image";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/mond-logo.png"
            alt="Mond"
            width={64}
            height={64}
            priority
            className="size-16 rounded-xl object-contain"
          />
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="font-heading text-xl font-semibold">ERP Admin</h1>
            <p className="text-sm text-muted-foreground">
              Boshqaruv paneliga kirish uchun ma&apos;lumotlaringizni kiriting
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <LoginForm />
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Test: <span className="font-mono">admin@erp.com</span> /{" "}
          <span className="font-mono">admin123</span>
        </p>
      </div>
    </div>
  );
}
