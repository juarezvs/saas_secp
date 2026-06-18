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

function extrairDadosEscala(
  jornadaId: string,
  formData: FormData,
): Partial<EscalaInput> {
  return {
    jornadaId,
    codigo: String(formData.get("codigo") ?? "").trim().toUpperCase(),
    nome: String(formData.get("nome") ?? "").trim(),
    descricao: String(formData.get("descricao") ?? "").trim(),
    tipo: normalizarTipoEscala(formData.get("tipo")),
    ativo: formData.get("ativo") === "on" || formData.get("ativo") === "true",
    dias: diasSemana.map((diaSemana) => {
      const prefixo = `dias.${diaSemana}`;

      return {
        diaSemana,
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
      };
    }),
  };
}

function erroDia(diaSemana: string, campo: string) {
  return `dias.${diaSemana}.${campo}`;
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
      erros[erroDia(dia.diaSemana, "horarioEntrada")] = [
        "Informe a entrada do dia trabalhado.",
      ];
    }

    if (saida === null) {
      erros[erroDia(dia.diaSemana, "horarioSaida")] = [
        "Informe a saida do dia trabalhado.",
      ];
    }

    if (entrada !== null && saida !== null && saida <= entrada) {
      erros[erroDia(dia.diaSemana, "horarioSaida")] = [
        "A saida deve ser posterior a entrada.",
      ];
    }

    if (dia.cargaPrevistaMinutos <= 0) {
      erros[erroDia(dia.diaSemana, "cargaPrevistaMinutos")] = [
        "Informe a carga prevista do dia trabalhado.",
      ];
    }

    const informouInicioIntervalo = Boolean(dia.intervaloInicio);
    const informouFimIntervalo = Boolean(dia.intervaloFim);

    if (
      jornada.exigeIntervalo &&
      (intervaloInicio === null || intervaloFim === null)
    ) {
      erros[erroDia(dia.diaSemana, "intervaloInicio")] = [
        "Informe o intervalo da jornada neste dia.",
      ];
    } else if (informouInicioIntervalo !== informouFimIntervalo) {
      erros[erroDia(dia.diaSemana, "intervaloInicio")] = [
        "Informe inicio e fim do intervalo.",
      ];
    }

    if (intervaloInicio !== null && intervaloFim !== null) {
      if (intervaloFim <= intervaloInicio) {
        erros[erroDia(dia.diaSemana, "intervaloFim")] = [
          "O fim do intervalo deve ser posterior ao inicio.",
        ];
      }

      const duracaoIntervalo = intervaloFim - intervaloInicio;

      if (
        jornada.intervaloMinimoMinutos &&
        duracaoIntervalo < jornada.intervaloMinimoMinutos
      ) {
        erros[erroDia(dia.diaSemana, "intervaloInicio")] = [
          `O intervalo minimo e de ${jornada.intervaloMinimoMinutos} minutos.`,
        ];
      }

      if (
        jornada.intervaloMaximoMinutos &&
        duracaoIntervalo > jornada.intervaloMaximoMinutos
      ) {
        erros[erroDia(dia.diaSemana, "intervaloFim")] = [
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
        ativo: parsed.data.ativo,
        dias: {
          create: parsed.data.dias.map((dia) => ({
            diaSemana: dia.diaSemana,
            trabalha: dia.trabalha,
            horarioEntrada: dia.trabalha ? dia.horarioEntrada || null : null,
            horarioSaida: dia.trabalha ? dia.horarioSaida || null : null,
            intervaloInicio: dia.trabalha ? dia.intervaloInicio || null : null,
            intervaloFim: dia.trabalha ? dia.intervaloFim || null : null,
            cargaPrevistaMinutos: dia.trabalha
              ? dia.cargaPrevistaMinutos
              : 0,
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
