"use client";

import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { minutosParaHoraBanco } from "../../application/services/formatar-banco-horas.service";

type BancoHorasEvolucaoPonto = {
  label: string;
  valor: number;
};

export function BancoHorasEvolucaoChart({
  data,
}: {
  data: BancoHorasEvolucaoPonto[];
}) {
  return (
    <div className="mt-4 h-64 rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-3">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 32, right: 18, left: 8, bottom: 6 }}
          accessibilityLayer
        >
          <CartesianGrid
            vertical={false}
            stroke="#e2e8f0"
            strokeDasharray="4 6"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            fontSize={11}
            stroke="#64748b"
          />
          <YAxis
            hide
            domain={["dataMin - 60", "dataMax + 60"]}
          />
          <Tooltip
            cursor={{ stroke: "#bfdbfe", strokeWidth: 2 }}
            formatter={(value) =>
              minutosParaHoraBanco(typeof value === "number" ? value : 0)
            }
            labelClassName="font-bold text-blue-950"
            contentStyle={{
              borderRadius: 10,
              borderColor: "#dbeafe",
              boxShadow: "0 12px 28px rgba(15, 23, 42, 0.12)",
            }}
          />
          <Line
            dataKey="valor"
            type="natural"
            stroke="#2563eb"
            strokeWidth={3}
            dot={{
              r: 4,
              fill: "#ffffff",
              stroke: "#2563eb",
              strokeWidth: 3,
            }}
            activeDot={{
              r: 6,
              fill: "#2563eb",
              stroke: "#ffffff",
              strokeWidth: 3,
            }}
          >
            <LabelList
              position="top"
              offset={12}
              className="fill-blue-950 text-[11px] font-black"
              formatter={(value: unknown) =>
                minutosParaHoraBanco(typeof value === "number" ? value : 0)
              }
            />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
