"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { SecpChartLegend } from "./secp-chart-legend";
import { SecpChartTooltip } from "./secp-chart-tooltip";
import { SecpEmptyChart } from "./secp-empty-chart";

type SecpDonutDatum = {
  label: string;
  valor: number;
};

type SecpDonutChartProps = {
  data: SecpDonutDatum[];
  colors?: string[];
};

const DEFAULT_COLORS = ["#1d4ed8", "#059669", "#ea580c", "#7c3aed", "#dc2626"];

export function SecpDonutChart({
  data,
  colors = DEFAULT_COLORS,
}: SecpDonutChartProps) {
  if (data.length === 0 || data.every((item) => item.valor === 0)) {
    return <SecpEmptyChart />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-[13rem_minmax(0,1fr)] md:items-center">
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="valor"
              nameKey="label"
              innerRadius={58}
              outerRadius={86}
              paddingAngle={2}
            >
              {data.map((item, index) => (
                <Cell
                  key={item.label}
                  fill={colors[index % colors.length]}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip content={<SecpChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <SecpChartLegend
        className="grid gap-2"
        items={data.map((item, index) => ({
          key: item.label,
          label: item.label,
          color: colors[index % colors.length],
        }))}
      />
    </div>
  );
}
