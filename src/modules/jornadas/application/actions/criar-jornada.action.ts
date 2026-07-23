"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import { codigoJornadaExiste } from "../../infrastructure/repositories/jornada.repository";
import {
  diasSemana,
  jornadaSchema,
  tiposJornada,
  tiposFaixaJornada,
  tiposDiaJornada,
  type JornadaFormState,
  type JornadaInput,
} from "../schemas/jornada.schema";

type TipoJornada = JornadaInput["tipo"];

function valorOpcionalString(valor: FormDataEntryValue | null) {
  return String(valor ?? "").trim();
}

function valorOpcionalNumero(valor: FormDataEntryValue | null) {
  const texto = String(valor ?? "").trim();

  return texto.length > 0 ? Number(texto) : null;
}

function valorOpcionalData(valor: FormDataEntryValue | null) {
  const texto = String(valor ?? "").trim();

  return texto ? new Date(`${texto}T00:00:00`) : null;
}

function normalizarTipoJornada(
  valor: FormDataEntryValue | null,
): TipoJornada | undefined {
  const tipo = String(valor ?? "");

  return tiposJornada.includes(tipo as TipoJornada)
    ? (tipo as TipoJornada)
    : undefined;
}

function extrairDadosJornada(formData: FormData): Partial<JornadaInput> {
  const dias = diasSemana.map((diaSemana) => {
    const prefixo = `dias.${diaSemana}`;
    const faixaTrabalhoInicio = valorOpcionalString(
      formData.get(`${prefixo}.faixaTrabalhoInicio`),
    );
    const faixaTrabalhoFim = valorOpcionalString(
      formData.get(`${prefixo}.faixaTrabalhoFim`),
    );
    const faixaNucleoInicio = valorOpcionalString(
      formData.get(`${prefixo}.faixaNucleoInicio`),
    );
    const faixaNucleoFim = valorOpcionalString(
      formData.get(`${prefixo}.faixaNucleoFim`),
    );
    const tipoDiaFormulario = String(
      formData.get(`${prefixo}.tipoDia`) ?? "TRABALHO",
    );
    const tipoDia = tiposDiaJornada.includes(
      tipoDiaFormulario as (typeof tiposDiaJornada)[number],
    )
      ? (tipoDiaFormulario as (typeof tiposDiaJornada)[number])
      : "TRABALHO";
    const faixas = [];

    if (faixaTrabalhoInicio || faixaTrabalhoFim) {
      faixas.push({
        tipo: "TRABALHO" as const,
        horaInicio: faixaTrabalhoInicio,
        horaFim: faixaTrabalhoFim,
        obrigatoria: true,
        cruzaMeiaNoite:
          formData.get(`${prefixo}.cruzaMeiaNoite`) === "on" ||
          formData.get(`${prefixo}.cruzaMeiaNoite`) === "true",
        ordem: 1,
      });
    }

    if (faixaNucleoInicio || faixaNucleoFim) {
      faixas.push({
        tipo: "NUCLEO_OBRIGATORIO" as const,
        horaInicio: faixaNucleoInicio,
        horaFim: faixaNucleoFim,
        obrigatoria: true,
        cruzaMeiaNoite: false,
        ordem: 2,
      });
    }

    return {
      diaSemana,
      tipoDia,
      cargaPrevistaMinutos: valorOpcionalNumero(
        formData.get(`${prefixo}.cargaPrevistaMinutos`),
      ) ?? 0,
      faixas,
    };
  });

  return {
    orgaoId: valorOpcionalString(formData.get("orgaoId")),
    codigo: String(formData.get("codigo") ?? "").trim().toUpperCase(),
    nome: String(formData.get("nome") ?? "").trim(),
    descricao: valorOpcionalString(formData.get("descricao")),
    tipo: normalizarTipoJornada(formData.get("tipo")),
    cargaDiariaMinutos: Number(formData.get("cargaDiariaMinutos") ?? 0),
    cargaSemanalMinutos: valorOpcionalNumero(
      formData.get("cargaSemanalMinutos"),
    ),
    cargaMensalMinutos: valorOpcionalNumero(
      formData.get("cargaMensalMinutos"),
    ),
    cargaMinimaDiariaMinutos: valorOpcionalNumero(
      formData.get("cargaMinimaDiariaMinutos"),
    ),
    cargaMaximaDiariaMinutos: valorOpcionalNumero(
      formData.get("cargaMaximaDiariaMinutos"),
    ),
    controlaHorario:
      formData.get("controlaHorario") === "on" ||
      formData.get("controlaHorario") === "true",
    permiteFlexibilidade:
      formData.get("permiteFlexibilidade") === "on" ||
      formData.get("permiteFlexibilidade") === "true",
    permiteBancoHoras:
      formData.get("permiteBancoHoras") === "on" ||
      formData.get("permiteBancoHoras") === "true",
    permiteHoraExtra:
      formData.get("permiteHoraExtra") === "on" ||
      formData.get("permiteHoraExtra") === "true",
    exigeIntervalo:
      formData.get("exigeIntervalo") === "on" ||
      formData.get("exigeIntervalo") === "true",
    intervaloMinimoMinutos: valorOpcionalNumero(
      formData.get("intervaloMinimoMinutos"),
    ),
    intervaloMaximoMinutos: valorOpcionalNumero(
      formData.get("intervaloMaximoMinutos"),
    ),
    horarioEntradaPadrao: valorOpcionalString(
      formData.get("horarioEntradaPadrao"),
    ),
    horarioSaidaPadrao: valorOpcionalString(
      formData.get("horarioSaidaPadrao"),
    ),
    horarioDiferenciadoPermitido:
      formData.get("horarioDiferenciadoPermitido") === "on" ||
      formData.get("horarioDiferenciadoPermitido") === "true",
    entradaMinimaDiferenciada: valorOpcionalString(
      formData.get("entradaMinimaDiferenciada"),
    ),
    saidaMaximaDiferenciada: valorOpcionalString(
      formData.get("saidaMaximaDiferenciada"),
    ),
    nucleoObrigatorioInicio: valorOpcionalString(
      formData.get("nucleoObrigatorioInicio"),
    ),
    nucleoObrigatorioFim: valorOpcionalString(
      formData.get("nucleoObrigatorioFim"),
    ),
    permanenciaMaximaMinutos: valorOpcionalNumero(
      formData.get("permanenciaMaximaMinutos"),
    ),
    horarioLimiteVirada: valorOpcionalString(
      formData.get("horarioLimiteVirada"),
    ),
    cruzaMeiaNoite:
      formData.get("cruzaMeiaNoite") === "on" ||
      formData.get("cruzaMeiaNoite") === "true",
    fundamentoNormativo: valorOpcionalString(
      formData.get("fundamentoNormativo"),
    ),
    versao: Number(formData.get("versao") ?? 1),
    vigenciaInicio: valorOpcionalString(formData.get("vigenciaInicio")),
    vigenciaFim: valorOpcionalString(formData.get("vigenciaFim")),
    situacao: valorOpcionalString(formData.get("situacao")) || "ATIVA",
    ativo: formData.get("ativo") === "on" || formData.get("ativo") === "true",
    dias,
  };
}

