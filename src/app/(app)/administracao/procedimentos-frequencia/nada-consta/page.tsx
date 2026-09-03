import Link from "next/link";
import { ArrowLeft, FileCheck2 } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import {
  obterEscopoOrgaoDaSessao,
  whereOrgaoPermitido,
} from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { emitirNadaConstaFrequenciaAction } from "@/modules/procedimentos-frequencia/application/actions/emitir-nada-consta-frequencia.action";
import type { NadaConstaFrequenciaResumo } from "@/modules/procedimentos-frequencia/application/actions/emitir-nada-consta-frequencia.action";
import { NadaConstaFrequenciaForm } from "@/modules/procedimentos-frequencia/presentation/components/nada-consta-frequencia-form";
import { NadaConstaPdfButton } from "@/modules/procedimentos-frequencia/presentation/components/nada-consta-pdf-button";
import { prisma } from "@/shared/infrastructure/database/prisma";

function resumoDaExecucao(execucao: {
  id: string;
  criadoEm: Date;
  dataInicio: Date | null;
  dataFim: Date | null;
  processoSei: string | null;
  justificativa: string;
  dadosResultado: unknown;
  resultado: string | null;
  servidor: {
    matricula: string;
    nomeFuncional: string | null;
    nomeCompletoSarh: string | null;
    usuario: { nome: string };
    cargo?: { descricao: string } | null;
    lotacoes: {
      cargo?: { descricao: string } | null;
      unidade: { sigla: string; nome: string };
    }[];
  } | null;
  orgao: { sigla: string; nome: string };
}): NadaConstaFrequenciaResumo | null {
  const dados =
    execucao.dadosResultado && typeof execucao.dadosResultado === "object"
      ? (execucao.dadosResultado as Record<string, unknown>)
      : null;

  if (!dados || !execucao.servidor) {
    return null;
  }
  const dataInicio =
    typeof dados.dataInicio === "string"
      ? dados.dataInicio
      : (execucao.dataInicio ?? execucao.criadoEm).toISOString().slice(0, 10);
  const dataFim =
    typeof dados.dataFim === "string"
      ? dados.dataFim
      : (execucao.dataFim ?? execucao.criadoEm).toISOString().slice(0, 10);

  return {
    execucaoId: execucao.id,
    servidorNome:
      execucao.servidor.nomeFuncional ??
      execucao.servidor.nomeCompletoSarh ??
      execucao.servidor.usuario.nome,
    servidorMatricula: execucao.servidor.matricula,
    orgaoSigla: execucao.orgao.sigla,
    secaoJudiciaria: execucao.orgao.nome,
    unidadeSigla: execucao.servidor.lotacoes[0]?.unidade.sigla ?? null,
    cargoDescricao:
      execucao.servidor.cargo?.descricao ??
      execucao.servidor.lotacoes[0]?.cargo?.descricao ??
      null,
    processoSei: execucao.processoSei,
    justificativa: execucao.justificativa,
    dataInicio,
    dataFim,
    emitidoEm:
      typeof dados.emitidoEm === "string"
        ? dados.emitidoEm
        : execucao.criadoEm.toISOString(),
    diasPrevistosTrabalho: Number(dados.diasPrevistosTrabalho ?? 0),
    diasTrabalhadosRegistrados: Number(dados.diasTrabalhadosRegistrados ?? 0),
    afastamentosNoPeriodo: Number(dados.afastamentosNoPeriodo ?? 0),
    saldoBancoHorasMinutos: Number(dados.saldoBancoHorasMinutos ?? 0),
    debitosVencidosMinutos: Number(dados.debitosVencidosMinutos ?? 0),
    faltasNaoResolvidas: Number(dados.faltasNaoResolvidas ?? 0),
    pendenciasHomologacao: Number(dados.pendenciasHomologacao ?? 0),
    resultado:
      dados.resultado === "NADA_CONSTA" ? "NADA_CONSTA" : "COM_PENDENCIAS",
    mensagem:
      execucao.resultado ?? "Resultado registrado no motor de procedimentos.",
  };
}

