import { Star, Phone, Mail, MapPin, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { WorkerDetailDto } from "@/lib/types/worker.types";

export function HeroCard({ worker }: { worker: WorkerDetailDto }) {
  const initials = (worker.fullName ?? "??").slice(0, 2).toUpperCase();
  const profession = worker.professions?.[0]?.name ?? null;

  return (
    <Card className="overflow-hidden">
      <div
        aria-hidden
        className="h-24 w-full bg-gradient-to-r from-primary/12 via-primary/6 to-accent/10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(16,54,125,0.18) 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      />
      <CardContent className="-mt-12 flex flex-col gap-5 pb-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <Avatar className="size-24 ring-4 ring-background shadow-sm">
              {worker.profilePictureUrl && (
                <AvatarImage
                  src={worker.profilePictureUrl}
                  alt={worker.fullName ?? ""}
                />
              )}
              <AvatarFallback className="bg-primary text-2xl font-semibold text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1.5 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-heading text-2xl font-bold tracking-tight leading-tight sm:text-[28px]">
                  {worker.fullName ?? "—"}
                </h1>
                {profession && (
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {profession}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={worker.isApproved ? "default" : "secondary"}>
                  {worker.isApproved ? "Tasdiqlangan" : "Kutilmoqda"}
                </Badge>
                {/* {worker.isVerified && <Badge variant="outline">Verified</Badge>} */}
                <span className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground">
                  <Star className="size-3.5 fill-amber-500 text-amber-500" />
                  <span className="tabular-nums text-foreground">
                    {worker.rating.toFixed(1)}
                  </span>
                  <span>reyting</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {worker.email && (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                className="gap-1.5"
                render={<a href={`mailto:${worker.email}`} />}
              >
                <Mail className="size-4" />
                Email
              </Button>
            )}
            {worker.phoneNumber && (
              <Button
                size="sm"
                nativeButton={false}
                className="gap-1.5"
                render={
                  <a href={`tel:${worker.phoneNumber.replace(/\s+/g, "")}`} />
                }
              >
                <Phone className="size-4" />
                Qo'ng'iroq
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {worker.address && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-4 shrink-0" />
              {worker.address}
            </span>
          )}
          {/* {worker.experience !== null && worker.experience !== undefined && (
            <span className="flex items-center gap-1.5">
              <Briefcase className="size-4 shrink-0" />
              {worker.experience} yil tajriba
            </span>
          )} */}
        </div>

        {(worker.professions?.length ?? 0) > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {worker.professions!.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center rounded-md border border-dashed border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                {p.name ?? p.code ?? "—"}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
