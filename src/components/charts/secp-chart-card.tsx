import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/components/ui/utils";

type SecpChartCardProps = {
  title: string;
  description?: string;
  kpi?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function SecpChartCard({
  title,
  description,
  kpi,
  actions,
  children,
  className,
  contentClassName,
}: SecpChartCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {(kpi || actions) && (
          <div className="flex shrink-0 items-center gap-2">
            {kpi}
            {actions}
          </div>
        )}
      </CardHeader>
      <CardContent className={cn("pt-1", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
