"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { vincularMarcacoesBrutasServidorService } from "@/modules/marcacoes-brutas/application/services/vincular-marcacoes-brutas-servidor.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import {
  buscarServidorPorId,
  identificadorPontoExiste,
  matriculaServidorExiste,
  normalizarIdentificadorPonto,
  pisServidorExiste,
  usuarioMatriculaExiste,
} from "../../infrastructure/repositories/servidor.repository";
import {
  opcoesSinalizacaoForaExpediente,
  servidorSchema,
  tiposVinculoServidor,
  type ServidorFormState,
  type ServidorInput,
} from "../schemas/servidor.schema";

type TipoVinculoServidor = ServidorInput["vinculo"];

function normalizarVinculoServidor(
  valor: FormDataEntryValue | null,
): TipoVinculoServidor | undefined {
  const vinculo = String(valor ?? "");

  return tiposVinculoServidor.includes(vinculo as TipoVinculoServidor)
    ? (vinculo as TipoVinculoServidor)
    : undefined;
}

function extrairDadosServidor(formData: FormData): Partial<ServidorInput> {
  const sinalizacaoForaExpediente = String(
    formData.get("sinalizacaoForaExpediente") ?? "PADRAO",
  );

  const matricula = String(formData.get("matricula") ?? "").trim();
  const identificadores = formData
    .getAll("identificadoresPonto")
    .map((valor) => String(valor).trim())
    .filter(Boolean);

  return {
    orgaoId: String(formData.get("orgaoId") ?? ""),
    categoriaPessoaId: String(formData.get("categoriaPessoaId") ?? ""),
    matricula,
    cpf: String(formData.get("cpf") ?? "").replace(/\D/g, ""),
    pis: String(formData.get("pis") ?? "").replace(/\D/g, ""),
    nome: String(formData.get("nome") ?? "").trim(),
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    nomeFuncional: String(formData.get("nomeFuncional") ?? "").trim(),
    vinculo: normalizarVinculoServidor(formData.get("vinculo")),
    sinalizacaoForaExpediente: opcoesSinalizacaoForaExpediente.includes(
      sinalizacaoForaExpediente as ServidorInput["sinalizacaoForaExpediente"],
    )
      ? (sinalizacaoForaExpediente as ServidorInput["sinalizacaoForaExpediente"])
      : "PADRAO",
    ativo: formData.get("ativo") === "on" || formData.get("ativo") === "true",
    identificadoresPonto: Array.from(new Set([matricula, ...identificadores])),
  };
}

function deduplicarIdentificadoresPonto(valores: string[]) {
  const identificadores: string[] = [];
  const vistos = new Set<string>();

  for (const valor of valores) {
    const normalizado = normalizarIdentificadorPonto(valor);

    if (!normalizado || vistos.has(normalizado)) {
      continue;
    }

    vistos.add(normalizado);
    identificadores.push(valor.trim());
  }

  return identificadores;
}

