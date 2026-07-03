"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { SecpChartLegend, type SecpLegendItem } from "./secp-chart-legend";
import { SecpChartTooltip } from "./secp-chart-tooltip";
import { SecpEmptyChart } from "./secp-empty-chart";

export type SecpComparativeBarSerie = SecpLegendItem & {
  dataKey: string;
};

type SecpComparativeHorizontalBarChartProps<T extends Record<string, string | number>> = {
  data: T[];
  xKeys: SecpComparativeBarSerie[];
  yDataKey: string;
  valueSuffix?: string;
};

export function SecpComparativeHorizontalBarChart<
  T extends Record<string, string | number>,
>({
  data,
  xKeys,
  yDataKey,
  valueSuffix = "",
}: SecpComparativeHorizontalBarChartProps<T>) {
  const hasValues = data.some((item) =>
    xKeys.some((serie) => Number(item[serie.dataKey as keyof T] ?? 0) > 0),
  );

  if (data.length === 0 || !hasValues) {
    return <SecpEmptyChart />;
  }

  return (
    <div className="grid gap-4">
      <div className="h-[28rem] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 24, bottom: 8, left: 12 }}
            barGap={4}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              tickFormatter={(value) => `${value}${valueSuffix}`}
            />
            <YAxis
              type="category"
              dataKey={yDataKey}
              tickLine={false}
              axisLine={false}
              width={124}
              fontSize={12}
            />
            <Tooltip content={<SecpChartTooltip valueSuffix={valueSuffix} />} />
            {xKeys.map((serie) => (
              <Bar
                key={serie.dataKey}
                dataKey={serie.dataKey}
                name={serie.label}
                fill={serie.color}
                radius={[0, 4, 4, 0]}
                maxBarSize={22}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <SecpChartLegend items={xKeys} />
    </div>
  );
}
