"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  diasSemana,
  escalaSchema,
  tiposEscala,
  type EscalaFormState,
  type EscalaInput,
} from "../schemas/escala.schema";

type TipoEscala = EscalaInput["tipo"];
type TipoDiaEscala = EscalaInput["dias"][number]["tipoDia"];

const tiposDiaEscala: TipoDiaEscala[] = [
  "TRABALHO",
  "FOLGA",
  "PLANTAO",
  "COMPENSADO",
  "SEM_EXPEDIENTE",
];

function validarHoraHHMM(valor: string | undefined | null) {
  if (!valor) return false;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
}

function horaParaMinutos(valor: string | undefined | null) {
  if (!valor || !validarHoraHHMM(valor)) return null;
  const [horas, minutos] = valor.split(":").map(Number);
  return horas * 60 + minutos;
}

function normalizarTipoEscala(
  valor: FormDataEntryValue | null,
): TipoEscala | undefined {
  const tipo = String(valor ?? "");

  return tiposEscala.includes(tipo as TipoEscala)
    ? (tipo as TipoEscala)
    : undefined;
}

function normalizarTipoDiaEscala(valor: FormDataEntryValue | null) {
  const tipo = String(valor ?? "TRABALHO");

  return tiposDiaEscala.includes(tipo as TipoDiaEscala)
    ? (tipo as TipoDiaEscala)
    : "TRABALHO";
}

function extrairDadosEscala(
  jornadaId: string,
  formData: FormData,
): Partial<EscalaInput> {
  const tipo = normalizarTipoEscala(formData.get("tipo"));
  const escalaCiclica = ["CICLICA", "REVEZAMENTO", "TURNO_ALTERNANTE"].includes(
    tipo ?? "",
  );
  const quantidadeDiasCiclo = escalaCiclica
    ? Number(formData.get("quantidadeDiasCiclo") ?? 1)
    : null;
  const chavesDias = escalaCiclica
    ? Array.from({ length: quantidadeDiasCiclo ?? 1 }, (_, indice) =>
        String(indice + 1),
      )
    : [...diasSemana];

  return {
    jornadaId,
    codigo: String(formData.get("codigo") ?? "").trim().toUpperCase(),
    nome: String(formData.get("nome") ?? "").trim(),
    descricao: String(formData.get("descricao") ?? "").trim(),
    tipo,
    quantidadeDiasCiclo,
    dataAncoragem: String(formData.get("dataAncoragem") ?? "").trim(),
    primeiroDiaTrabalho: String(
      formData.get("primeiroDiaTrabalho") ?? "",
    ).trim(),
    timezone: String(formData.get("timezone") ?? "").trim(),
    ativo: formData.get("ativo") === "on" || formData.get("ativo") === "true",
    dias: chavesDias.map((chave) => {
      const prefixo = escalaCiclica ? `dias.${chave}` : `dias.${chave}`;

      return {
        diaSemana: (escalaCiclica
          ? ""
          : chave) as EscalaInput["dias"][number]["diaSemana"],
        posicaoCiclo: escalaCiclica ? Number(chave) : null,
        tipoDia: normalizarTipoDiaEscala(formData.get(`${prefixo}.tipoDia`)),
        trabalha:
          formData.get(`${prefixo}.trabalha`) === "on" ||
          formData.get(`${prefixo}.trabalha`) === "true",
        horarioEntrada: String(
          formData.get(`${prefixo}.horarioEntrada`) ?? "",
        ),
        horarioSaida: String(formData.get(`${prefixo}.horarioSaida`) ?? ""),
        intervaloInicio: String(
          formData.get(`${prefixo}.intervaloInicio`) ?? "",
        ),
        intervaloFim: String(formData.get(`${prefixo}.intervaloFim`) ?? ""),
        cargaPrevistaMinutos: Number(
          formData.get(`${prefixo}.cargaPrevistaMinutos`) ?? 0,
        ),
        cruzaMeiaNoite:
          formData.get(`${prefixo}.cruzaMeiaNoite`) === "on" ||
          formData.get(`${prefixo}.cruzaMeiaNoite`) === "true",
      };
    }),
  };
}

function erroDia(dia: EscalaInput["dias"][number], campo: string) {
  return `dias.${dia.posicaoCiclo ?? dia.diaSemana}.${campo}`;
}

function valorOpcionalData(valor?: string | null) {
  return valor ? new Date(`${valor}T00:00:00`) : null;
}

