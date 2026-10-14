"use client";

import * as ContextMenu from "@radix-ui/react-context-menu";
import {
  BriefcaseBusiness,
  CalendarCheck2,
  CalendarOff,
  ChevronRight,
  Clock3,
  FilePlus2,
  FileText,
  Gauge,
  GraduationCap,
  Pencil,
  Repeat2,
  ShieldCheck,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState, type MouseEvent, type ReactNode } from "react";

import type { AnaliseJornadaMctDto } from "@/modules/mct/application/dtos/analise-jornada.dto";
import { AnaliseJornadaDrawer } from "@/modules/mct/presentation/components/analise-jornada-drawer";
import { tiposSolicitacao } from "@/modules/solicitacoes/application/schemas/solicitacao.schema";
import { rotuloTipoSolicitacao } from "@/modules/solicitacoes/application/services/fluxo-solicitacao.service";

type TipoSolicitacao = (typeof tiposSolicitacao)[number];

const iconesPorTipoSolicitacao: Record<TipoSolicitacao, LucideIcon> = {
  AJUSTE_PONTO: Pencil,
  EXCLUSAO_MARCACAO: Trash2,
  COMPENSACAO: Repeat2,
  ABONO_JUSTIFICATIVA: FileText,
  ATIVIDADE_EXTERNA: BriefcaseBusiness,
  VIAGEM_SERVICO: BriefcaseBusiness,
  CAPACITACAO: GraduationCap,
  HORA_CREDITO_PREVIA: Clock3,
  DISPENSA_PONTO: CalendarOff,
  FOLGA_BANCO_HORAS: ShieldCheck,
  CONVERSAO_DIA_ESPECIAL_BANCO_HORAS: CalendarCheck2,
  CONVERSAO_EXCEDENTE_BANCO_HORAS: Gauge,
};

const descricoesPorTipoSolicitacao: Record<TipoSolicitacao, string> = {
  AJUSTE_PONTO: "Corrija ou ajuste marcações de ponto.",
  EXCLUSAO_MARCACAO: "Solicite à chefia o cancelamento desta marcação.",
  COMPENSACAO: "Compense horas de trabalho.",
  ABONO_JUSTIFICATIVA: "Registre um abono ou justificativa.",
  ATIVIDADE_EXTERNA: "Registre atividades realizadas fora da unidade.",
  VIAGEM_SERVICO: "Registre uma viagem a serviço.",
  CAPACITACAO: "Registre participação em capacitações.",
  DISPENSA_PONTO: "Solicite dispensa do registro de ponto.",
  HORA_CREDITO_PREVIA: "Solicite autorização para realizar hora-crédito.",
  FOLGA_BANCO_HORAS: "Solicite folga utilizando o banco de horas.",
  CONVERSAO_DIA_ESPECIAL_BANCO_HORAS:
    "Solicite a conversão do trabalho realizado em dia especial para o banco de horas.",
  CONVERSAO_EXCEDENTE_BANCO_HORAS:
    "Solicite a conversão das horas excedentes deste dia em crédito no banco de horas.",
};

const grupos: Array<{
  titulo: string;
  icon: LucideIcon;
  tipos: TipoSolicitacao[];
}> = [
  {
    titulo: "Ajustes de ponto",
    icon: Clock3,
    tipos: ["AJUSTE_PONTO", "COMPENSACAO", "ABONO_JUSTIFICATIVA"],
  },
  {
    titulo: "Ocorrências e atividades",
    icon: BriefcaseBusiness,
    tipos: [
      "ATIVIDADE_EXTERNA",
      "VIAGEM_SERVICO",
      "CAPACITACAO",
      "DISPENSA_PONTO",
    ],
  },
  {
    titulo: "Banco de horas",
    icon: Clock3,
    tipos: [
      "CONVERSAO_DIA_ESPECIAL_BANCO_HORAS",
      "CONVERSAO_EXCEDENTE_BANCO_HORAS",
      "HORA_CREDITO_PREVIA",
      "FOLGA_BANCO_HORAS",
    ],
  },
];

const menuContentClassName =
  "z-50 overflow-hidden rounded-md border bg-[var(--card)] p-1 text-sm text-[var(--card-foreground)] shadow-floating";
const menuItemClassName =
  "flex min-h-9 cursor-default items-center gap-2 rounded-sm px-2 py-1.5 outline-none transition hover:bg-[var(--muted)] focus:bg-[var(--muted)] data-[state=open]:bg-[var(--muted)]";

function abrirContextoNoClique(event: MouseEvent<HTMLButtonElement>) {
  const trigger = event.currentTarget;
  const rect = trigger.getBoundingClientRect();

  window.setTimeout(() => {
    trigger.dispatchEvent(
      new globalThis.MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.bottom,
      }),
    );
  }, 0);
}

