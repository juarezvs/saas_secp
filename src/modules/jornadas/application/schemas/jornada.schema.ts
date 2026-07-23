import { z } from "zod";

export const tiposJornada = [
  "SETE_HORAS",
  "OITO_HORAS",
  "ESPECIAL",
  "FIXA_SEMANAL",
  "FLEXIVEL",
  "CARGA_DIARIA",
  "CARGA_SEMANAL",
  "CARGA_MENSAL",
  "ESCALA_CICLICA",
  "ESCALA_VARIAVEL",
  "TURNO_FIXO",
  "TURNO_REVEZAMENTO",
  "NOTURNA",
  "PARCIAL",
  "PLANTAO_EVENTUAL",
  "SEM_CONTROLE_CONVENCIONAL",
] as const;

function validarHoraHHMM(valor: string | undefined | null) {
  if (!valor) return true;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
}

function horaParaMinutos(valor: string | undefined | null) {
  if (!valor || !validarHoraHHMM(valor)) return null;
  const [horas, minutos] = valor.split(":").map(Number);
  return horas * 60 + minutos;
}

function contemFundamentoNormativo(valor: string | undefined | null) {
  if (!valor) return false;

  return /\b(lei|resolucao|portaria|decreto|norma|regulamento|ato|cjf|cnj|portaria)\b/i.test(
    valor.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
  );
}

function textoOpcional(max: number) {
  return z.string().trim().max(max).optional().or(z.literal(""));
}

const dataOpcional = z.string().optional().or(z.literal(""));
const horaOpcional = z.string().optional().or(z.literal(""));
const uuidOpcional = z.string().uuid("Identificador invalido.").optional().or(z.literal(""));

export const diasSemana = [
  "DOMINGO",
  "SEGUNDA",
  "TERCA",
  "QUARTA",
  "QUINTA",
  "SEXTA",
  "SABADO",
] as const;

export const tiposDiaJornada = [
  "TRABALHO",
  "FOLGA",
  "PLANTAO",
  "COMPENSADO",
  "SEM_EXPEDIENTE",
] as const;

export const tiposFaixaJornada = [
  "TRABALHO",
  "INTERVALO",
  "NUCLEO_OBRIGATORIO",
  "SOBREAVISO",
] as const;

export const jornadaFaixaSchema = z.object({
  tipo: z.enum(tiposFaixaJornada).default("TRABALHO"),
  horaInicio: horaOpcional,
  horaFim: horaOpcional,
  obrigatoria: z.coerce.boolean().default(true),
  cruzaMeiaNoite: z.coerce.boolean().default(false),
  ordem: z.coerce.number().int().min(1).default(1),
});

export const jornadaDiaSchema = z.object({
  diaSemana: z.enum(diasSemana).optional().or(z.literal("")),
  ordemNoCiclo: z.coerce.number().int().min(1).optional().nullable(),
  tipoDia: z.enum(tiposDiaJornada).default("TRABALHO"),
  cargaPrevistaMinutos: z.coerce.number().int().min(0).max(1440).default(0),
  faixas: z.array(jornadaFaixaSchema).default([]),
});