function montarSnapshotAuditoriaJornada(jornada: {
  id: string;
  orgaoId: string | null;
  codigo: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  cargaDiariaMinutos: number;
  cargaSemanalMinutos: number | null;
  cargaMensalMinutos: number | null;
  cargaMinimaDiariaMinutos: number | null;
  cargaMaximaDiariaMinutos: number | null;
  controlaHorario: boolean;
  permiteFlexibilidade: boolean;
  permiteBancoHoras: boolean;
  permiteHoraExtra: boolean;
  exigeIntervalo: boolean;
  intervaloMinimoMinutos: number | null;
  intervaloMaximoMinutos: number | null;
  horarioEntradaPadrao: string | null;
  horarioSaidaPadrao: string | null;
  horarioDiferenciadoPermitido: boolean;
  entradaMinimaDiferenciada: string | null;
  saidaMaximaDiferenciada: string | null;
  nucleoObrigatorioInicio: string | null;
  nucleoObrigatorioFim: string | null;
  permanenciaMaximaMinutos: number | null;
  horarioLimiteVirada: string | null;
  cruzaMeiaNoite: boolean;
  fundamentoNormativo: string | null;
  versao: number;
  vigenciaInicio: Date | null;
  vigenciaFim: Date | null;
  situacao: string;
  ativo: boolean;
  dias: Array<{
    diaSemana: string | null;
    ordemNoCiclo: number | null;
    tipoDia: string;
    cargaPrevistaMinutos: number;
    faixas: Array<{
      tipo: string;
      horaInicio: string;
      horaFim: string;
      obrigatoria: boolean;
      cruzaMeiaNoite: boolean;
      ordem: number;
    }>;
  }>;
}) {
  return {
    id: jornada.id,
    orgaoId: jornada.orgaoId,
    codigo: jornada.codigo,
    nome: jornada.nome,
    descricao: jornada.descricao,
    tipo: jornada.tipo,
    cargaDiariaMinutos: jornada.cargaDiariaMinutos,
    cargaSemanalMinutos: jornada.cargaSemanalMinutos,
    cargaMensalMinutos: jornada.cargaMensalMinutos,
    cargaMinimaDiariaMinutos: jornada.cargaMinimaDiariaMinutos,
    cargaMaximaDiariaMinutos: jornada.cargaMaximaDiariaMinutos,
    controlaHorario: jornada.controlaHorario,
    permiteFlexibilidade: jornada.permiteFlexibilidade,
    permiteBancoHoras: jornada.permiteBancoHoras,
    permiteHoraExtra: jornada.permiteHoraExtra,
    exigeIntervalo: jornada.exigeIntervalo,
    intervaloMinimoMinutos: jornada.intervaloMinimoMinutos,
    intervaloMaximoMinutos: jornada.intervaloMaximoMinutos,
    horarioEntradaPadrao: jornada.horarioEntradaPadrao,
    horarioSaidaPadrao: jornada.horarioSaidaPadrao,
    horarioDiferenciadoPermitido: jornada.horarioDiferenciadoPermitido,
    entradaMinimaDiferenciada: jornada.entradaMinimaDiferenciada,
    saidaMaximaDiferenciada: jornada.saidaMaximaDiferenciada,
    nucleoObrigatorioInicio: jornada.nucleoObrigatorioInicio,
    nucleoObrigatorioFim: jornada.nucleoObrigatorioFim,
    permanenciaMaximaMinutos: jornada.permanenciaMaximaMinutos,
    horarioLimiteVirada: jornada.horarioLimiteVirada,
    cruzaMeiaNoite: jornada.cruzaMeiaNoite,
    fundamentoNormativo: jornada.fundamentoNormativo,
    versao: jornada.versao,
    vigenciaInicio: jornada.vigenciaInicio?.toISOString().slice(0, 10) ?? null,
    vigenciaFim: jornada.vigenciaFim?.toISOString().slice(0, 10) ?? null,
    situacao: jornada.situacao,
    ativo: jornada.ativo,
    dias: jornada.dias.map((dia) => ({
      diaSemana: dia.diaSemana,
      ordemNoCiclo: dia.ordemNoCiclo,
      tipoDia: dia.tipoDia,
      cargaPrevistaMinutos: dia.cargaPrevistaMinutos,
      faixas: dia.faixas.map((faixa) => ({
        tipo: faixa.tipo,
        horaInicio: faixa.horaInicio,
        horaFim: faixa.horaFim,
        obrigatoria: faixa.obrigatoria,
        cruzaMeiaNoite: faixa.cruzaMeiaNoite,
        ordem: faixa.ordem,
      })),
    })),
  };
}

