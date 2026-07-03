"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SecpChartLegend, type SecpLegendItem } from "./secp-chart-legend";
import { SecpChartTooltip } from "./secp-chart-tooltip";
import { SecpEmptyChart } from "./secp-empty-chart";

export type SecpLineSerie = SecpLegendItem & {
  dataKey: string;
};

type SecpLineChartProps<T extends Record<string, string | number>> = {
  data: T[];
  series: SecpLineSerie[];
  xDataKey: string;
  valueSuffix?: string;
  yDomain?: [number, number];
};

export function SecpLineChart<T extends Record<string, string | number>>({
  data,
  series,
  xDataKey,
  valueSuffix = "",
  yDomain,
}: SecpLineChartProps<T>) {
  if (data.length === 0) {
    return <SecpEmptyChart />;
  }

  return (
    <div className="grid gap-4">
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey={xDataKey}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              fontSize={12}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              domain={yDomain}
              tickFormatter={(value) => `${value}${valueSuffix}`}
            />
            <Tooltip content={<SecpChartTooltip valueSuffix={valueSuffix} />} />
            {series.map((serie) => (
              <Line
                key={serie.dataKey}
                type="monotone"
                dataKey={serie.dataKey}
                name={serie.label}
                stroke={serie.color}
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <SecpChartLegend
        items={series.map((serie) => ({
          key: serie.dataKey,
          label: serie.label,
          color: serie.color,
        }))}
      />
    </div>
  );
}
