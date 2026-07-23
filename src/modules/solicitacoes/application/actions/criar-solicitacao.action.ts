"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  PeriodoHomologadoError,
  verificarPeriodoHomologado,
} from "@/modules/boletim-frequencia/application/services/bloquear-periodo-homologado.service";
import { resolverChefiaResponsavelDaUnidade } from "@/modules/chefias/application/services/resolver-chefia.service";
import {
  EspelhoEnviadoParaHomologacaoError,
  verificarEspelhoEnviadoParaHomologacao,
} from "@/modules/homologacao/application/services/bloquear-espelho-enviado.service";
import { dataHoraLocalParaUtc } from "@/modules/marcacoes/application/services/data-marcacao.service";
import { resolverFusoHorarioServidor } from "@/modules/servidores/application/services/fuso-horario-servidor.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import { buscarServidorSolicitantePorUsuarioId } from "../../infrastructure/repositories/solicitacao.repository";
import {
  criarSolicitacaoSchema,
  tiposSolicitacao,
  type CriarSolicitacaoFormState,
  type CriarSolicitacaoInput,
} from "../schemas/solicitacao.schema";
import {
  listarDatasImpactadasSolicitacao,
  TIPOS_SOLICITACAO_COM_RECALCULO_APOS_DEFERIMENTO,
} from "../services/periodo-solicitacao.service";
import {
  PrazoAjustePontoExpiradoError,
  verificarPrazoAjustePontoComCalendario,
} from "../services/verificar-prazo-ajuste-ponto.service";

type TipoSolicitacao = CriarSolicitacaoInput["tipo"];

function valorOpcionalData(valor: string | undefined) {
  if (!valor) return null;

  return new Date(`${valor}T00:00:00`);
}

function dataReferenciaFormulario(valor: string) {
  return new Date(`${valor}T00:00:00.000Z`);
}

function proximaDataReferenciaFormulario(valor: string) {
  const data = dataReferenciaFormulario(valor);
  data.setUTCDate(data.getUTCDate() + 1);
  return data;
}

function valorOpcionalDateTime(
  valor: string | undefined,
  fusoHorario?: string | null,
) {
  if (!valor) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return dataHoraLocalParaUtc({
      dataReferencia: dataReferenciaFormulario(valor),
      hora: "00:00",
      fusoHorario,
    });
  }

  const [data, hora = "00:00"] = valor.split("T");

  return dataHoraLocalParaUtc({
    dataReferencia: dataReferenciaFormulario(data),
    hora,
    fusoHorario,
  });
}

function valorOpcionalFimPeriodo(
  valor: string | undefined,
  fusoHorario?: string | null,
) {
  if (valor && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return dataHoraLocalParaUtc({
      dataReferencia: proximaDataReferenciaFormulario(valor),
      hora: "00:00",
      fusoHorario,
    });
  }

  return valorOpcionalDateTime(valor, fusoHorario);
}

function normalizarTipoSolicitacao(
  valor: FormDataEntryValue | null,
): TipoSolicitacao | undefined {
  const tipo = String(valor ?? "");

  return tiposSolicitacao.includes(tipo as TipoSolicitacao)
    ? (tipo as TipoSolicitacao)
    : undefined;
}

function extrairDados(formData: FormData): Partial<CriarSolicitacaoInput> {
  return {
    tipo: normalizarTipoSolicitacao(formData.get("tipo")),
    titulo: String(formData.get("titulo") ?? "").trim(),
    descricao: String(formData.get("descricao") ?? "").trim(),
    dataReferencia: String(formData.get("dataReferencia") ?? ""),
    dataInicio: String(formData.get("dataInicio") ?? ""),
    dataFim: String(formData.get("dataFim") ?? ""),
    tipoMarcacao: String(formData.get("tipoMarcacao") ?? ""),
    horaAjuste: String(formData.get("horaAjuste") ?? ""),
    tipoCompensacao: String(formData.get("tipoCompensacao") ?? "") as
      | CriarSolicitacaoInput["tipoCompensacao"]
      | "",
    horasSolicitadas: formData.get("horasSolicitadas")
      ? Number(formData.get("horasSolicitadas"))
      : undefined,
    regimeTrabalhoRemotoTipo: String(
      formData.get("regimeTrabalhoRemotoTipo") ?? "NAO_SE_APLICA",
    ) as CriarSolicitacaoInput["regimeTrabalhoRemotoTipo"],
    diasRemotos: formData
      .getAll("diasRemotos")
      .map((valor) => String(valor)) as CriarSolicitacaoInput["diasRemotos"],
    modalidadeCapacitacao: String(
      formData.get("modalidadeCapacitacao") ?? "",
    ) as CriarSolicitacaoInput["modalidadeCapacitacao"],
  };
}

