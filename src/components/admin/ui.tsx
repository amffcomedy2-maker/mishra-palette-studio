import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  subtitle,
  icon,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("glass rounded-3xl p-5 sm:p-7", className)}>
      <div className="mb-5 flex items-center gap-3">
        {icon && <span className="icon-tile size-11 shrink-0">{icon}</span>}
        <div>
          <h2 className="text-xl font-bold text-foreground">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string | undefined;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export const goldBtn =
  "btn-3d btn-gold inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-6 font-bold disabled:opacity-60 disabled:pointer-events-none";
export const glassBtn =
  "btn-3d btn-glass inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60 disabled:pointer-events-none";
export const inputLux = "h-11 rounded-xl bg-background/60";