export const jornadaSchema = z
  .object({
    orgaoId: uuidOpcional,
    codigo: z
      .string()
      .trim()
      .min(2, "Informe um codigo.")
      .max(80, "O codigo deve ter no maximo 80 caracteres.")
      .regex(/^[A-Z0-9_]+$/, "Use letras maiusculas, numeros e underscore."),
    nome: z
      .string()
      .trim()
      .min(3, "Informe o nome da jornada.")
      .max(150, "O nome deve ter no maximo 150 caracteres."),
    descricao: textoOpcional(1000),
    tipo: z.enum(tiposJornada, {
      error: "Informe o tipo de jornada.",
    }),
    cargaDiariaMinutos: z.coerce
      .number()
      .int()
      .min(0, "Carga minima invalida.")
      .max(720, "Carga diaria maxima invalida."),
    cargaSemanalMinutos: z.coerce.number().int().optional().nullable(),
    cargaMensalMinutos: z.coerce.number().int().optional().nullable(),
    cargaMinimaDiariaMinutos: z.coerce.number().int().optional().nullable(),
    cargaMaximaDiariaMinutos: z.coerce.number().int().optional().nullable(),
    controlaHorario: z.coerce.boolean().default(true),
    permiteFlexibilidade: z.coerce.boolean().default(false),
    permiteBancoHoras: z.coerce.boolean().default(true),
    permiteHoraExtra: z.coerce.boolean().default(false),
    exigeIntervalo: z.coerce.boolean().default(false),
    intervaloMinimoMinutos: z.coerce.number().int().optional().nullable(),
    intervaloMaximoMinutos: z.coerce.number().int().optional().nullable(),
    horarioEntradaPadrao: horaOpcional,
    horarioSaidaPadrao: horaOpcional,
    horarioDiferenciadoPermitido: z.coerce.boolean().default(false),
    entradaMinimaDiferenciada: horaOpcional,
    saidaMaximaDiferenciada: horaOpcional,
    nucleoObrigatorioInicio: horaOpcional,
    nucleoObrigatorioFim: horaOpcional,
    permanenciaMaximaMinutos: z.coerce.number().int().optional().nullable(),
    horarioLimiteVirada: horaOpcional,
    cruzaMeiaNoite: z.coerce.boolean().default(false),
    fundamentoNormativo: textoOpcional(250),
    versao: z.coerce.number().int().min(1).default(1),
    vigenciaInicio: dataOpcional,
    vigenciaFim: dataOpcional,
    situacao: z.string().trim().max(30).default("ATIVA"),
    ativo: z.coerce.boolean().default(true),
    dias: z.array(jornadaDiaSchema).default([]),
  })
  .superRefine((data, ctx) => {
    const camposHora = [
      ["horarioEntradaPadrao", data.horarioEntradaPadrao],
      ["horarioSaidaPadrao", data.horarioSaidaPadrao],
      ["entradaMinimaDiferenciada", data.entradaMinimaDiferenciada],
      ["saidaMaximaDiferenciada", data.saidaMaximaDiferenciada],
      ["nucleoObrigatorioInicio", data.nucleoObrigatorioInicio],
      ["nucleoObrigatorioFim", data.nucleoObrigatorioFim],
      ["horarioLimiteVirada", data.horarioLimiteVirada],
    ] as const;

    for (const [campo, valor] of camposHora) {
      if (!validarHoraHHMM(valor)) {
        ctx.addIssue({
          code: "custom",
          path: [campo],
          message: "Informe a hora no formato HH:mm.",
        });
      }
    }

    const entradaPadrao = horaParaMinutos(data.horarioEntradaPadrao);
    const saidaPadrao = horaParaMinutos(data.horarioSaidaPadrao);
    const exigeHorarioPadrao =
      data.controlaHorario &&
      !["CARGA_SEMANAL", "CARGA_MENSAL", "SEM_CONTROLE_CONVENCIONAL"].includes(
        data.tipo,
      );

    if (exigeHorarioPadrao && entradaPadrao === null) {
      ctx.addIssue({
        code: "custom",
        path: ["horarioEntradaPadrao"],
        message: "Informe a entrada padrao da jornada.",
      });
    }

    if (exigeHorarioPadrao && saidaPadrao === null) {
      ctx.addIssue({
        code: "custom",
        path: ["horarioSaidaPadrao"],
        message: "Informe a saida padrao da jornada.",
      });
    }

    if (
      entradaPadrao !== null &&
      saidaPadrao !== null &&
      saidaPadrao <= entradaPadrao &&
      !data.cruzaMeiaNoite
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["horarioSaidaPadrao"],
        message: "A saida padrao deve ser posterior a entrada.",
      });
    }

    if (data.controlaHorario && data.cargaDiariaMinutos < 60) {
      ctx.addIssue({
        code: "custom",
        path: ["cargaDiariaMinutos"],
        message: "Informe a carga diaria em minutos.",
      });
    }

    if (data.tipo === "CARGA_SEMANAL" && !data.cargaSemanalMinutos) {
      ctx.addIssue({
        code: "custom",
        path: ["cargaSemanalMinutos"],
        message: "Informe a carga semanal da jornada.",
      });
    }

    if (data.tipo === "CARGA_MENSAL" && !data.cargaMensalMinutos) {
      ctx.addIssue({
        code: "custom",
        path: ["cargaMensalMinutos"],
        message: "Informe a carga mensal da jornada.",
      });
    }

    if (
      data.vigenciaInicio &&
      data.vigenciaFim &&
      new Date(`${data.vigenciaFim}T00:00:00`) <
        new Date(`${data.vigenciaInicio}T00:00:00`)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["vigenciaFim"],
        message: "A vigencia final nao pode ser anterior a inicial.",
      });
    }

    if (data.horarioDiferenciadoPermitido) {
      const entradaDiferenciada = horaParaMinutos(
        data.entradaMinimaDiferenciada,
      );
      const saidaDiferenciada = horaParaMinutos(
        data.saidaMaximaDiferenciada,
      );

      if (
        entradaDiferenciada === null ||
        entradaDiferenciada < 6 * 60 ||
        entradaDiferenciada > 19 * 60
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["entradaMinimaDiferenciada"],
          message:
            "A entrada diferenciada deve respeitar o limite minimo de 06:00.",
        });
      }

      if (
        saidaDiferenciada === null ||
        saidaDiferenciada < 6 * 60 ||
        saidaDiferenciada > 19 * 60
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["saidaMaximaDiferenciada"],
          message:
            "A saida diferenciada deve respeitar o limite maximo de 19:00.",
        });
      }

      if (
        entradaDiferenciada !== null &&
        saidaDiferenciada !== null &&
        saidaDiferenciada <= entradaDiferenciada
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["saidaMaximaDiferenciada"],
          message: "A saida diferenciada deve ser posterior a entrada.",
        });
      }
    }

    if (data.tipo === "OITO_HORAS" && !data.exigeIntervalo) {
      ctx.addIssue({
        code: "custom",
        path: ["exigeIntervalo"],
        message: "Jornada de 8 horas deve exigir intervalo.",
      });
    }

    if (
      data.tipo === "ESPECIAL" &&
      ((data.fundamentoNormativo?.trim().length ??
        data.descricao?.trim().length ??
        0) < 10 ||
        !contemFundamentoNormativo(
          data.fundamentoNormativo || data.descricao,
        ))
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["fundamentoNormativo"],
        message:
          "Informe o fundamento legal/normativo da jornada especial ou profissao regulamentada.",
      });
    }

    if (data.exigeIntervalo) {
      if (!data.intervaloMinimoMinutos || data.intervaloMinimoMinutos < 60) {
        ctx.addIssue({
          code: "custom",
          path: ["intervaloMinimoMinutos"],
          message: "O intervalo minimo deve ser de pelo menos 60 minutos.",
        });
      }

      if (!data.intervaloMaximoMinutos || data.intervaloMaximoMinutos > 180) {
        ctx.addIssue({
          code: "custom",
          path: ["intervaloMaximoMinutos"],
          message: "O intervalo maximo nao pode superar 180 minutos.",
        });
      }

      if (
        data.intervaloMinimoMinutos &&
        data.intervaloMaximoMinutos &&
        data.intervaloMaximoMinutos < data.intervaloMinimoMinutos
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["intervaloMaximoMinutos"],
          message: "O intervalo maximo nao pode ser menor que o minimo.",
        });
      }
    }

    const diasTrabalho = data.dias.filter((dia) => dia.tipoDia !== "FOLGA");
    const exigeDiaConfigurado = [
      "FIXA_SEMANAL",
      "FLEXIVEL",
      "ESCALA_CICLICA",
      "ESCALA_VARIAVEL",
      "TURNO_FIXO",
      "TURNO_REVEZAMENTO",
      "NOTURNA",
      "PARCIAL",
      "PLANTAO_EVENTUAL",
    ].includes(data.tipo);

    if (exigeDiaConfigurado && diasTrabalho.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["dias"],
        message: "Configure pelo menos um dia/faixa aplicavel a esta jornada.",
      });
    }

    data.dias.forEach((dia, indiceDia) => {
      const diaTrabalhado = dia.tipoDia !== "FOLGA" && dia.tipoDia !== "SEM_EXPEDIENTE";

      if (diaTrabalhado && dia.cargaPrevistaMinutos <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["dias", indiceDia, "cargaPrevistaMinutos"],
          message: "Informe a carga prevista do dia trabalhado.",
        });
      }

      dia.faixas.forEach((faixa, indiceFaixa) => {
        if (!validarHoraHHMM(faixa.horaInicio)) {
          ctx.addIssue({
            code: "custom",
            path: ["dias", indiceDia, "faixas", indiceFaixa, "horaInicio"],
            message: "Informe a hora inicial no formato HH:mm.",
          });
        }

        if (!validarHoraHHMM(faixa.horaFim)) {
          ctx.addIssue({
            code: "custom",
            path: ["dias", indiceDia, "faixas", indiceFaixa, "horaFim"],
            message: "Informe a hora final no formato HH:mm.",
          });
        }

        const inicio = horaParaMinutos(faixa.horaInicio);
        const fim = horaParaMinutos(faixa.horaFim);

        if (
          inicio !== null &&
          fim !== null &&
          fim <= inicio &&
          !faixa.cruzaMeiaNoite
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["dias", indiceDia, "faixas", indiceFaixa, "horaFim"],
            message: "A hora final deve ser posterior a inicial.",
          });
        }
      });
    });
  });

export type JornadaInput = z.infer<typeof jornadaSchema>;

export type JornadaFormState = {
  sucesso: boolean;
  mensagem: string | null;
  erros?: Record<string, string[]>;
  campos?: Partial<JornadaInput>;
};