export async function criarSolicitacaoAction(
  _estadoAnterior: CriarSolicitacaoFormState,
  formData: FormData,
): Promise<CriarSolicitacaoFormState> {
  const session = await auth();

  if (!session?.user) {
    return {
      sucesso: false,
      mensagem: "Sessão expirada. Faça login novamente.",
    };
  }

  const permissoes = session.user.perfilAtivo?.permissoes ?? [];

  if (!permissoes.includes("solicitacoes:criar:proprio")) {
    return {
      sucesso: false,
      mensagem: "Você não possui permissão para criar solicitações.",
    };
  }

  const dados = extrairDados(formData);
  const parsed = criarSolicitacaoSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os campos da solicitação.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const servidor = await buscarServidorSolicitantePorUsuarioId(session.user.id);

  if (!servidor) {
    return {
      sucesso: false,
      mensagem:
        "Nenhum servidor ativo foi encontrado para o usuário autenticado.",
      campos: dados,
    };
  }

  const lotacaoAtual = servidor.lotacoes[0];

  if (!lotacaoAtual) {
    return {
      sucesso: false,
      mensagem:
        "Servidor sem lotação ativa. Não foi possível identificar a chefia responsável.",
      campos: dados,
    };
  }

  const chefiaResolvida = await resolverChefiaResponsavelDaUnidade(
    lotacaoAtual.unidadeId,
  );
  const fusoHorario = resolverFusoHorarioServidor(servidor);
  const dataReferencia = valorOpcionalData(parsed.data.dataReferencia);
  const dataInicio = valorOpcionalDateTime(parsed.data.dataInicio, fusoHorario);
  const dataFim = valorOpcionalFimPeriodo(parsed.data.dataFim, fusoHorario);

  if (parsed.data.tipo === "AJUSTE_PONTO" && parsed.data.dataReferencia) {
    if (dataReferencia) {
      try {
        await verificarPeriodoHomologado({
          servidorId: servidor.id,
          dataReferencia,
        });
        await verificarPrazoAjustePontoComCalendario({
          dataReferencia,
          orgaoId: servidor.orgaoId,
        });
      } catch (error) {
        if (error instanceof PeriodoHomologadoError) {
          return {
            sucesso: false,
            mensagem:
              "Este periodo ja foi homologado. A correcao da marcacao depende de reabertura administrativa formal.",
            campos: dados,
          };
        }

        if (error instanceof PrazoAjustePontoExpiradoError) {
          return {
            sucesso: false,
            mensagem:
              "O prazo regulamentar para correcao da marcacao ja expirou para essa competencia.",
            campos: dados,
          };
        }

        throw error;
      }
    }
  }

  if (
    TIPOS_SOLICITACAO_COM_RECALCULO_APOS_DEFERIMENTO.includes(
      parsed.data.tipo,
    )
  ) {
    const datasImpactadas = listarDatasImpactadasSolicitacao(
      { dataReferencia, dataInicio, dataFim },
      fusoHorario,
    );
    const competenciasVerificadas = new Set<string>();

    try {
      for (const dataImpactada of datasImpactadas) {
        const chaveCompetencia = `${dataImpactada.getUTCFullYear()}-${String(
          dataImpactada.getUTCMonth() + 1,
        ).padStart(2, "0")}`;

        if (competenciasVerificadas.has(chaveCompetencia)) {
          continue;
        }

        competenciasVerificadas.add(chaveCompetencia);
        await verificarEspelhoEnviadoParaHomologacao({
          servidorId: servidor.id,
          dataReferencia: dataImpactada,
        });
      }
    } catch (error) {
      if (error instanceof EspelhoEnviadoParaHomologacaoError) {
        return {
          sucesso: false,
          mensagem: error.message,
          campos: dados,
        };
      }

      throw error;
    }
  }

  const solicitacao = await prisma.$transaction(async (tx) => {
    const novaSolicitacao = await tx.solicitacao.create({
      data: {
        servidorId: servidor.id,
        usuarioSolicitanteId: session.user.id,
        unidadeId: lotacaoAtual.unidadeId,
        chefiaResponsavelId: chefiaResolvida?.gestorUnidadeId ?? null,
        tipo: parsed.data.tipo,
        status: "ENVIADA",
        titulo: parsed.data.titulo,
        descricao: parsed.data.descricao,
        dataReferencia,
        dataInicio,
        dataFim,
        dadosSolicitados: {
          tipoMarcacao: parsed.data.tipoMarcacao || null,
          horaAjuste: parsed.data.horaAjuste || null,
          tipoCompensacao: parsed.data.tipoCompensacao || null,
          horasSolicitadas: parsed.data.horasSolicitadas ?? null,
          minutosSolicitados: parsed.data.horasSolicitadas
            ? Math.round(parsed.data.horasSolicitadas * 60)
            : null,
          modalidadeCapacitacao:
            parsed.data.tipo === "CAPACITACAO"
              ? parsed.data.modalidadeCapacitacao
              : null,
          regimeTrabalhoRemoto:
            parsed.data.tipo === "DISPENSA_PONTO" &&
            parsed.data.regimeTrabalhoRemotoTipo !== "NAO_SE_APLICA"
              ? {
                  tipo: parsed.data.regimeTrabalhoRemotoTipo,
                  diasRemotos:
                    parsed.data.regimeTrabalhoRemotoTipo === "TOTAL"
                      ? []
                      : parsed.data.diasRemotos,
                }
              : null,
          lotacaoAtual: {
            unidadeId: lotacaoAtual.unidadeId,
            unidadeSigla: lotacaoAtual.unidade.sigla,
          },
          chefiaResolvida: chefiaResolvida ?? null,
        },
      },
    });

    await tx.solicitacaoEvento.create({
      data: {
        solicitacaoId: novaSolicitacao.id,
        usuarioId: session.user.id,
        tipo: "CRIADA",
        descricao: "Solicitação criada e enviada para análise.",
        metadados: {
          status: "ENVIADA",
        },
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: session.user.id,
        entidade: "Solicitacao",
        entidadeId: novaSolicitacao.id,
        acao: "SOLICITACAO_CRIADA",
        dadosDepois: {
          id: novaSolicitacao.id,
          tipo: novaSolicitacao.tipo,
          status: novaSolicitacao.status,
          servidorId: novaSolicitacao.servidorId,
          unidadeId: novaSolicitacao.unidadeId,
          chefiaResponsavelId: novaSolicitacao.chefiaResponsavelId,
        },
      },
    });

    return novaSolicitacao;
  });

  revalidatePath("/solicitacoes");
  redirect(`/solicitacoes/${solicitacao.id}`);
}
