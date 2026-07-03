import { cn } from "@/components/ui/utils";

export type SecpLegendItem = {
  key: string;
  label: string;
  color: string;
};

type SecpChartLegendProps = {
  items: SecpLegendItem[];
  className?: string;
};

export function SecpChartLegend({ items, className }: SecpChartLegendProps) {
  return (
    <div className={cn("flex flex-wrap gap-4 text-xs font-bold", className)}>
      {items.map((item) => (
        <span key={item.key} className="inline-flex items-center gap-2">
          <span
            className="size-3 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}
