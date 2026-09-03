import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/shared/infrastructure/database/prisma";
import {
  coletarMarcacoesRelogioPontoService,
  consultarSaudeRelogioPontoService,
  listarCadastrosBiometricosEquipamentoService,
} from "@/modules/integracoes/application/services/relogios-ponto/relogio-ponto-operacoes.service";
import { vincularMarcacoesBrutasServidorService } from "@/modules/marcacoes-brutas/application/services/vincular-marcacoes-brutas-servidor.service";
import { normalizarIdentificadorPonto } from "@/modules/servidores/infrastructure/repositories/servidor.repository";

type CadastroLido = {
  equipamentoCodigo: string;
  equipamentoNome: string;
  equipamentoIp: string | null;
  codigo: string;
  matriculaEquipamento: string;
  identificadorAssociacao: string;
  nomeEquipamento: string | null;
  cpf: string | null;
  servidorId: string | null;
  servidorNome: string | null;
  servidorMatricula: string | null;
  acao: string;
  motivo: string;
};

function argFlag(nome: string) {
  return process.argv.includes(`--${nome}`);
}

function argValor(nome: string, padrao: string) {
  const prefixo = `--${nome}=`;
  return (
    process.argv.find((arg) => arg.startsWith(prefixo))?.slice(prefixo.length) ??
    padrao
  );
}

function somenteDigitos(valor: string | null | undefined) {
  return valor?.replace(/\D/g, "") || null;
}

function normalizarNome(valor: string | null | undefined) {
  return (
    valor
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase() || null
  );
}

function similaridadeJaccard(a: string, b: string) {
  const tokensA = new Set(a.split(" ").filter((token) => token.length > 2));
  const tokensB = new Set(b.split(" ").filter((token) => token.length > 2));
  const intersecao = new Set([...tokensA].filter((token) => tokensB.has(token)));
  const uniao = new Set([...tokensA, ...tokensB]);

  return uniao.size === 0 ? 0 : intersecao.size / uniao.size;
}

function nomesCompativeis(nomeEquipamento: string, nomeServidor: string) {
  if (nomeEquipamento === nomeServidor) return true;

  const score = similaridadeJaccard(nomeEquipamento, nomeServidor);
  return score >= 0.92;
}

function ehCpfOuPis(valor: string | null | undefined) {
  const digitos = somenteDigitos(valor);
  if (!digitos) return false;

  return (
    digitos.length === 11 || (digitos.length === 12 && digitos.startsWith("0"))
  );
}

function lerConfig(configuracao: unknown) {
  return configuracao && typeof configuracao === "object"
    ? (configuracao as Record<string, unknown>)
    : {};
}

function numeroConfig(configuracao: Record<string, unknown>, chave: string) {
  const numero = Number(configuracao[chave]);
  return Number.isFinite(numero) ? numero : null;
}

async function carregarServidoresSjrr(orgaoId: string) {
  const servidores = await prisma.servidor.findMany({
    where: { ativo: true, orgaoId },
    select: {
      id: true,
      matricula: true,
      cpf: true,
      pis: true,
      nomeFuncional: true,
      nomeCompletoSarh: true,
      identificadoresPonto: {
        where: { ativo: true },
        select: { valor: true, valorNormalizado: true },
      },
    },
    orderBy: { nomeFuncional: "asc" },
  });

  return servidores.map((servidor) => ({
    ...servidor,
    nomesNormalizados: [
      normalizarNome(servidor.nomeFuncional),
      normalizarNome(servidor.nomeCompletoSarh),
    ].filter((nome): nome is string => Boolean(nome)),
  }));
}

