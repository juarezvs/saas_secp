"use client";

import { useActionState, useState } from "react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
} from "@/components/ui";
import { configurarPoliticaHorasExtrasAction } from "../../application/actions/configurar-politica-horas-extras.action";
import type { ConfigurarPoliticaHorasExtrasFormState } from "../../application/schemas/horas-extras-politica.schema";

type OrgaoOption = {
  id: string;
  sigla: string;
  nome: string;
};

type UnidadeOption = {
  id: string;
  orgaoId: string;
  sigla: string;
  nome: string;
  orgao: {
    sigla: string;
  };
};

const estadoInicial: ConfigurarPoliticaHorasExtrasFormState = {
  sucesso: false,
};

function erro(estado: ConfigurarPoliticaHorasExtrasFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

function formatarMinutos(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `${String(horas).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

function minutosDeHoraMinuto(valor: string) {
  const match = /^(\d{1,3}):([0-5]\d)$/.exec(valor);

  if (!match) {
    return 0;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function mascararHoraMinuto(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 5);

  if (digitos.length <= 2) {
    return digitos;
  }

  return `${digitos.slice(0, -2)}:${digitos.slice(-2)}`;
}

function normalizarHoraMinuto(valor: string) {
  const digitos = valor.replace(/\D/g, "").slice(0, 5);

  if (!digitos) {
    return "00:00";
  }

  if (digitos.length <= 2) {
    return `${digitos.padStart(2, "0")}:00`;
  }

  return `${digitos.slice(0, -2).padStart(2, "0")}:${digitos.slice(-2)}`;
}

function TempoPoliticaInput({
  id,
  name,
  label,
  defaultMinutes,
}: {
  id: string;
  name: string;
  label: string;
  defaultMinutes: number;
}) {
  const [valor, setValor] = useState(formatarMinutos(defaultMinutes));

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <input type="hidden" name={name} value={minutosDeHoraMinuto(valor)} />
      <Input
        id={id}
        inputMode="numeric"
        maxLength={6}
        value={valor}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setValor(mascararHoraMinuto(event.target.value))}
        onBlur={(event) => setValor(normalizarHoraMinuto(event.target.value))}
        placeholder="HH:mm"
      />
    </div>
  );
}

function PercentualPoliticaInput({
  id,
  name,
  label,
  defaultValue,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: number;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type="number"
          min={0}
          step="0.01"
          defaultValue={defaultValue}
          className="pr-9"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-semibold text-muted-foreground">
          %
        </span>
      </div>
    </div>
  );
}

export function HorasExtrasPoliticaForm({
  orgaos,
  unidades,
}: {
  orgaos: OrgaoOption[];
  unidades: UnidadeOption[];
}) {
  const [estado, formAction, pendente] = useActionState(
    configurarPoliticaHorasExtrasAction,
    estadoInicial,
  );
  const [orgaoSelecionado, setOrgaoSelecionado] = useState(
    estado.campos?.orgaoId ?? orgaos[0]?.id ?? "",
  );
  const unidadesDoOrgao = unidades.filter(
    (unidade) => unidade.orgaoId === orgaoSelecionado,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nova versão de política</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {estado.mensagem && (
            <div
              className={[
                "rounded-md border p-4 text-sm font-medium",
                estado.sucesso
                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                  : "border-amber-200 bg-amber-50 text-amber-950",
              ].join(" ")}
            >
              {estado.mensagem}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-[1fr_1fr_11rem]">
            <div className="space-y-2">
              <Label htmlFor="orgaoId">Órgão</Label>
              <Select
                id="orgaoId"
                name="orgaoId"
                value={orgaoSelecionado}
                onChange={(event) => setOrgaoSelecionado(event.target.value)}
              >
                {orgaos.map((orgao) => (
                  <option key={orgao.id} value={orgao.id}>
                    {orgao.sigla} - {orgao.nome}
                  </option>
                ))}
              </Select>
              {erro(estado, "orgaoId") && (
                <p className="text-xs text-red-700">{erro(estado, "orgaoId")}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="scopeUnitId">Escopo</Label>
              <Select
                id="scopeUnitId"
                name="scopeUnitId"
                defaultValue={estado.campos?.scopeUnitId ?? ""}
              >
                <option value="">Geral do órgão</option>
                {unidadesDoOrgao.map((unidade) => (
                  <option key={unidade.id} value={unidade.id}>
                    {unidade.orgao.sigla} / {unidade.sigla} - {unidade.nome}
                  </option>
                ))}
              </Select>
              {erro(estado, "scopeUnitId") && (
                <p className="text-xs text-red-700">
                  {erro(estado, "scopeUnitId")}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="validFrom">Vigência inicial</Label>
              <Input
                id="validFrom"
                name="validFrom"
                type="date"
                defaultValue={
                  estado.campos?.validFrom ??
                  new Date().toISOString().slice(0, 10)
                }
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <TempoPoliticaInput
              id="maxDailyWeekdayTime"
              name="maxDailyWeekdayMinutes"
              label="Dia útil"
              defaultMinutes={estado.campos?.maxDailyWeekdayMinutes ?? 120}
            />
            <TempoPoliticaInput
              id="maxDailyWeekendHolidayTime"
              name="maxDailyWeekendHolidayMinutes"
              label="Fim de semana"
              defaultMinutes={
                estado.campos?.maxDailyWeekendHolidayMinutes ?? 480
              }
            />
            <TempoPoliticaInput
              id="maxMonthlyTime"
              name="maxMonthlyMinutes"
              label="Mensal"
              defaultMinutes={estado.campos?.maxMonthlyMinutes ?? 2640}
            />
            <TempoPoliticaInput
              id="maxAnnualTime"
              name="maxAnnualMinutes"
              label="Anual"
              defaultMinutes={estado.campos?.maxAnnualMinutes ?? 8040}
            />
            <TempoPoliticaInput
              id="divisorTime"
              name="divisorMinutes"
              label="Divisor"
              defaultMinutes={estado.campos?.divisorMinutes ?? 12000}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <PercentualPoliticaInput
              id="rateDiaUtil"
              name="rateDiaUtil"
              label="Adicional dia útil"
              defaultValue={estado.campos?.rateDiaUtil ?? 50}
            />
            <PercentualPoliticaInput
              id="rateSabado"
              name="rateSabado"
              label="Adicional sábado"
              defaultValue={estado.campos?.rateSabado ?? 50}
            />
            <PercentualPoliticaInput
              id="rateDomingo"
              name="rateDomingo"
              label="Adicional domingo"
              defaultValue={estado.campos?.rateDomingo ?? 100}
            />
            <PercentualPoliticaInput
              id="rateFeriado"
              name="rateFeriado"
              label="Adicional feriado"
              defaultValue={estado.campos?.rateFeriado ?? 100}
            />
          </div>

          <Button type="submit" loading={pendente} disabled={orgaos.length === 0}>
            Publicar versão
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
