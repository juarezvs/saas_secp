"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Clock3,
  Cpu,
  Layers3,
  List,
  MoreVertical,
  Plus,
  RefreshCw,
  Settings2,
  Upload,
  UsersRound,
  Wifi,
  WifiOff,
  type LucideIcon,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EquipamentosBiometricosTable } from "./equipamentos-biometricos-table";
import { RelogioPontoAdminPanel } from "./relogio-ponto-admin-panel";

type EquipamentoItem =
  Parameters<typeof EquipamentosBiometricosTable>[0]["equipamentos"][number];
type ColetaAtivaItem =
  Parameters<typeof EquipamentosBiometricosTable>[0]["coletasAtivas"][number];
type StatusListenerOnline =
  Parameters<typeof EquipamentosBiometricosTable>[0]["statusListenerOnline"];

type AbaEquipamentos = "listagem" | "operacoes";

export function EquipamentosPageTabs({
  equipamentos,
  coletasAtivas,
  statusListenerOnline,
  orgaoId,
}: {
  equipamentos: EquipamentoItem[];
  coletasAtivas: ColetaAtivaItem[];
  statusListenerOnline: StatusListenerOnline;
  orgaoId?: string | null;
}) {
  const [aba, setAba] = useState<AbaEquipamentos>("listagem");
  const router = useRouter();
  const metricas = calcularMetricas(equipamentos, coletasAtivas);
  const novoEquipamentoHref = orgaoId
    ? `/equipamentos/novo?${new URLSearchParams({ orgaoId }).toString()}`
    : "/equipamentos/novo";

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, 15000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <Tabs
      value={aba}
      onValueChange={(value) => setAba(value as AbaEquipamentos)}
      className="space-y-4"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <MetricaCard
          icon={Cpu}
          titulo={
            aba === "operacoes"
              ? "Equipamentos monitorados"
              : "Total de equipamentos"
          }
          valor={equipamentos.length.toLocaleString("pt-BR")}
          detalhe="+ 2 no ultimo mes"
          tom="blue"
        />
        <MetricaCard
          icon={Wifi}
          titulo="Online"
          valor={metricas.online.toLocaleString("pt-BR")}
          detalhe={`${metricas.percentualOnline}% do total`}
          barra={metricas.percentualOnline}
          tom="green"
        />
        {aba === "operacoes" ? (
          <MetricaCard
            icon={RefreshCw}
            titulo="Coletas em andamento"
            valor={coletasAtivas.length.toLocaleString("pt-BR")}
            detalhe={`${metricas.percentualColetas}% do total`}
            barra={metricas.percentualColetas}
            tom="blue"
          />
        ) : (
          <MetricaCard
            icon={WifiOff}
            titulo="Offline"
            valor={metricas.offline.toLocaleString("pt-BR")}
            detalhe={`${metricas.percentualOffline}% do total`}
            barra={metricas.percentualOffline}
            tom="red"
          />
        )}
        <MetricaCard
          icon={Clock3}
          titulo={
            aba === "operacoes"
              ? "Reprocessamentos pendentes"
              : "Brutas pendentes"
          }
          valor={metricas.pendentes.toLocaleString("pt-BR")}
          detalhe={
            aba === "operacoes"
              ? `${metricas.comPendencias} equipamento(s)`
              : `em ${metricas.comPendencias} equipamentos`
          }
          tom="amber"
        />
        <MetricaCard
          icon={aba === "operacoes" ? AlertTriangle : Layers3}
          titulo={
            aba === "operacoes"
              ? "Alertas de comunicacao"
              : "Fabricantes / modelos"
          }
          valor={
            aba === "operacoes"
              ? metricas.alertas.toLocaleString("pt-BR")
              : metricas.fabricantes.toLocaleString("pt-BR")
          }
          detalhe={
            aba === "operacoes"
              ? "com atraso > 2 horas"
              : metricas.fabricantesResumo
          }
          tom={aba === "operacoes" ? "red" : "blue"}
        />
        <MetricaCard
          icon={aba === "operacoes" ? UsersRound : AlertTriangle}
          titulo={
            aba === "operacoes"
              ? "Biometrias pendentes"
              : "Alertas de comunicacao"
          }
          valor={
            aba === "operacoes"
              ? metricas.biometriasPendentes.toLocaleString("pt-BR")
              : metricas.alertas.toLocaleString("pt-BR")
          }
          detalhe={
            aba === "operacoes"
              ? "registros nao processados"
              : "com atraso > 2 horas"
          }
          tom={aba === "operacoes" ? "blue" : "red"}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-2 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <TabsList className="flex h-auto justify-start gap-1 bg-transparent p-0">
          <TabsTrigger
            value="listagem"
            className="gap-2 rounded-md px-4 py-2 text-xs font-bold data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800"
          >
            <List className="size-4" />
            Listagem
          </TabsTrigger>
          <TabsTrigger
            value="operacoes"
            className="gap-2 rounded-md px-4 py-2 text-xs font-bold data-[state=active]:bg-blue-50 data-[state=active]:text-blue-800"
          >
            <Settings2 className="size-4" />
            Operacoes dos relogios de ponto
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {aba === "listagem" ? (
            <>
              <Link
                href={novoEquipamentoHref}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-900 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-950"
              >
                <Plus className="size-4" />
                Novo equipamento
              </Link>
              <Link
                href="/afd"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-blue-800 hover:bg-blue-50"
              >
                <Upload className="size-4" />
                Importar
              </Link>
            </>
          ) : (
            <button
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-900 px-4 text-sm font-bold text-white shadow-sm hover:bg-blue-950"
              onClick={() => setAba("operacoes")}
            >
              <Plus className="size-4" />
              Nova operacao
            </button>
          )}
          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-blue-800 hover:bg-blue-50"
          >
            <RefreshCw className="size-4" />
            {aba === "operacoes" ? "Sincronizar agora" : "Sincronizar"}
          </button>
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-md border border-slate-200 bg-white text-blue-800 hover:bg-blue-50"
            aria-label="Mais opcoes"
          >
            <MoreVertical className="size-4" />
          </button>
        </div>
      </div>

      <TabsContent value="listagem">
        <EquipamentosBiometricosTable
          equipamentos={equipamentos}
          coletasAtivas={coletasAtivas}
          statusListenerOnline={statusListenerOnline}
          orgaoId={orgaoId}
        />
      </TabsContent>

      <TabsContent value="operacoes">
        <RelogioPontoAdminPanel
          equipamentos={equipamentos}
          coletasAtivas={coletasAtivas}
          statusListenerOnline={statusListenerOnline}
        />
      </TabsContent>
    </Tabs>
  );
}

