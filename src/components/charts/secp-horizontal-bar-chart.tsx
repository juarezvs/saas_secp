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

import { SecpChartTooltip } from "./secp-chart-tooltip";
import { SecpEmptyChart } from "./secp-empty-chart";

export type SecpBarDatum = {
  label: string;
  valor: number;
};

type SecpHorizontalBarChartProps = {
  data: SecpBarDatum[];
  color?: string;
  valueSuffix?: string;
};

export function SecpHorizontalBarChart({
  data,
  color = "#1d4ed8",
  valueSuffix = "",
}: SecpHorizontalBarChartProps) {
  if (data.length === 0 || data.every((item) => item.valor === 0)) {
    return <SecpEmptyChart />;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 20, bottom: 8, left: 12 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={false}
            width={118}
            fontSize={12}
          />
          <Tooltip content={<SecpChartTooltip valueSuffix={valueSuffix} />} />
          <Bar
            dataKey="valor"
            name="Quantidade"
            fill={color}
            radius={[0, 4, 4, 0]}
            maxBarSize={26}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