async function main() {
  const aplicar = argFlag("aplicar");
  const coletar = !argFlag("sem-coleta");
  const reprocessar = !argFlag("sem-reprocessamento");
  const quantidade = Number(argValor("quantidade", "200"));
  const janelaNsr = Number(argValor("janela-nsr", "200"));
  const quantidadeCadastros = Number(argValor("quantidade-cadastros", "500"));
  const limiteCadastrosPorEquipamento = Number(
    argValor("limite-cadastros-por-equipamento", "10000"),
  );
  const saidaDir = argValor("saida-dir", "/tmp/secp-auditoria-sjrr");
  const agora = new Date();
  const sufixo = agora.toISOString().replace(/[:.]/g, "-");
  const arquivo = path.join(saidaDir, `sjrr-identificadores-${sufixo}.txt`);

  const orgao = await prisma.orgao.findFirst({
    where: { sigla: { equals: "SJRR", mode: "insensitive" } },
    select: { id: true, sigla: true, nome: true },
  });

  if (!orgao) {
    throw new Error("Orgao SJRR nao encontrado no SECP.");
  }

  const equipamentos = await prisma.equipamentoBiometrico.findMany({
    where: {
      ativo: true,
      ip: { not: null },
      OR: [{ orgaoId: orgao.id }, { unidade: { orgaoId: orgao.id } }],
    },
    include: {
      orgao: { select: { sigla: true } },
      unidade: { select: { orgao: { select: { sigla: true } } } },
    },
    orderBy: [{ ip: "asc" }, { codigo: "asc" }],
  });

  const servidores = await carregarServidoresSjrr(orgao.id);
  const linhas: string[] = [];
  const cadastrosLidos: CadastroLido[] = [];
  const resumosColeta = [];
  const alteracoes = [];
  const reprocessarServidores = new Map<
    string,
    {
      servidorId: string;
      matricula: string;
      cpf: string | null;
      pis: string | null;
      nome: string | null;
      identificadores: Set<string>;
    }
  >();
  const reprocessamentos = [];

  linhas.push(`Auditoria de coleta SJRR - ${agora.toISOString()}`);
  linhas.push(`Orgao: ${orgao.sigla} - ${orgao.nome} (${orgao.id})`);
  linhas.push(`Modo: ${aplicar ? "APLICAR" : "SIMULACAO"}`);
  linhas.push(`Equipamentos ativos com IP: ${equipamentos.length}`);
  linhas.push("");

  for (const equipamento of equipamentos) {
    console.log(
      JSON.stringify({
        etapa: "equipamento",
        codigo: equipamento.codigo,
        ip: equipamento.ip,
      }),
    );

    const config = lerConfig(equipamento.configuracao);
    const proximoNsr =
      numeroConfig(config, "proximoNsrColeta") ??
      numeroConfig(config, "ultimoNsrColetado") ??
      null;
    const nsrInicial =
      proximoNsr === null ? 1 : Math.max(1, proximoNsr - janelaNsr);

    linhas.push(
      `EQUIPAMENTO: ${equipamento.codigo} | ${equipamento.nome} | ${equipamento.fabricante ?? ""} ${equipamento.modelo ?? ""} | ${equipamento.ip}:${equipamento.porta ?? ""}`,
    );

    const saude = await consultarSaudeRelogioPontoService(equipamento.id);
    linhas.push(`  Comunicacao: ${saude.status} - ${saude.mensagem}`);

    try {
      const cadastrosAcumulados = [];
      for (
        let offset = 0;
        offset < limiteCadastrosPorEquipamento;
        offset += quantidadeCadastros
      ) {
        const pagina = await listarCadastrosBiometricosEquipamentoService({
          equipamentoId: equipamento.id,
          quantidade: quantidadeCadastros,
          indiceInicial: offset,
          incluirTemplates: false,
        });

        cadastrosAcumulados.push(...pagina.cadastros);

        if (pagina.cadastros.length < quantidadeCadastros) {
          break;
        }
      }

      linhas.push(`  Cadastros lidos: ${cadastrosAcumulados.length}`);

      for (const cadastro of cadastrosAcumulados) {
        const nomeCadastro = normalizarNome(cadastro.nome);
        const candidatosPorNome = nomeCadastro
          ? servidores.filter((servidor) =>
              servidor.nomesNormalizados.some((nomeServidor) =>
                nomesCompativeis(nomeCadastro, nomeServidor),
              ),
            )
          : [];
        const servidor =
          candidatosPorNome.length === 1 ? candidatosPorNome[0] : null;
        const codigoEquipamento = cadastro.codigo?.trim() || null;
        const matriculaEquipamento = cadastro.matricula?.trim() || null;
        const matriculaServidorNormalizada = normalizarIdentificadorPonto(
          servidor?.matricula,
        );
        const matriculaEquipamentoNormalizada =
          normalizarIdentificadorPonto(matriculaEquipamento);
        const identificadorAssociacao =
          servidor &&
          matriculaEquipamento &&
          matriculaEquipamentoNormalizada !== matriculaServidorNormalizada &&
          !ehCpfOuPis(matriculaEquipamento)
            ? matriculaEquipamento
            : servidor &&
                codigoEquipamento &&
                !matriculaEquipamento &&
                normalizarIdentificadorPonto(codigoEquipamento) !==
                  matriculaServidorNormalizada
              ? codigoEquipamento
              : null;
        let acao = "NAO_ALTERADO";
        let motivo =
          candidatosPorNome.length === 0
            ? "sem correspondencia unica por nome"
            : candidatosPorNome.length > 1
              ? "nome ambiguo no SECP"
              : matriculaEquipamentoNormalizada === matriculaServidorNormalizada
                ? "matricula do equipamento ja corresponde a matricula do SECP"
                : "correspondencia unica por nome";

        if (servidor && identificadorAssociacao) {
          const valorNormalizado = normalizarIdentificadorPonto(
            identificadorAssociacao,
          );
          const jaExisteNoServidor = servidor.identificadoresPonto.some(
            (identificador) =>
              identificador.valorNormalizado === valorNormalizado,
          );

          if (jaExisteNoServidor) {
            acao = "JA_EXISTIA";
          } else if (valorNormalizado) {
            const conflito =
              await prisma.identificadorPontoServidor.findUnique({
                where: { valorNormalizado },
                select: {
                  servidorId: true,
                  servidor: {
                    select: { matricula: true, nomeFuncional: true },
                  },
                },
              });

            if (conflito) {
              if (conflito.servidorId === servidor.id) {
                acao = "JA_EXISTIA";
                motivo = "identificador ja estava vinculado ao mesmo servidor";
              } else {
                acao = "CONFLITO";
                motivo = `identificador ja pertence a ${conflito.servidor.matricula} - ${conflito.servidor.nomeFuncional ?? ""}`;
              }
            } else if (aplicar) {
              await prisma.identificadorPontoServidor.create({
                data: {
                  servidorId: servidor.id,
                  valor: identificadorAssociacao,
                  valorNormalizado,
                  principal: false,
                  ativo: true,
                },
              });
              const alvoReprocessamento = reprocessarServidores.get(
                servidor.id,
              ) ?? {
                servidorId: servidor.id,
                matricula: servidor.matricula,
                cpf: servidor.cpf,
                pis: servidor.pis,
                nome: servidor.nomeFuncional ?? servidor.nomeCompletoSarh,
                identificadores: new Set(
                  servidor.identificadoresPonto.map(
                    (identificador) => identificador.valor,
                  ),
                ),
              };
              alvoReprocessamento.identificadores.add(identificadorAssociacao);
              reprocessarServidores.set(servidor.id, alvoReprocessamento);

              alteracoes.push({
                servidor: servidor.matricula,
                nome: servidor.nomeFuncional ?? servidor.nomeCompletoSarh,
                identificador: identificadorAssociacao,
              });
              acao = "INSERIDO";
            } else {
              acao = "INSERIRIA";
            }
          }
        }

        cadastrosLidos.push({
          equipamentoCodigo: equipamento.codigo,
          equipamentoNome: equipamento.nome,
          equipamentoIp: equipamento.ip,
          codigo: codigoEquipamento ?? "",
          matriculaEquipamento: matriculaEquipamento ?? "",
          identificadorAssociacao: identificadorAssociacao ?? "",
          nomeEquipamento: cadastro.nome ?? null,
          cpf: cadastro.cpf ?? null,
          servidorId: servidor?.id ?? null,
          servidorNome:
            servidor?.nomeFuncional ?? servidor?.nomeCompletoSarh ?? null,
          servidorMatricula: servidor?.matricula ?? null,
          acao,
          motivo,
        });
      }
    } catch (error) {
      linhas.push(
        `  Cadastros lidos: ERRO - ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    if (coletar) {
      try {
        const antes = await prisma.marcacaoBruta.count({
          where: { equipamentoId: equipamento.id },
        });
        const coleta = await coletarMarcacoesRelogioPontoService({
          equipamentoId: equipamento.id,
          nsrInicial,
          quantidade,
          atualizarCursor: false,
        });
        const depois = await prisma.marcacaoBruta.count({
          where: { equipamentoId: equipamento.id },
        });
        const recentes = await prisma.marcacaoBruta.groupBy({
          by: ["processada"],
          where: {
            equipamentoId: equipamento.id,
            origem: "EQUIPAMENTO_BIOMETRICO",
            criadoEm: { gte: new Date(Date.now() - 30 * 60 * 1000) },
          },
          _count: { _all: true },
        });

        resumosColeta.push({
          equipamento: equipamento.codigo,
          ip: equipamento.ip,
          nsrInicial,
          sucesso: true,
          recebidas: coleta.marcacoes.length,
          criadas: coleta.criadas,
          processadas: coleta.processadas,
          antes,
          depois,
          recentes,
          mensagem: coleta.mensagem,
        });
        linhas.push(
          `  Coleta recente: OK | nsrInicial=${nsrInicial} | recebidas=${coleta.marcacoes.length} | criadas=${coleta.criadas} | processadas=${coleta.processadas}`,
        );
      } catch (error) {
        resumosColeta.push({
          equipamento: equipamento.codigo,
          ip: equipamento.ip,
          nsrInicial,
          sucesso: false,
          erro: error instanceof Error ? error.message : String(error),
        });
        linhas.push(
          `  Coleta recente: ERRO | nsrInicial=${nsrInicial} | ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    linhas.push("");
  }

  if (aplicar && reprocessar) {
    for (const alvo of reprocessarServidores.values()) {
      console.log(
        JSON.stringify({
          etapa: "reprocessamento",
          servidor: alvo.matricula,
          identificadores: alvo.identificadores.size,
        }),
      );

      const resultado = await vincularMarcacoesBrutasServidorService({
        servidorId: alvo.servidorId,
        cpf: alvo.cpf,
        pis: alvo.pis,
        matricula: alvo.matricula,
        identificadores: Array.from(alvo.identificadores),
        usuarioIdAuditoria: null,
      });

      reprocessamentos.push({
        servidor: alvo.matricula,
        nome: alvo.nome,
        resultado,
      });
    }
  }

  linhas.push("LISTA DE IDENTIFICADORES");
  linhas.push(
    "nome_servidor_secp\tcodigo_identificador_equipamento\tmatricula_secp\tmatricula_no_equipamento\tidentificador_incluido_no_secp\tnome_no_equipamento\tequipamento\tip\tacao\tmotivo",
  );

  for (const item of cadastrosLidos) {
    linhas.push(
      [
        item.servidorNome ?? "",
        item.codigo,
        item.servidorMatricula ?? "",
        item.matriculaEquipamento,
        item.identificadorAssociacao,
        item.nomeEquipamento ?? "",
        `${item.equipamentoCodigo} - ${item.equipamentoNome}`,
        item.equipamentoIp ?? "",
        item.acao,
        item.motivo,
      ].join("\t"),
    );
  }

  linhas.push("");
  linhas.push("RESUMO_COLETAS_JSON");
  linhas.push(JSON.stringify(resumosColeta, null, 2));
  linhas.push("");
  linhas.push("ALTERACOES_JSON");
  linhas.push(JSON.stringify(alteracoes, null, 2));
  linhas.push("");
  linhas.push("REPROCESSAMENTOS_JSON");
  linhas.push(JSON.stringify(reprocessamentos, null, 2));

  await mkdir(saidaDir, { recursive: true });
  await writeFile(arquivo, `${linhas.join("\n")}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        arquivo,
        modo: aplicar ? "APLICAR" : "SIMULACAO",
        equipamentos: equipamentos.length,
        cadastros: cadastrosLidos.length,
        alteracoes: alteracoes.length,
        coletasOk: resumosColeta.filter((item) => item.sucesso).length,
        coletasErro: resumosColeta.filter((item) => !item.sucesso).length,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
