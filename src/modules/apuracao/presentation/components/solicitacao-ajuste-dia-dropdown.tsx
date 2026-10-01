"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  BriefcaseBusiness,
  CalendarCheck2,
  CalendarOff,
  ChevronDown,
  ChevronRight,
  Clock3,
  FilePlus2,
  FileText,
  GraduationCap,
  Pencil,
  Repeat2,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { tiposSolicitacao } from "@/modules/solicitacoes/application/schemas/solicitacao.schema";
import { rotuloTipoSolicitacao } from "@/modules/solicitacoes/application/services/fluxo-solicitacao.service";

type TipoSolicitacao = (typeof tiposSolicitacao)[number];

const iconesPorTipoSolicitacao: Record<TipoSolicitacao, LucideIcon> = {
  AJUSTE_PONTO: Pencil,
  COMPENSACAO: Repeat2,
  ABONO_JUSTIFICATIVA: FileText,
  ATIVIDADE_EXTERNA: BriefcaseBusiness,
  VIAGEM_SERVICO: BriefcaseBusiness,
  CAPACITACAO: GraduationCap,
  HORA_CREDITO_PREVIA: Clock3,
  DISPENSA_PONTO: CalendarOff,
  FOLGA_BANCO_HORAS: ShieldCheck,
};

const descricoesPorTipoSolicitacao: Record<TipoSolicitacao, string> = {
  AJUSTE_PONTO: "Corrija ou ajuste marcações de ponto.",
  COMPENSACAO: "Compense horas de trabalho.",
  ABONO_JUSTIFICATIVA: "Registre um abono ou justificativa.",
  ATIVIDADE_EXTERNA: "Registre atividades realizadas fora da unidade.",
  VIAGEM_SERVICO: "Registre uma viagem a serviço.",
  CAPACITACAO: "Registre participação em capacitações.",
  DISPENSA_PONTO: "Solicite dispensa do registro de ponto.",
  HORA_CREDITO_PREVIA: "Solicite autorização para realizar hora-crédito.",
  FOLGA_BANCO_HORAS: "Solicite folga utilizando o banco de horas.",
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
    tipos: ["HORA_CREDITO_PREVIA", "FOLGA_BANCO_HORAS"],
  },
];

const menuContentClassName =
  "z-50 overflow-hidden rounded-md border bg-[var(--card)] p-1 text-sm text-[var(--card-foreground)] shadow-floating";

const menuItemClassName =
  "flex min-h-9 cursor-default items-center gap-2 rounded-sm px-2 py-1.5 outline-none transition hover:bg-[var(--muted)] focus:bg-[var(--muted)] data-[state=open]:bg-[var(--muted)]";

export function SolicitacaoAjusteDiaDropdown({
  dataReferencia,
  children,
  className,
}: {
  dataReferencia: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={[
            "inline-flex min-h-8 w-full items-center justify-center gap-2 rounded-md text-left text-sm font-medium text-foreground transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          title="Abrir opções de solicitação"
        >
          {children ?? (
            <>
              <CalendarCheck2 className="size-5" aria-hidden="true" />
              <span>Solicitação de ajuste</span>
              <ChevronDown className="ml-auto size-4" aria-hidden="true" />
            </>
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          className={`${menuContentClassName} w-52`}
        >
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger className={menuItemClassName}>
              <span className="grid size-4 place-items-center">
                <FilePlus2 className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">Criar solicitação</span>
              <ChevronRight className="size-4" aria-hidden="true" />
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent className={`${menuContentClassName} w-56`}>
                {grupos.map((grupo) => {
                  const GrupoIcon = grupo.icon;

                  return (
                    <DropdownMenu.Sub key={grupo.titulo}>
                      <DropdownMenu.SubTrigger className={menuItemClassName}>
                        <span className="grid size-4 place-items-center">
                          <GrupoIcon className="size-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">{grupo.titulo}</span>
                        <ChevronRight className="size-4" aria-hidden="true" />
                      </DropdownMenu.SubTrigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.SubContent className={`${menuContentClassName} w-64`}>
                          {grupo.tipos.map((tipo) => {
                            const Icone = iconesPorTipoSolicitacao[tipo];
                            const params = new URLSearchParams({
                              tipo,
                              dataReferencia,
                              passo: "3",
                            });

                            return (
                              <DropdownMenu.Item key={tipo} asChild>
                                <Link
                                  href={`/solicitacoes/nova?${params.toString()}`}
                                  title={descricoesPorTipoSolicitacao[tipo]}
                                  className={`${menuItemClassName} cursor-pointer`}
                                >
                                  <span className="grid size-4 shrink-0 place-items-center">
                                    <Icone
                                      className="size-4"
                                      aria-hidden="true"
                                    />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate">
                                      {rotuloTipoSolicitacao(tipo)}
                                    </span>
                                  </span>
                                  <ChevronRight
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                  />
                                </Link>
                              </DropdownMenu.Item>
                            );
                          })}
                        </DropdownMenu.SubContent>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Sub>
                  );
                })}
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