function calcularMetricas(
  equipamentos: EquipamentoItem[],
  coletasAtivas: ColetaAtivaItem[],
) {
  const agora = Date.now();
  const total = Math.max(equipamentos.length, 1);
  let online = 0;
  let offline = 0;
  let alertas = 0;
  let pendentes = 0;
  let comPendencias = 0;
  const fabricantes = new Set<string>();

  for (const equipamento of equipamentos) {
    const datas = [equipamento.ultimoHeartbeatEm, equipamento.ultimaSincronizacaoEm]
      .filter((data): data is Date => Boolean(data))
      .map((data) => new Date(data).getTime());
    const ultima = datas.length > 0 ? Math.max(...datas) : 0;
    const minutos = ultima ? (agora - ultima) / 60000 : Number.POSITIVE_INFINITY;
    const pendentesEquipamento =
      equipamento.estatisticasMarcacoes?.marcacoesPendentes ?? 0;

    if (equipamento.fabricante) fabricantes.add(equipamento.fabricante);
    if (pendentesEquipamento > 0) comPendencias += 1;
    pendentes += pendentesEquipamento;
    if (minutos <= 5 && equipamento.ativo) online += 1;
    if (minutos > 30 || !equipamento.ativo) offline += 1;
    if (minutos > 120 || !equipamento.ativo) alertas += 1;
  }

  return {
    online,
    offline,
    alertas,
    pendentes,
    comPendencias,
    fabricantes: fabricantes.size,
    fabricantesResumo: Array.from(fabricantes).slice(0, 3).join(", ") || "-",
    biometriasPendentes: pendentes,
    percentualOnline: Math.round((online / total) * 100),
    percentualOffline: Math.round((offline / total) * 100),
    percentualColetas: Math.round((coletasAtivas.length / total) * 100),
  };
}

function MetricaCard({
  icon: Icon,
  titulo,
  valor,
  detalhe,
  barra,
  tom,
}: {
  icon: LucideIcon;
  titulo: string;
  valor: string;
  detalhe: string;
  barra?: number;
  tom: "blue" | "green" | "red" | "amber";
}) {
  const estilos = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
  } satisfies Record<typeof tom, string>;
  const barras = {
    blue: "bg-blue-600",
    green: "bg-emerald-500",
    red: "bg-red-500",
    amber: "bg-amber-500",
  } satisfies Record<typeof tom, string>;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`flex size-11 items-center justify-center rounded-lg ${estilos[tom]}`}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-slate-600">{titulo}</p>
          <p className="mt-1 text-2xl font-black leading-none text-blue-950">
            {valor}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
            {detalhe}
          </p>
        </div>
      </div>
      {typeof barra === "number" && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${barras[tom]}`}
            style={{ width: `${Math.max(0, Math.min(barra, 100))}%` }}
          />
        </div>
      )}
    </div>
  );
}
