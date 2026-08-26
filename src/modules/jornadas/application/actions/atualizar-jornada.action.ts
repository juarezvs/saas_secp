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

function rotuloCampoErro(path: Array<PropertyKey>, tipo?: TipoJornada) {
  const [campo, indiceDia, subcampo, indiceFaixa, campoFaixa] = path;

  if (campo === "dias" && typeof indiceDia === "number") {
    const rotuloDia =
      tipo === "ESCALA_CICLICA"
        ? `${indiceDia + 1}º Ciclo`
        : {
            DOMINGO: "Domingo",
            SEGUNDA: "Segunda-feira",
            TERCA: "Terça-feira",
            QUARTA: "Quarta-feira",
            QUINTA: "Quinta-feira",
            SEXTA: "Sexta-feira",
            SABADO: "Sábado",
          }[diasSemana[indiceDia]] ?? `Linha ${indiceDia + 1}`;

    if (subcampo === "faixas" && typeof indiceFaixa === "number") {
      const ordem = indiceFaixa + 1;
      const rotuloOrdem =
        ordem === 1 ? "1ª" : ordem === 2 ? "2ª" : ordem === 3 ? "3ª" : `${ordem}ª`;
      const rotuloCampo = campoFaixa === "horaFim" ? "Saída" : "Entrada";

      return `${rotuloDia} - ${rotuloOrdem} ${rotuloCampo}`;
    }

    if (subcampo === "cargaPrevistaMinutos") return `${rotuloDia} - Carga`;
    if (subcampo === "fechamentoCiclo") return `${rotuloDia} - Fechamento`;
    if (subcampo === "tipoDia") return `${rotuloDia} - Tipo`;

    return rotuloDia;
  }

  const rotulos: Record<string, string> = {
    codigo: "Código",
    nome: "Descrição do horário",
    descricao: "Observações",
    tipo: "Tipo de horário",
    vigenciaInicio:
      tipo === "ESCALA_CICLICA" ? "Início do Ciclo" : "Vigência inicial",
    vigenciaFim: "Vigência final",
    horarioEntradaPadrao: "1ª Entrada",
    horarioSaidaPadrao: "Última saída",
    cargaDiariaMinutos: "Carga diária",
    cargaSemanalMinutos: "Carga semanal",
    cargaMensalMinutos: "Carga mensal",
    fundamentoNormativo: "Fundamento normativo",
    dias: tipo === "ESCALA_CICLICA" ? "Ciclos" : "Grade semanal",
  };

  return rotulos[String(campo)] ?? "Campo";
}

function primeiraMensagemValidacao(
  erro: { issues: Array<{ path: Array<PropertyKey>; message: string }> },
  tipo?: TipoJornada,
) {
  const primeiraIssue = erro.issues[0];
  if (!primeiraIssue) return "Verifique os campos do formulário.";

  return `${rotuloCampoErro(primeiraIssue.path, tipo)}: ${primeiraIssue.message}`;
}

function normalizarTipoDia(valor: FormDataEntryValue | null) {
  const tipoDiaFormulario = String(valor ?? "TRABALHO");

  return tiposDiaJornada.includes(
    tipoDiaFormulario as (typeof tiposDiaJornada)[number],
  )
    ? (tipoDiaFormulario as (typeof tiposDiaJornada)[number])
    : "TRABALHO";
}

