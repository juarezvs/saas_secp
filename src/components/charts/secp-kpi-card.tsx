import type { LucideIcon } from "lucide-react";

import { cn } from "@/components/ui/utils";

type SecpKpiTone = "green" | "orange" | "red" | "blue";

type SecpKpiCardProps = {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  tone?: SecpKpiTone;
  trend?: string;
  className?: string;
};

const toneClasses: Record<SecpKpiTone, string> = {
  blue: "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100",
  green:
    "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  orange:
    "border-orange-200 bg-orange-50 text-orange-950 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-100",
  red: "border-red-200 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950 dark:text-red-100",
};

export function SecpKpiCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "blue",
  trend,
  className,
}: SecpKpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-md border p-4 shadow-card",
        toneClasses[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase">{label}</p>
          <p className="mt-2 text-3xl font-black leading-none">{value}</p>
          <p className="mt-2 text-xs font-semibold opacity-80">{detail}</p>
        </div>
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-white/65 text-current shadow-sm dark:bg-white/10">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
      {trend && <p className="mt-3 text-xs font-bold">{trend}</p>}
    </div>
  );
}
