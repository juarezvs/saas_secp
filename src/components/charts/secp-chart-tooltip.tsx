import { cn } from "@/components/ui/utils";

type SecpTooltipPayload = {
  dataKey?: string | number;
  name?: string | number;
  value?: string | number;
  color?: string;
};

type SecpChartTooltipProps = {
  active?: boolean;
  payload?: SecpTooltipPayload[];
  label?: string | number;
  className?: string;
  valueSuffix?: string;
};

function formatValue(value: string | number | undefined) {
  if (typeof value === "number") {
    return new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 1,
    }).format(value);
  }

  return String(value);
}

export function SecpChartTooltip({
  active,
  payload,
  label,
  className,
  valueSuffix = "",
}: SecpChartTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "min-w-40 rounded-md border border-border bg-card p-3 text-xs shadow-floating",
        className,
      )}
    >
      <p className="font-bold text-foreground">{label}</p>
      <div className="mt-2 grid gap-1.5">
        {payload.map((item) => (
          <div
            key={`${item.dataKey}-${item.name}`}
            className="grid grid-cols-[0.75rem_minmax(0,1fr)_auto] items-center gap-2"
          >
            <span
              className="size-2.5 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate text-muted-foreground">{item.name}</span>
            <span className="font-bold text-foreground">
              {formatValue(item.value)}
              {valueSuffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
