"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import {
  buscarJornadaPorId,
  codigoJornadaExiste,
} from "../../infrastructure/repositories/jornada.repository";
import {
  diasSemana,
  jornadaSchema,
  tiposJornada,
  tiposDiaJornada,
  tiposFaixaJornada,
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
    codigo: String(formData.get("codigo") ?? "")
      .trim()
      .toUpperCase(),
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
    horarioSaidaPadrao: valorOpcionalString(formData.get("horarioSaidaPadrao")),
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

export async function atualizarJornadaAction(
  jornadaId: string,
  _estadoAnterior: JornadaFormState,
  formData: FormData,
): Promise<JornadaFormState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "jornadas:gerenciar:global",
  );

  const jornadaAtual = await buscarJornadaPorId(jornadaId);

  if (!jornadaAtual) {
    return {
      sucesso: false,
      mensagem: "Jornada não encontrada.",
    };
  }

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

  if (await codigoJornadaExiste(parsed.data.codigo, jornadaId)) {
    return {
      sucesso: false,
      mensagem: "Já existe outra jornada com este código.",
      erros: {
        codigo: ["Já existe outra jornada com este código."],
      },
      campos: dados,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.jornada.update({
      where: {
        id: jornadaId,
      },
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
        horarioDiferenciadoPermitido: parsed.data.horarioDiferenciadoPermitido,
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

    await tx.jornadaDia.deleteMany({
      where: {
        jornadaId,
      },
    });

    await tx.jornadaDia.createMany({
      data: parsed.data.dias.map((dia) => ({
        jornadaId,
        diaSemana: dia.diaSemana || null,
        ordemNoCiclo: dia.ordemNoCiclo ?? null,
        tipoDia: dia.tipoDia,
        cargaPrevistaMinutos: dia.cargaPrevistaMinutos,
      })),
    });

    const diasCriados = await tx.jornadaDia.findMany({
      where: {
        jornadaId,
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
            jornadaId,
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

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "Jornada",
        entidadeId: jornadaId,
        acao: "JORNADA_ATUALIZADA",
        dadosAntes: {
          id: jornadaAtual.id,
          codigo: jornadaAtual.codigo,
          nome: jornadaAtual.nome,
          tipo: jornadaAtual.tipo,
          cargaDiariaMinutos: jornadaAtual.cargaDiariaMinutos,
          exigeIntervalo: jornadaAtual.exigeIntervalo,
          intervaloMinimoMinutos: jornadaAtual.intervaloMinimoMinutos,
          intervaloMaximoMinutos: jornadaAtual.intervaloMaximoMinutos,
          ativo: jornadaAtual.ativo,
        },
        dadosDepois: parsed.data,
      },
    });
  });

  revalidatePath("/jornadas");
  revalidatePath(`/jornadas/${jornadaId}`);

  redirect(`/jornadas/${jornadaId}`);
}