export async function criarJornadaAction(
  _estadoAnterior: JornadaFormState,
  formData: FormData,
): Promise<JornadaFormState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "jornadas:gerenciar:global",
  );

  const dados = extrairDadosJornada(formData);
  const parsed = jornadaSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os campos do formulário.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  if (await codigoJornadaExiste(parsed.data.codigo)) {
    return {
      sucesso: false,
      mensagem: "Já existe uma jornada com este código.",
      erros: {
        codigo: ["Já existe uma jornada com este código."],
      },
      campos: dados,
    };
  }

  const jornada = await prisma.$transaction(async (tx) => {
    const novaJornada = await tx.jornada.create({
      data: {
        orgaoId: parsed.data.orgaoId || null,
        codigo: parsed.data.codigo,
        nome: parsed.data.nome,
        descricao: parsed.data.descricao || null,
        tipo: parsed.data.tipo,
        cargaDiariaMinutos: parsed.data.cargaDiariaMinutos,
        cargaSemanalMinutos: parsed.data.cargaSemanalMinutos ?? null,
        cargaMensalMinutos: parsed.data.cargaMensalMinutos ?? null,
        cargaMinimaDiariaMinutos:
          parsed.data.cargaMinimaDiariaMinutos ?? null,
        cargaMaximaDiariaMinutos:
          parsed.data.cargaMaximaDiariaMinutos ?? null,
        controlaHorario: parsed.data.controlaHorario,
        permiteFlexibilidade: parsed.data.permiteFlexibilidade,
        permiteBancoHoras: parsed.data.permiteBancoHoras,
        permiteHoraExtra: parsed.data.permiteHoraExtra,
        exigeIntervalo: parsed.data.exigeIntervalo,
        intervaloMinimoMinutos: parsed.data.intervaloMinimoMinutos ?? null,
        intervaloMaximoMinutos: parsed.data.intervaloMaximoMinutos ?? null,
        horarioEntradaPadrao: parsed.data.horarioEntradaPadrao || null,
        horarioSaidaPadrao: parsed.data.horarioSaidaPadrao || null,
        horarioDiferenciadoPermitido:
          parsed.data.horarioDiferenciadoPermitido,
        entradaMinimaDiferenciada:
          parsed.data.entradaMinimaDiferenciada || null,
        saidaMaximaDiferenciada: parsed.data.saidaMaximaDiferenciada || null,
        nucleoObrigatorioInicio: parsed.data.nucleoObrigatorioInicio || null,
        nucleoObrigatorioFim: parsed.data.nucleoObrigatorioFim || null,
        permanenciaMaximaMinutos:
          parsed.data.permanenciaMaximaMinutos ?? null,
        horarioLimiteVirada: parsed.data.horarioLimiteVirada || null,
        cruzaMeiaNoite: parsed.data.cruzaMeiaNoite,
        fundamentoNormativo: parsed.data.fundamentoNormativo || null,
        versao: parsed.data.versao,
        vigenciaInicio: valorOpcionalData(parsed.data.vigenciaInicio ?? null),
        vigenciaFim: valorOpcionalData(parsed.data.vigenciaFim ?? null),
        situacao: parsed.data.situacao || "ATIVA",
        ativo: parsed.data.ativo,
      },
    });

    await tx.jornadaDia.createMany({
      data: parsed.data.dias.map((dia) => ({
        jornadaId: novaJornada.id,
        diaSemana: dia.diaSemana || null,
        ordemNoCiclo: dia.ordemNoCiclo ?? null,
        tipoDia: dia.tipoDia,
        cargaPrevistaMinutos: dia.cargaPrevistaMinutos,
      })),
    });

    const diasCriados = await tx.jornadaDia.findMany({
      where: {
        jornadaId: novaJornada.id,
      },
      select: {
        id: true,
        diaSemana: true,
        ordemNoCiclo: true,
      },
    });

    for (const dia of parsed.data.dias) {
      const diaCriado = diasCriados.find(
        (item) =>
          item.diaSemana === (dia.diaSemana || null) &&
          item.ordemNoCiclo === (dia.ordemNoCiclo ?? null),
      );

      if (!diaCriado || dia.faixas.length === 0) continue;

      await tx.jornadaFaixaHorario.createMany({
        data: dia.faixas
          .filter(
            (faixa) =>
              tiposFaixaJornada.includes(faixa.tipo) &&
              Boolean(faixa.horaInicio) &&
              Boolean(faixa.horaFim),
          )
          .map((faixa) => ({
            jornadaId: novaJornada.id,
            jornadaDiaId: diaCriado.id,
            tipo: faixa.tipo,
            horaInicio: faixa.horaInicio as string,
            horaFim: faixa.horaFim as string,
            obrigatoria: faixa.obrigatoria,
            cruzaMeiaNoite: faixa.cruzaMeiaNoite,
            ordem: faixa.ordem,
          })),
      });
    }

    const jornadaCriada = await tx.jornada.findUniqueOrThrow({
      where: {
        id: novaJornada.id,
      },
      include: {
        dias: {
          include: {
            faixas: {
              orderBy: {
                ordem: "asc",
              },
            },
          },
        },
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "Jornada",
        entidadeId: jornadaCriada.id,
        acao: "JORNADA_CRIADA",
        dadosDepois: montarSnapshotAuditoriaJornada(jornadaCriada),
      },
    });

    return jornadaCriada;
  });

  revalidatePath("/jornadas");
  redirect(`/jornadas/${jornada.id}`);
}