function SubmenuSolicitacoes({
  dataReferencia,
  servidorId,
}: {
  dataReferencia: string;
  servidorId?: string;
}) {
  return (
    <ContextMenu.Sub>
      <ContextMenu.SubTrigger className={menuItemClassName}>
        <FilePlus2 className="size-4" aria-hidden="true" />
        <span className="min-w-0 flex-1">Criar solicitação</span>
        <ChevronRight className="size-4" aria-hidden="true" />
      </ContextMenu.SubTrigger>
      <ContextMenu.Portal>
        <ContextMenu.SubContent className={`${menuContentClassName} w-56`}>
          {grupos.map((grupo) => {
            const GrupoIcon = grupo.icon;
            return (
              <ContextMenu.Sub key={grupo.titulo}>
                <ContextMenu.SubTrigger className={menuItemClassName}>
                  <GrupoIcon className="size-4" aria-hidden="true" />
                  <span className="min-w-0 flex-1">{grupo.titulo}</span>
                  <ChevronRight className="size-4" aria-hidden="true" />
                </ContextMenu.SubTrigger>
                <ContextMenu.Portal>
                  <ContextMenu.SubContent
                    className={`${menuContentClassName} w-64`}
                  >
                    {grupo.tipos.map((tipo) => {
                      const Icone = iconesPorTipoSolicitacao[tipo];
                      const params = new URLSearchParams({
                        tipo,
                        dataReferencia,
                        passo: "3",
                      });
                      if (servidorId) params.set("servidorId", servidorId);
                      return (
                        <ContextMenu.Item key={tipo} asChild>
                          <Link
                            href={`/solicitacoes/nova?${params.toString()}`}
                            title={descricoesPorTipoSolicitacao[tipo]}
                            className={`${menuItemClassName} cursor-pointer`}
                          >
                            <Icone
                              className="size-4 shrink-0"
                              aria-hidden="true"
                            />
                            <span className="min-w-0 flex-1 truncate">
                              {rotuloTipoSolicitacao(tipo)}
                            </span>
                          </Link>
                        </ContextMenu.Item>
                      );
                    })}
                  </ContextMenu.SubContent>
                </ContextMenu.Portal>
              </ContextMenu.Sub>
            );
          })}
        </ContextMenu.SubContent>
      </ContextMenu.Portal>
    </ContextMenu.Sub>
  );
}

export function SolicitacaoAjusteDiaContextMenu({
  dataReferencia,
  marcacaoId,
  marcacaoDescricao,
  children,
  className,
  analiseMct,
  servidorId,
}: {
  dataReferencia: string;
  marcacaoId?: string;
  marcacaoDescricao?: string;
  children?: ReactNode;
  className?: string;
  analiseMct?: AnaliseJornadaMctDto;
  servidorId?: string;
}) {
  const [analiseAberta, setAnaliseAberta] = useState(false);
  const exclusaoParams = marcacaoId
    ? new URLSearchParams({
        tipo: "EXCLUSAO_MARCACAO",
        dataReferencia,
        marcacaoId,
        marcacaoDescricao: marcacaoDescricao ?? "Marcação selecionada",
        passo: "3",
      })
    : null;
  if (exclusaoParams && servidorId) {
    exclusaoParams.set("servidorId", servidorId);
  }

  return (
    <>
      <ContextMenu.Root modal={false}>
        <ContextMenu.Trigger asChild>
          <button
            type="button"
            className={[
              "inline-flex min-h-8 w-full items-center justify-center gap-2 rounded-sm text-left text-sm font-medium text-foreground transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--primary)] data-[state=open]:bg-[color-mix(in_srgb,var(--primary)_16%,transparent)]",
              className,
            ]
              .filter(Boolean)
              .join(" ")}
            title={
              marcacaoId ? "Abrir ações da marcação" : "Abrir ações do dia"
            }
            onClick={abrirContextoNoClique}
          >
            {children ?? (
              <>
                <CalendarCheck2 className="size-5" aria-hidden="true" />
                <span>Ações do dia</span>
              </>
            )}
          </button>
        </ContextMenu.Trigger>
        <ContextMenu.Portal>
          <ContextMenu.Content className={`${menuContentClassName} w-64`}>
            <ContextMenu.Item
              className={`${menuItemClassName} cursor-pointer`}
              onSelect={() => {
                window.setTimeout(() => setAnaliseAberta(true), 0);
              }}
            >
              <Gauge className="size-4" aria-hidden="true" />
              <span className="flex-1">Analisar jornada</span>
            </ContextMenu.Item>
            <ContextMenu.Separator className="my-1 h-px bg-[var(--border)]" />
            {exclusaoParams ? (
              <ContextMenu.Item asChild>
                <Link
                  href={`/solicitacoes/nova?${exclusaoParams.toString()}`}
                  className={`${menuItemClassName} cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-950/40`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  <span className="flex-1">Solicitar exclusão da marcação</span>
                </Link>
              </ContextMenu.Item>
            ) : (
              <ContextMenu.Item
                disabled
                className={`${menuItemClassName} text-[var(--muted-foreground)] opacity-50`}
                title="Selecione uma marcação para solicitar sua exclusão"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                <span className="flex-1">Solicitar exclusão da marcação</span>
              </ContextMenu.Item>
            )}
            <ContextMenu.Separator className="my-1 h-px bg-[var(--border)]" />
            <SubmenuSolicitacoes
              dataReferencia={dataReferencia}
              servidorId={servidorId}
            />
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu.Root>
      <AnaliseJornadaDrawer
        aberto={analiseAberta}
        onAbertoChange={setAnaliseAberta}
        dataReferencia={dataReferencia}
        analise={analiseMct}
        servidorId={servidorId}
      />
    </>
  );
}