export async function criarEscalaAction(
  jornadaId: string,
  _estadoAnterior: EscalaFormState,
  formData: FormData,
): Promise<EscalaFormState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "jornadas:gerenciar:global",
  );

  const dados = extrairDadosEscala(jornadaId, formData);
  const parsed = escalaSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os campos do formulario.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const jornada = await prisma.jornada.findUnique({
    where: { id: parsed.data.jornadaId },
    select: {
      id: true,
      exigeIntervalo: true,
      intervaloMinimoMinutos: true,
      intervaloMaximoMinutos: true,
    },
  });

  if (!jornada) {
    return {
      sucesso: false,
      mensagem: "Jornada nao encontrada.",
      campos: dados,
    };
  }

  const erros: Record<string, string[]> = {};

  for (const dia of parsed.data.dias) {
    if (!dia.trabalha) continue;

    const entrada = horaParaMinutos(dia.horarioEntrada);
    const saida = horaParaMinutos(dia.horarioSaida);
    const intervaloInicio = horaParaMinutos(dia.intervaloInicio);
    const intervaloFim = horaParaMinutos(dia.intervaloFim);

    if (entrada === null) {
      erros[erroDia(dia, "horarioEntrada")] = [
        "Informe a entrada do dia trabalhado.",
      ];
    }

    if (saida === null) {
      erros[erroDia(dia, "horarioSaida")] = [
        "Informe a saida do dia trabalhado.",
      ];
    }

    if (entrada !== null && saida !== null && saida <= entrada && !dia.cruzaMeiaNoite) {
      erros[erroDia(dia, "horarioSaida")] = [
        "A saida deve ser posterior a entrada.",
      ];
    }

    if (dia.cargaPrevistaMinutos <= 0) {
      erros[erroDia(dia, "cargaPrevistaMinutos")] = [
        "Informe a carga prevista do dia trabalhado.",
      ];
    }

    const informouInicioIntervalo = Boolean(dia.intervaloInicio);
    const informouFimIntervalo = Boolean(dia.intervaloFim);

    if (
      jornada.exigeIntervalo &&
      (intervaloInicio === null || intervaloFim === null)
    ) {
      erros[erroDia(dia, "intervaloInicio")] = [
        "Informe o intervalo da jornada neste dia.",
      ];
    } else if (informouInicioIntervalo !== informouFimIntervalo) {
      erros[erroDia(dia, "intervaloInicio")] = [
        "Informe inicio e fim do intervalo.",
      ];
    }

    if (intervaloInicio !== null && intervaloFim !== null) {
      if (intervaloFim <= intervaloInicio) {
        erros[erroDia(dia, "intervaloFim")] = [
          "O fim do intervalo deve ser posterior ao inicio.",
        ];
      }

      const duracaoIntervalo = intervaloFim - intervaloInicio;

      if (
        jornada.intervaloMinimoMinutos &&
        duracaoIntervalo < jornada.intervaloMinimoMinutos
      ) {
        erros[erroDia(dia, "intervaloInicio")] = [
          `O intervalo minimo e de ${jornada.intervaloMinimoMinutos} minutos.`,
        ];
      }

      if (
        jornada.intervaloMaximoMinutos &&
        duracaoIntervalo > jornada.intervaloMaximoMinutos
      ) {
        erros[erroDia(dia, "intervaloFim")] = [
          `O intervalo maximo e de ${jornada.intervaloMaximoMinutos} minutos.`,
        ];
      }
    }
  }

  if (Object.keys(erros).length > 0) {
    return {
      sucesso: false,
      mensagem: "Verifique os horarios da escala.",
      erros,
      campos: dados,
    };
  }

  const escalaExistente = await prisma.escala.findUnique({
    where: { codigo: parsed.data.codigo },
    select: { id: true },
  });

  if (escalaExistente) {
    return {
      sucesso: false,
      mensagem: "Ja existe uma escala com este codigo.",
      erros: {
        codigo: ["Ja existe uma escala com este codigo."],
      },
      campos: dados,
    };
  }

  const escala = await prisma.$transaction(async (tx) => {
    const novaEscala = await tx.escala.create({
      data: {
        jornadaId: parsed.data.jornadaId,
        codigo: parsed.data.codigo,
        nome: parsed.data.nome,
        descricao: parsed.data.descricao || null,
        tipo: parsed.data.tipo,
        quantidadeDiasCiclo: parsed.data.quantidadeDiasCiclo ?? null,
        dataAncoragem: valorOpcionalData(parsed.data.dataAncoragem),
        primeiroDiaTrabalho: valorOpcionalData(
          parsed.data.primeiroDiaTrabalho,
        ),
        timezone: parsed.data.timezone || null,
        ativo: parsed.data.ativo,
        dias: {
          create: parsed.data.dias.map((dia) => ({
            diaSemana: dia.diaSemana || null,
            posicaoCiclo: dia.posicaoCiclo ?? null,
            tipoDia: dia.tipoDia,
            trabalha: dia.trabalha,
            horarioEntrada: dia.trabalha ? dia.horarioEntrada || null : null,
            horarioSaida: dia.trabalha ? dia.horarioSaida || null : null,
            intervaloInicio: dia.trabalha ? dia.intervaloInicio || null : null,
            intervaloFim: dia.trabalha ? dia.intervaloFim || null : null,
            cargaPrevistaMinutos: dia.trabalha
              ? dia.cargaPrevistaMinutos
              : 0,
            cruzaMeiaNoite: dia.cruzaMeiaNoite,
          })),
        },
      },
      include: {
        dias: true,
      },
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "Escala",
        entidadeId: novaEscala.id,
        acao: "ESCALA_CRIADA",
        dadosDepois: novaEscala,
      },
    });

    return novaEscala;
  });

  revalidatePath("/jornadas");
  revalidatePath(`/jornadas/${parsed.data.jornadaId}`);

  return {
    sucesso: true,
    mensagem: `Escala ${escala.codigo} cadastrada com sucesso.`,
  };
}
