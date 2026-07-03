import { cn } from "@/components/ui/utils";

type SecpEmptyChartProps = {
  message?: string;
  className?: string;
};

export function SecpEmptyChart({
  message = "Sem dados registrados para o periodo selecionado.",
  className,
}: SecpEmptyChartProps) {
  return (
    <div
      className={cn(
        "flex min-h-48 items-center justify-center rounded-md border border-dashed border-border bg-muted/40 p-4 text-center text-sm font-medium text-muted-foreground",
        className,
      )}
    >
      {message}
    </div>
  );
}
