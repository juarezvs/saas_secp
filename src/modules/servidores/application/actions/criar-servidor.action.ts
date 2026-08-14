"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { garantirJornadaPadraoServidorService } from "@/modules/jornadas/application/services/garantir-jornada-padrao-servidor.service";
import { vincularMarcacoesBrutasServidorService } from "@/modules/marcacoes-brutas/application/services/vincular-marcacoes-brutas-servidor.service";
import { prisma } from "@/shared/infrastructure/database/prisma";

import {
  cpfServidorExiste,
  identificadorPontoExiste,
  matriculaServidorExiste,
  normalizarIdentificadorPonto,
  pisServidorExiste,
  usuarioMatriculaExiste,
} from "../../infrastructure/repositories/servidor.repository";
import {
  opcoesSinalizacaoForaExpediente,
  servidorSchema,
  tiposUsuarioPessoaPonto,
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
  const tipoUsuario = String(formData.get("tipoUsuario") ?? "SERVIDOR");
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
    tipoUsuario: tiposUsuarioPessoaPonto.includes(
      tipoUsuario as ServidorInput["tipoUsuario"],
    )
      ? (tipoUsuario as ServidorInput["tipoUsuario"])
      : "SERVIDOR",
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

export async function criarServidorAction(
  _estadoAnterior: ServidorFormState,
  formData: FormData,
): Promise<ServidorFormState> {
  const permissao = await exigirPermissaoOuRedirecionar(
    "servidores:gerenciar:global",
  );

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

  if (await matriculaServidorExiste(matricula)) {
    return {
      sucesso: false,
      mensagem: "Já existe um servidor com esta matrícula.",
      erros: {
        matricula: ["Já existe um servidor com esta matrícula."],
      },
      campos: dados,
    };
  }

  if (parsed.data.cpf && (await cpfServidorExiste(parsed.data.cpf))) {
    return {
      sucesso: false,
      mensagem: "Já existe um servidor com este CPF.",
      erros: {
        cpf: ["Já existe um servidor com este CPF."],
      },
      campos: dados,
    };
  }

  if (parsed.data.pis && (await pisServidorExiste(parsed.data.pis))) {
    return {
      sucesso: false,
      mensagem: "Já existe um servidor com este PIS/PASEP.",
      erros: {
        pis: ["Já existe um servidor com este PIS/PASEP."],
      },
      campos: dados,
    };
  }

  if (await usuarioMatriculaExiste(matricula)) {
    return {
      sucesso: false,
      mensagem:
        "Já existe um usuário com esta matrícula. Verifique se o servidor já foi cadastrado.",
      erros: {
        matricula: ["Já existe um usuário com esta matrícula."],
      },
      campos: dados,
    };
  }

  for (const identificador of identificadoresPonto) {
    if (await identificadorPontoExiste(identificador)) {
      return {
        sucesso: false,
        mensagem: "Ja existe uma pessoa com este identificador de ponto.",
        erros: {
          identificadoresPonto: [
            `Identificador ja vinculado a outra pessoa: ${identificador}`,
          ],
        },
        campos: dados,
      };
    }
  }

  const servidor = await prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.create({
      data: {
        matricula,
        cpf: parsed.data.cpf || null,
        nome: parsed.data.nome,
        email: parsed.data.email || null,
        tipo: parsed.data.tipoUsuario,
        ativo: parsed.data.ativo,
      },
    });

    const novoServidor = await tx.servidor.create({
      data: {
        usuario: {
          connect: {
            id: usuario.id,
          },
        },
        orgao: {
          connect: {
            id: parsed.data.orgaoId,
          },
        },
        ...(parsed.data.categoriaPessoaId
          ? {
              categoriaPessoa: {
                connect: {
                  id: parsed.data.categoriaPessoaId,
                },
              },
            }
          : {}),
        matricula,
        cpf: parsed.data.cpf || null,
        pis: parsed.data.pis || null,
        nomeFuncional: parsed.data.nomeFuncional || parsed.data.nome,
        vinculo: parsed.data.vinculo,
        horasForaExpedienteInconsistente:
          parsed.data.sinalizacaoForaExpediente === "PADRAO"
            ? null
            : parsed.data.sinalizacaoForaExpediente === "SINALIZAR",
        ativo: parsed.data.ativo,
      },
    });

    await garantirJornadaPadraoServidorService(tx, novoServidor.id);

    await tx.identificadorPontoServidor.createMany({
      data: identificadoresPonto.map((identificador, indice) => ({
        servidorId: novoServidor.id,
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
        entidadeId: novoServidor.id,
        acao: "SERVIDOR_CRIADO",
        dadosDepois: {
          servidor: {
            id: novoServidor.id,
            matricula: novoServidor.matricula,
            cpf: novoServidor.cpf,
            pis: novoServidor.pis,
            orgaoId: novoServidor.orgaoId,
            categoriaPessoaId: novoServidor.categoriaPessoaId,
            vinculo: novoServidor.vinculo,
            horasForaExpedienteInconsistente:
              novoServidor.horasForaExpedienteInconsistente,
            ativo: novoServidor.ativo,
          },
          usuario: {
            id: usuario.id,
            matricula: usuario.matricula,
            cpf: usuario.cpf,
            nome: usuario.nome,
            email: usuario.email,
            tipo: usuario.tipo,
            ativo: usuario.ativo,
          },
        },
      },
    });

    return novoServidor;
  });

  await vincularMarcacoesBrutasServidorService({
    servidorId: servidor.id,
    cpf: parsed.data.cpf ?? null,
    pis: parsed.data.pis || null,
    matricula,
    identificadores: identificadoresPonto,
    usuarioIdAuditoria: permissao.usuarioId,
  });

  revalidatePath("/servidores");
  revalidatePath("/estagiarios");
  revalidatePath("/prestadores");
  revalidatePath("/voluntarios");
  revalidatePath(`/servidores/${servidor.id}`);

  redirect(`/servidores/${servidor.id}`);
}