function extrairFaixas(
  formData: FormData,
  prefixo: string,
): NonNullable<JornadaInput["dias"]>[number]["faixas"] {
  return [1, 2, 3]
    .map((ordem) => {
      const inicio =
        valorOpcionalString(formData.get(`${prefixo}.entrada${ordem}`)) ||
        (ordem === 1
          ? valorOpcionalString(formData.get(`${prefixo}.faixaTrabalhoInicio`))
          : "");
      const fim =
        valorOpcionalString(formData.get(`${prefixo}.saida${ordem}`)) ||
        (ordem === 1
          ? valorOpcionalString(formData.get(`${prefixo}.faixaTrabalhoFim`))
          : "");

      return {
        tipo: "TRABALHO" as const,
        horaInicio: inicio,
        horaFim: fim,
        obrigatoria: true,
        cruzaMeiaNoite:
          formData.get(`${prefixo}.cruzaMeiaNoite`) === "on" ||
          formData.get(`${prefixo}.cruzaMeiaNoite`) === "true" ||
          (Boolean(inicio) && Boolean(fim) && fim < inicio),
        ordem,
      };
    })
    .filter((faixa) => faixa.horaInicio || faixa.horaFim);
}

function extrairDadosJornada(formData: FormData): Partial<JornadaInput> {
  const tipo = normalizarTipoJornada(formData.get("tipo"));
  const diasSemanais = diasSemana.map((diaSemana) => {
    const prefixo = `dias.${diaSemana}`;
    const faixasTrabalho = extrairFaixas(formData, prefixo);
    const faixaNucleoInicio = valorOpcionalString(
      formData.get(`${prefixo}.faixaNucleoInicio`),
    );
    const faixaNucleoFim = valorOpcionalString(
      formData.get(`${prefixo}.faixaNucleoFim`),
    );
    const tipoDia = normalizarTipoDia(formData.get(`${prefixo}.tipoDia`));
    const faixas: NonNullable<JornadaInput["dias"]>[number]["faixas"] = [
      ...faixasTrabalho,
    ];

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
      fechamentoCiclo: "",
      intervaloLivre: false,
      cargaPrevistaMinutos: valorOpcionalNumero(
        formData.get(`${prefixo}.cargaPrevistaMinutos`),
      ) ?? 0,
      faixas,
    };
  });
  const quantidadeCiclos = Math.max(
    1,
    Number(formData.get("ciclos.quantidade") ?? 1),
  );
  const diasCiclicos: NonNullable<JornadaInput["dias"]> = [];
  let ordemNoCiclo = 1;

  for (let indice = 0; indice < quantidadeCiclos; indice += 1) {
    const prefixo = `ciclos.${indice}`;
    const duracao = Math.max(
      1,
      valorOpcionalNumero(formData.get(`${prefixo}.duracaoDias`)) ?? 1,
    );
    const tipoDia = normalizarTipoDia(formData.get(`${prefixo}.tipoDia`));
    const faixas = extrairFaixas(formData, prefixo);
    const fechamentoCiclo = valorOpcionalString(
      formData.get(`${prefixo}.fechamento`),
    );
    const intervaloLivre =
      formData.get(`${prefixo}.intervaloLivre`) === "on" ||
      formData.get(`${prefixo}.intervaloLivre`) === "true";
    const cargaPrevistaMinutos =
      valorOpcionalNumero(formData.get(`${prefixo}.cargaPrevistaMinutos`)) ??
      0;

    for (let dia = 0; dia < duracao; dia += 1) {
      diasCiclicos.push({
        diaSemana: "",
        ordemNoCiclo,
        tipoDia,
        fechamentoCiclo,
        intervaloLivre,
        cargaPrevistaMinutos,
        faixas,
      });
      ordemNoCiclo += 1;
    }
  }

  const dias = tipo === "ESCALA_CICLICA" ? diasCiclicos : diasSemanais;

  return {
    orgaoId: valorOpcionalString(formData.get("orgaoId")),
    codigo: String(formData.get("codigo") ?? "")
      .trim()
      .toUpperCase(),
    nome: String(formData.get("nome") ?? "").trim(),
    descricao: valorOpcionalString(formData.get("descricao")),
    tipo,
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
      mensagem: primeiraMensagemValidacao(parsed.error, dados.tipo),
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
        fechamentoCiclo: dia.fechamentoCiclo || null,
        intervaloLivre: Boolean(dia.intervaloLivre),
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

  redirect(`/jornadas/${jornadaId}?horarioSalvo=1`);
}
