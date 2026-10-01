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

import { SecpChartLegend, type SecpLegendItem } from "@/components/charts";
import { minutosParaTexto } from "../../application/services/calcular-tempo.service";

type SemanaChartDatum = {
  dia: string;
  data: string;
  prevista: number;
  trabalhada: number;
  extras: number;
  debito: number;
};

type TooltipPayload = {
  dataKey?: string | number;
  name?: string | number;
  value?: string | number;
  color?: string;
};

type TooltipProps = {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
};

const series: Array<SecpLegendItem & { dataKey: keyof SemanaChartDatum }> = [
  {
    key: "prevista",
    dataKey: "prevista",
    label: "Jornada prevista",
    color: "#1d4ed8",
  },
  {
    key: "trabalhada",
    dataKey: "trabalhada",
    label: "Trabalhado",
    color: "#10b981",
  },
  { key: "extras", dataKey: "extras", label: "Horas extras", color: "#fbbf24" },
  { key: "debito", dataKey: "debito", label: "Debito", color: "#ef4444" },
];

function TooltipSemana({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="min-w-44 rounded-md border border-slate-200 bg-white p-3 text-xs shadow-xl shadow-blue-950/10">
      <p className="font-black text-blue-950">{label}</p>
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
            <span className="truncate font-semibold text-slate-500">
              {item.name}
            </span>
            <span className="font-black text-blue-950">
              {minutosParaTexto(Number(item.value ?? 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EspelhoPontoSemanaChart({
  data,
}: {
  data: SemanaChartDatum[];
}) {
  return (
    <div className="mt-3 grid gap-3">
      <div className="h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, bottom: 0, left: -18 }}
          >
            <CartesianGrid vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="dia"
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              fontSize={10}
              tickFormatter={(_, index) =>
                data[index] ? `${data[index].dia}\n${data[index].data}` : ""
              }
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={10}
              tickFormatter={(value) => minutosParaTexto(Number(value))}
            />
            <Tooltip content={<TooltipSemana />} />
            {series.map((serie) => (
              <Bar
                key={serie.key}
                dataKey={serie.dataKey}
                name={serie.label}
                stackId="semana"
                fill={serie.color}
                radius={serie.key === "debito" ? [3, 3, 0, 0] : 0}
                maxBarSize={34}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <SecpChartLegend
        items={series}
        className="gap-4 text-[11px] text-slate-600"
      />
    </div>
  );
}