export async function atualizarServidorAction(
  servidorId: string,
  _estadoAnterior: ServidorFormState,
  formData: FormData,
): Promise<ServidorFormState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "servidores:gerenciar:global",
  );

  const servidorAtual = await buscarServidorPorId(servidorId);

  if (!servidorAtual) {
    return {
      sucesso: false,
      mensagem: "Servidor não encontrado.",
    };
  }

  const dados = extrairDadosServidor(formData);
  const parsed = servidorSchema.safeParse(dados);

  if (!parsed.success) {
    return {
      sucesso: false,
      mensagem: "Verifique os campos do formulário.",
      erros: parsed.error.flatten().fieldErrors,
      campos: dados,
    };
  }

  const matricula = parsed.data.matricula;
  const identificadoresPonto = deduplicarIdentificadoresPonto(
    parsed.data.identificadoresPonto,
  );

  if (await matriculaServidorExiste(matricula, servidorId)) {
    return {
      sucesso: false,
      mensagem: "Já existe outro servidor com esta matrícula.",
      erros: {
        matricula: ["Já existe outro servidor com esta matrícula."],
      },
      campos: dados,
    };
  }

  if (await usuarioMatriculaExiste(matricula, servidorAtual.usuarioId)) {
    return {
      sucesso: false,
      mensagem: "Já existe outro usuário com esta matrícula.",
      erros: {
        matricula: ["Já existe outro usuário com esta matrícula."],
      },
      campos: dados,
    };
  }

  if (parsed.data.pis && (await pisServidorExiste(parsed.data.pis, servidorId))) {
    return {
      sucesso: false,
      mensagem: "Já existe outro servidor com este PIS/PASEP.",
      erros: {
        pis: ["Já existe outro servidor com este PIS/PASEP."],
      },
      campos: dados,
    };
  }

  for (const identificador of identificadoresPonto) {
    if (await identificadorPontoExiste(identificador, servidorId)) {
      return {
        sucesso: false,
        mensagem: "Ja existe outra pessoa com este identificador de ponto.",
        erros: {
          identificadoresPonto: [
            `Identificador ja vinculado a outra pessoa: ${identificador}`,
          ],
        },
        campos: dados,
      };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({
      where: {
        id: servidorAtual.usuarioId,
      },
      data: {
        matricula,
        cpf: parsed.data.cpf || null,
        nome: parsed.data.nome,
        email: parsed.data.email || null,
        ativo: parsed.data.ativo,
      },
    });

    await tx.servidor.update({
      where: {
        id: servidorId,
      },
      data: {
        orgaoId: parsed.data.orgaoId,
        categoriaPessoaId: parsed.data.categoriaPessoaId || null,
        matricula,
        cpf: parsed.data.cpf || null,
        pis: parsed.data.pis || null,
        nomeFuncional: parsed.data.nomeFuncional || null,
        vinculo: parsed.data.vinculo,
        horasForaExpedienteInconsistente:
          parsed.data.sinalizacaoForaExpediente === "PADRAO"
            ? null
            : parsed.data.sinalizacaoForaExpediente === "SINALIZAR",
        ativo: parsed.data.ativo,
      },
    });

    await tx.identificadorPontoServidor.deleteMany({
      where: {
        servidorId,
      },
    });

    await tx.identificadorPontoServidor.createMany({
      data: identificadoresPonto.map((identificador, indice) => ({
        servidorId,
        valor: identificador,
        valorNormalizado: normalizarIdentificadorPonto(identificador)!,
        principal: indice === 0,
      })),
      skipDuplicates: true,
    });

    await tx.auditoriaEvento.create({
      data: {
        usuarioId: permissao.usuarioId,
        entidade: "Servidor",
        entidadeId: servidorId,
        acao: "SERVIDOR_ATUALIZADO",
        dadosAntes: {
          servidor: {
            id: servidorAtual.id,
            matricula: servidorAtual.matricula,
            cpf: servidorAtual.cpf,
            pis: servidorAtual.pis,
            orgaoId: servidorAtual.orgaoId,
            categoriaPessoaId: servidorAtual.categoriaPessoaId,
            vinculo: servidorAtual.vinculo,
            nomeFuncional: servidorAtual.nomeFuncional,
            horasForaExpedienteInconsistente:
              servidorAtual.horasForaExpedienteInconsistente,
            ativo: servidorAtual.ativo,
          },
          usuario: {
            id: servidorAtual.usuario.id,
            matricula: servidorAtual.usuario.matricula,
            cpf: servidorAtual.usuario.cpf,
            nome: servidorAtual.usuario.nome,
            email: servidorAtual.usuario.email,
            ativo: servidorAtual.usuario.ativo,
          },
        },
        dadosDepois: {
          servidor: {
            id: servidorId,
            matricula,
            cpf: parsed.data.cpf || null,
            pis: parsed.data.pis || null,
            orgaoId: parsed.data.orgaoId,
            categoriaPessoaId: parsed.data.categoriaPessoaId || null,
            vinculo: parsed.data.vinculo,
            nomeFuncional: parsed.data.nomeFuncional || null,
            horasForaExpedienteInconsistente:
              parsed.data.sinalizacaoForaExpediente === "PADRAO"
                ? null
                : parsed.data.sinalizacaoForaExpediente === "SINALIZAR",
            ativo: parsed.data.ativo,
          },
          usuario: {
            id: servidorAtual.usuarioId,
            matricula,
            cpf: parsed.data.cpf || null,
            nome: parsed.data.nome,
            email: parsed.data.email || null,
            ativo: parsed.data.ativo,
          },
        },
      },
    });
  });

  await vincularMarcacoesBrutasServidorService({
    servidorId,
    cpf: parsed.data.cpf || null,
    pis: parsed.data.pis || null,
    matricula: parsed.data.matricula,
    identificadores: identificadoresPonto,
    usuarioIdAuditoria: permissao.usuarioId,
  });

  revalidatePath("/servidores");
  revalidatePath(`/servidores/${servidorId}`);

  redirect(`/servidores/${servidorId}`);
}