export default async function NadaConstaFrequenciaPage() {
  await exigirUmaDasPermissoesOuRedirecionar([
    "procedimentos-frequencia:emitir-nada-consta:seccional",
    "procedimentos-frequencia:emitir-nada-consta:global",
  ]);

  const escopo = await obterEscopoOrgaoDaSessao();
  const servidores = await prisma.servidor.findMany({
    where: {
      ativo: true,
      orgao: whereOrgaoPermitido(escopo),
      usuario: {
        ativo: true,
      },
    },
    select: {
      id: true,
      matricula: true,
      nomeFuncional: true,
      nomeCompletoSarh: true,
      usuario: {
        select: {
          nome: true,
        },
      },
      orgao: {
        select: {
          sigla: true,
          nome: true,
        },
      },
      lotacoes: {
        where: { status: "ATIVO" },
        orderBy: { dataInicio: "desc" },
        take: 1,
        select: {
          unidade: {
            select: {
              sigla: true,
            },
          },
        },
      },
    },
    orderBy: [{ matricula: "asc" }],
  });

  const ultimasExecucoes =
    await prisma.procedimentoAdministrativoFrequenciaExecucao.findMany({
      where: {
        procedimento: {
          categoria: "NADA_CONSTA",
        },
        orgao: whereOrgaoPermitido(escopo),
      },
      include: {
        servidor: {
          select: {
            matricula: true,
            nomeFuncional: true,
            nomeCompletoSarh: true,
            cargo: {
              select: { descricao: true },
            },
            usuario: {
              select: { nome: true },
            },
            lotacoes: {
              where: { status: "ATIVO" },
              orderBy: { dataInicio: "desc" },
              take: 1,
              select: {
                cargo: {
                  select: { descricao: true },
                },
                unidade: {
                  select: {
                    sigla: true,
                    nome: true,
                  },
                },
              },
            },
          },
        },
        orgao: {
          select: { sigla: true, nome: true },
        },
      },
      orderBy: { criadoEm: "desc" },
      take: 12,
    });

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          {
            label: "Procedimentos de frequência",
            href: "/administracao/procedimentos-frequencia",
          },
          { label: "Nada Consta" },
        ]}
      />

      <PageHeader
        icon={FileCheck2}
        titulo="Nada Consta de frequência"
        descricao="Execute a verificação consolidada do servidor e registre a emissão como procedimento administrativo parametrizado por seccional."
      />

      <Link
        href="/administracao/procedimentos-frequencia"
        className="inline-flex items-center gap-2 text-sm font-semibold text-blue-900 hover:underline dark:text-blue-300"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Voltar para procedimentos
      </Link>

      <NadaConstaFrequenciaForm
        action={emitirNadaConstaFrequenciaAction}
        servidores={servidores.map((servidor) => ({
          id: servidor.id,
          matricula: servidor.matricula,
          nome:
            servidor.nomeFuncional ??
            servidor.nomeCompletoSarh ??
            servidor.usuario.nome,
          orgaoSigla: servidor.orgao.sigla,
          unidadeSigla: servidor.lotacoes[0]?.unidade.sigla ?? null,
        }))}
      />

      <section className="rounded-lg border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
        <h2 className="text-lg font-black">Últimas emissões</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b text-xs uppercase text-[var(--muted-foreground)]">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Servidor</th>
                <th className="px-3 py-2">Órgão</th>
                <th className="px-3 py-2">Processo SEI</th>
                <th className="px-3 py-2">Resultado</th>
                <th className="px-3 py-2 text-right">Exportar</th>
              </tr>
            </thead>
            <tbody>
              {ultimasExecucoes.map((execucao) => {
                const resumo = resumoDaExecucao(execucao);

                return (
                  <tr key={execucao.id} className="border-b last:border-b-0">
                    <td className="px-3 py-3">
                      {execucao.criadoEm.toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-3 py-3">
                      {execucao.servidor?.matricula} -{" "}
                      {execucao.servidor?.nomeFuncional ??
                        execucao.servidor?.nomeCompletoSarh ??
                        execucao.servidor?.usuario.nome}
                    </td>
                    <td className="px-3 py-3">{execucao.orgao.sigla}</td>
                    <td className="px-3 py-3">{execucao.processoSei}</td>
                    <td className="px-3 py-3">
                      {resumo?.resultado === "NADA_CONSTA"
                        ? "Nada consta"
                        : "Constam pendências"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {resumo ? (
                        <NadaConstaPdfButton
                          resumo={resumo}
                          emitidoEm={execucao.criadoEm}
                          processoSei={execucao.processoSei}
                        />
                      ) : (
                        <span className="text-xs text-[var(--muted-foreground)]">
                          Indisponível
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {ultimasExecucoes.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-[var(--muted-foreground)]"
                  >
                    Nenhuma emissão registrada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
