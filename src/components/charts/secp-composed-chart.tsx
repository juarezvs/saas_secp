"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SecpChartLegend, type SecpLegendItem } from "./secp-chart-legend";
import { SecpChartTooltip } from "./secp-chart-tooltip";
import { SecpEmptyChart } from "./secp-empty-chart";

export type SecpComposedBarSerie = SecpLegendItem & {
  dataKey: string;
  stackId?: string;
};

export type SecpComposedLineSerie = SecpLegendItem & {
  dataKey: string;
  valueSuffix?: string;
};

type SecpComposedChartProps<T extends Record<string, string | number>> = {
  data: T[];
  xDataKey: string;
  bars: SecpComposedBarSerie[];
  lines: SecpComposedLineSerie[];
};

export function SecpComposedChart<T extends Record<string, string | number>>({
  data,
  xDataKey,
  bars,
  lines,
}: SecpComposedChartProps<T>) {
  const hasValues = data.some((item) =>
    [...bars, ...lines].some((serie) => Number(item[serie.dataKey as keyof T] ?? 0) > 0),
  );

  if (data.length === 0 || !hasValues) {
    return <SecpEmptyChart />;
  }

  return (
    <div className="grid gap-4">
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xDataKey} tickLine={false} axisLine={false} tickMargin={10} fontSize={12} />
            <YAxis yAxisId="left" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              domain={[0, 120]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<SecpChartTooltip />} />
            {bars.map((serie) => (
              <Bar
                key={serie.dataKey}
                yAxisId="left"
                dataKey={serie.dataKey}
                name={serie.label}
                stackId={serie.stackId}
                fill={serie.color}
                maxBarSize={36}
              />
            ))}
            {lines.map((serie) => (
              <Line
                key={serie.dataKey}
                yAxisId="right"
                type="monotone"
                dataKey={serie.dataKey}
                name={serie.label}
                stroke={serie.color}
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <SecpChartLegend
        items={[...bars, ...lines].map((serie) => ({
          key: serie.dataKey,
          label: serie.label,
          color: serie.color,
        }))}
      />
    </div>
  );
}
