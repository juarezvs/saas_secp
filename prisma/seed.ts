import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não foi configurada.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const permissoesIniciais = [
  // Usuários / perfis / estrutura
  {
    recurso: "usuarios",
    acao: "gerenciar",
    escopo: "global",
    descricao: "Gerenciar usuários do sistema.",
  },
  {
    recurso: "usuarios",
    acao: "consultar",
    escopo: "global",
    descricao: "Consultar usuários do sistema.",
  },
  {
    recurso: "perfis",
    acao: "gerenciar",
    escopo: "global",
    descricao: "Gerenciar perfis e permissões.",
  },
  {
    recurso: "unidades",
    acao: "gerenciar",
    escopo: "global",
    descricao: "Gerenciar estrutura organizacional.",
  },
  {
    recurso: "servidores",
    acao: "gerenciar",
    escopo: "global",
    descricao: "Gerenciar servidores e vínculos.",
  },
  {
    recurso: "servidores",
    acao: "consultar",
    escopo: "global",
    descricao: "Consultar servidores.",
  },
  {
    recurso: "chefias",
    acao: "gerenciar",
    escopo: "global",
    descricao: "Gerenciar chefias, gestores, substitutos e delegações.",
  },
  {
    recurso: "configuracoes",
    acao: "gerenciar",
    escopo: "global",
    descricao: "Gerenciar parâmetros gerais do SECP.",
  },

  // Dashboard
  {
    recurso: "dashboard",
    acao: "visualizar",
    escopo: "proprio",
    descricao: "Visualizar dashboard próprio.",
  },

  // Jornadas
  {
    recurso: "jornadas",
    acao: "gerenciar",
    escopo: "global",
    descricao:
      "Gerenciar jornadas, escalas e atribuições de jornada aos servidores.",
  },
  {
    recurso: "jornadas",
    acao: "gerenciar-politicas",
    escopo: "global",
    descricao: "Gerenciar políticas de jornada.",
  },
  {
    recurso: "jornada",
    acao: "visualizar",
    escopo: "proprio",
    descricao: "Visualizar própria jornada.",
  },

  // Marcações
  {
    recurso: "marcacoes",
    acao: "registrar",
    escopo: "proprio",
    descricao: "Registrar a própria marcação de ponto.",
  },
  {
    recurso: "marcacoes",
    acao: "registrar-web",
    escopo: "proprio",
    descricao: "Registrar marcação via sistema web.",
  },
  {
    recurso: "marcacoes",
    acao: "registrar-facial",
    escopo: "proprio",
    descricao: "Registrar marcação por reconhecimento facial.",
  },
  {
    recurso: "marcacoes",
    acao: "consultar",
    escopo: "proprio",
    descricao: "Consultar as próprias marcações de ponto.",
  },
  {
    recurso: "marcacoes",
    acao: "visualizar",
    escopo: "proprio",
    descricao: "Visualizar próprias marcações.",
  },
  {
    recurso: "marcacoes",
    acao: "consultar",
    escopo: "global",
    descricao: "Consultar marcações de todos os servidores.",
  },
  {
    recurso: "marcacoes",
    acao: "gerenciar",
    escopo: "global",
    descricao: "Gerenciar marcações.",
  },

  // Apuração / espelho
  {
    recurso: "apuracao",
    acao: "consultar",
    escopo: "proprio",
    descricao: "Consultar a própria apuração diária e espelho de ponto.",
  },
  {
    recurso: "apuracao",
    acao: "consultar",
    escopo: "global",
    descricao: "Consultar apurações de todos os servidores.",
  },
  {
    recurso: "apuracao",
    acao: "recalcular",
    escopo: "global",
    descricao: "Recalcular apurações de frequência.",
  },
  {
    recurso: "espelho-ponto",
    acao: "visualizar",
    escopo: "proprio",
    descricao: "Visualizar próprio espelho de ponto.",
  },

  // Banco de horas
  {
    recurso: "banco-horas",
    acao: "consultar",
    escopo: "proprio",
    descricao: "Consultar o próprio banco de horas.",
  },
  {
    recurso: "banco-horas",
    acao: "visualizar",
    escopo: "proprio",
    descricao: "Visualizar próprio banco de horas.",
  },
  {
    recurso: "banco-horas",
    acao: "consultar",
    escopo: "global",
    descricao: "Consultar banco de horas de todos os servidores.",
  },
  {
    recurso: "banco-horas",
    acao: "gerenciar",
    escopo: "global",
    descricao: "Gerenciar e recalcular banco de horas.",
  },

  // Solicitações
  {
    recurso: "solicitacoes",
    acao: "criar",
    escopo: "proprio",
    descricao: "Criar solicitações próprias de frequência.",
  },
  {
    recurso: "solicitacoes",
    acao: "consultar",
    escopo: "proprio",
    descricao: "Consultar as próprias solicitações.",
  },
  {
    recurso: "solicitacoes",
    acao: "visualizar",
    escopo: "proprio",
    descricao: "Visualizar próprias solicitações.",
  },
  {
    recurso: "solicitacoes",
    acao: "analisar",
    escopo: "chefia",
    descricao: "Analisar solicitações dos subordinados.",
  },
  {
    recurso: "solicitacoes",
    acao: "consultar",
    escopo: "global",
    descricao: "Consultar todas as solicitações.",
  },

  // Homologação
  {
    recurso: "homologacao",
    acao: "gerenciar",
    escopo: "chefia",
    descricao: "Gerenciar homologação mensal dos servidores subordinados.",
  },
  {
    recurso: "homologacao",
    acao: "consultar",
    escopo: "proprio",
    descricao: "Consultar a própria homologação mensal.",
  },
  {
    recurso: "homologacao",
    acao: "consultar",
    escopo: "global",
    descricao: "Consultar homologações mensais de todas as unidades.",
  },
  {
    recurso: "homologacao",
    acao: "gerenciar",
    escopo: "global",
    descricao: "Gerenciar homologações mensais de todas as unidades.",
  },

  // Boletim de frequência
  {
    recurso: "boletim-frequencia",
    acao: "visualizar",
    escopo: "proprio",
    descricao: "Visualizar próprio boletim de frequência.",
  },
  {
    recurso: "boletim-frequencia",
    acao: "gerar",
    escopo: "chefia",
    descricao: "Gerar Boletim de Frequência da unidade homologada.",
  },
  {
    recurso: "boletim-frequencia",
    acao: "encaminhar",
    escopo: "chefia",
    descricao: "Encaminhar Boletim de Frequência à SECAP/NUCGP.",
  },
  {
    recurso: "boletim-frequencia",
    acao: "receber",
    escopo: "global",
    descricao: "Registrar recebimento/conferência do Boletim pela SECAP/NUCGP.",
  },
  {
    recurso: "boletim-frequencia",
    acao: "consultar",
    escopo: "global",
    descricao: "Consultar Boletins de Frequência.",
  },

  // Relatórios
  {
    recurso: "relatorios",
    acao: "consultar",
    escopo: "proprio",
    descricao:
      "Consultar relatórios próprios de frequência, espelho e banco de horas.",
  },
  {
    recurso: "relatorios",
    acao: "consultar",
    escopo: "global",
    descricao:
      "Consultar relatórios globais de frequência, espelho, banco de horas e boletins.",
  },
  {
    recurso: "relatorios",
    acao: "exportar",
    escopo: "proprio",
    descricao: "Exportar relatórios próprios em PDF.",
  },
  {
    recurso: "relatorios",
    acao: "exportar",
    escopo: "global",
    descricao: "Exportar relatórios globais em PDF.",
  },

  // Auditoria
  {
    recurso: "auditoria",
    acao: "consultar",
    escopo: "global",
    descricao: "Consultar trilhas de auditoria do sistema.",
  },
  {
    recurso: "auditoria",
    acao: "detalhar",
    escopo: "global",
    descricao: "Detalhar eventos de auditoria do sistema.",
  },
  {
    recurso: "auditoria",
    acao: "exportar",
    escopo: "global",
    descricao: "Exportar trilhas de auditoria.",
  },

  // Integrações
  {
    recurso: "integracoes",
    acao: "consultar",
    escopo: "global",
    descricao: "Consultar status, logs e equipamentos de integração.",
  },
  {
    recurso: "integracoes",
    acao: "gerenciar",
    escopo: "global",
    descricao: "Gerenciar integrações externas e equipamentos biométricos.",
  },
  {
    recurso: "integracoes",
    acao: "sincronizar",
    escopo: "global",
    descricao: "Executar sincronizações manuais com sistemas externos.",
  },
  {
    recurso: "integracoes",
    acao: "receber-webhook",
    escopo: "sistema",
    descricao: "Receber eventos externos por webhook.",
  },

  // Integração SARH
  {
    recurso: "integracoes-sarh",
    acao: "consultar",
    escopo: "global",
    descricao:
      "Consultar painel, execuções, itens, erros e conflitos da integração SARH.",
  },
  {
    recurso: "integracoes-sarh",
    acao: "configurar",
    escopo: "global",
    descricao:
      "Configurar URL base, endpoints, timeouts e parâmetros da integração SARH.",
  },
  {
    recurso: "integracoes-sarh",
    acao: "executar",
    escopo: "global",
    descricao: "Executar carga inicial ou sincronização manual com o SARH.",
  },
  {
    recurso: "integracoes-sarh",
    acao: "simular",
    escopo: "global",
    descricao:
      "Executar simulação/dry-run da sincronização SARH sem gravar alterações de domínio.",
  },
  {
    recurso: "integracoes-sarh",
    acao: "reprocessar",
    escopo: "global",
    descricao:
      "Reprocessar item, matrícula, unidade, cargo ou execução SARH com falha.",
  },
  {
    recurso: "integracoes-sarh",
    acao: "resolver-conflito",
    escopo: "global",
    descricao:
      "Resolver conflitos entre dados do SARH e dados protegidos do SECP.",
  },
  {
    recurso: "integracoes-sarh",
    acao: "visualizar-payload",
    escopo: "global",
    descricao: "Visualizar payload bruto do SARH, com cuidados de LGPD.",
  },

  // Biometria
  {
    recurso: "biometria",
    acao: "consultar",
    escopo: "proprio",
    descricao: "Consultar o próprio cadastro biométrico facial.",
  },
  {
    recurso: "biometria",
    acao: "cadastrar",
    escopo: "proprio",
    descricao: "Cadastrar a própria biometria facial.",
  },
  {
    recurso: "biometria",
    acao: "validar",
    escopo: "proprio",
    descricao: "Validar marcação com biometria facial própria.",
  },
  {
    recurso: "biometria",
    acao: "gerenciar",
    escopo: "global",
    descricao: "Gerenciar cadastros biométricos faciais.",
  },

  // AFD
  {
    recurso: "afd",
    acao: "importar",
    escopo: "global",
    descricao: "Importar arquivos AFD de equipamentos biométricos.",
  },
];

const codigosPermissoesServidor = [
  "dashboard:visualizar:proprio",
  "marcacoes:registrar:proprio",
  "marcacoes:registrar-web:proprio",
  "marcacoes:registrar-facial:proprio",
  "marcacoes:consultar:proprio",
  "marcacoes:visualizar:proprio",
  "apuracao:consultar:proprio",
  "espelho-ponto:visualizar:proprio",
  "banco-horas:consultar:proprio",
  "banco-horas:visualizar:proprio",
  "solicitacoes:criar:proprio",
  "solicitacoes:consultar:proprio",
  "solicitacoes:visualizar:proprio",
  "homologacao:consultar:proprio",
  "boletim-frequencia:visualizar:proprio",
  "relatorios:consultar:proprio",
  "relatorios:exportar:proprio",
  "jornada:visualizar:proprio",
  "biometria:consultar:proprio",
  "biometria:cadastrar:proprio",
  "biometria:validar:proprio",
];

function codigoPermissao(item: {
  recurso: string;
  acao: string;
  escopo: string;
}) {
  return `${item.recurso}:${item.acao}:${item.escopo}`;
}

async function criarPermissoes() {
  const permissoes = [];
  const codigosCriados = new Set<string>();

  for (const item of permissoesIniciais) {
    const codigo = codigoPermissao(item);

    if (codigosCriados.has(codigo)) {
      continue;
    }

    codigosCriados.add(codigo);

    const permissao = await prisma.permissao.upsert({
      where: { codigo },
      update: {
        recurso: item.recurso,
        acao: item.acao,
        escopo: item.escopo,
        descricao: item.descricao,
      },
      create: {
        codigo,
        recurso: item.recurso,
        acao: item.acao,
        escopo: item.escopo,
        descricao: item.descricao,
      },
    });

    permissoes.push(permissao);
  }

  return permissoes;
}

async function criarPerfilAdministrador() {
  return prisma.perfil.upsert({
    where: { codigo: "ADMIN" },
    update: {
      nome: "Administrador do Sistema",
      descricao:
        "Perfil com acesso integral às configurações iniciais do SECP.",
      sistema: true,
      ativo: true,
    },
    create: {
      codigo: "ADMIN",
      nome: "Administrador do Sistema",
      descricao:
        "Perfil com acesso integral às configurações iniciais do SECP.",
      sistema: true,
      ativo: true,
    },
  });
}

async function criarPerfilServidor() {
  return prisma.perfil.upsert({
    where: { codigo: "SERVIDOR" },
    update: {
      nome: "Servidor",
      descricao: "Perfil básico para servidores utilizarem o SECP.",
      sistema: true,
      ativo: true,
    },
    create: {
      codigo: "SERVIDOR",
      nome: "Servidor",
      descricao: "Perfil básico para servidores utilizarem o SECP.",
      sistema: true,
      ativo: true,
    },
  });
}

async function vincularPermissoesAoPerfil(
  perfilId: string,
  permissoes: Array<{ id: string }>,
) {
  for (const permissao of permissoes) {
    await prisma.perfilPermissao.upsert({
      where: {
        perfilId_permissaoId: {
          perfilId,
          permissaoId: permissao.id,
        },
      },
      update: {},
      create: {
        perfilId,
        permissaoId: permissao.id,
      },
    });
  }
}

async function vincularPermissoesPorCodigoAoPerfil(
  perfilId: string,
  codigos: string[],
) {
  for (const codigo of codigos) {
    const permissao = await prisma.permissao.findUnique({
      where: { codigo },
    });

    if (!permissao) {
      console.warn(`Permissão não encontrada no seed: ${codigo}`);
      continue;
    }

    await prisma.perfilPermissao.upsert({
      where: {
        perfilId_permissaoId: {
          perfilId,
          permissaoId: permissao.id,
        },
      },
      update: {},
      create: {
        perfilId,
        permissaoId: permissao.id,
      },
    });
  }
}

async function criarUsuarioInicial(perfilId: string) {
  const matricula = process.env.SECP_ADMIN_MATRICULA ?? "secp";
  const senha = process.env.SECP_ADMIN_SENHA ?? "secp";
  const nome = process.env.SECP_ADMIN_NOME ?? "Administrador SECP";
  const email = process.env.SECP_ADMIN_EMAIL ?? "secp@localhost";

  const senhaHash = await bcrypt.hash(senha, 12);

  const usuario = await prisma.usuario.upsert({
    where: { matricula },
    update: {
      nome,
      
      email,
      senhaHash,
      ativo: true,
      tipo: "SISTEMA",
    },
    create: {
      matricula,
      nome,
      email,
      senhaHash,
      ativo: true,
      tipo: "SISTEMA",
    },
  });

  await prisma.usuarioPerfil.upsert({
    where: {
      usuarioId_perfilId: {
        usuarioId: usuario.id,
        perfilId,
      },
    },
    update: {
      ativo: true,
    },
    create: {
      usuarioId: usuario.id,
      perfilId,
      ativo: true,
    },
  });

  return usuario;
}

async function criarEstruturaInicial() {
  const orgao = await prisma.orgao.upsert({
    where: { sigla: "JFAM" },
    update: {
      nome: "Justiça Federal de Primeiro Grau no Amazonas",
      ativo: true,
    },
    create: {
      sigla: "JFAM",
      nome: "Justiça Federal de Primeiro Grau no Amazonas",
      ativo: true,
    },
  });

  const sjam = await prisma.unidadeOrganizacional.upsert({
    where: {
      orgaoId_codigo: {
        orgaoId: orgao.id,
        codigo: "SJAM",
      },
    },
    update: {
      sigla: "SJAM",
      nome: "Seção Judiciária do Amazonas",
      tipo: "SECAO_JUDICIARIA",
      ativo: true,
    },
    create: {
      orgaoId: orgao.id,
      codigo: "SJAM",
      sigla: "SJAM",
      nome: "Seção Judiciária do Amazonas",
      tipo: "SECAO_JUDICIARIA",
      ativo: true,
    },
  });

  await prisma.unidadeOrganizacional.upsert({
    where: {
      orgaoId_codigo: {
        orgaoId: orgao.id,
        codigo: "NUTEC",
      },
    },
    update: {
      unidadePaiId: sjam.id,
      sigla: "NUTEC",
      nome: "Núcleo de Tecnologia da Informação",
      tipo: "NUCLEO",
      ativo: true,
    },
    create: {
      orgaoId: orgao.id,
      unidadePaiId: sjam.id,
      codigo: "NUTEC",
      sigla: "NUTEC",
      nome: "Núcleo de Tecnologia da Informação",
      tipo: "NUCLEO",
      ativo: true,
    },
  });

  await prisma.unidadeOrganizacional.upsert({
    where: {
      orgaoId_codigo: {
        orgaoId: orgao.id,
        codigo: "NUCGP",
      },
    },
    update: {
      unidadePaiId: sjam.id,
      sigla: "NUCGP",
      nome: "Núcleo de Gestão de Pessoas",
      tipo: "NUCLEO",
      ativo: true,
    },
    create: {
      orgaoId: orgao.id,
      unidadePaiId: sjam.id,
      codigo: "NUCGP",
      sigla: "NUCGP",
      nome: "Núcleo de Gestão de Pessoas",
      tipo: "NUCLEO",
      ativo: true,
    },
  });

  await prisma.unidadeOrganizacional.upsert({
    where: {
      orgaoId_codigo: {
        orgaoId: orgao.id,
        codigo: "SECAD",
      },
    },
    update: {
      unidadePaiId: sjam.id,
      sigla: "SECAD",
      nome: "Secretaria Administrativa",
      tipo: "SECRETARIA",
      ativo: true,
    },
    create: {
      orgaoId: orgao.id,
      unidadePaiId: sjam.id,
      codigo: "SECAD",
      sigla: "SECAD",
      nome: "Secretaria Administrativa",
      tipo: "SECRETARIA",
      ativo: true,
    },
  });

  return orgao;
}

async function criarJornadasPadrao() {
  const jornada7h = await prisma.jornada.upsert({
    where: { codigo: "JORNADA_7H" },
    update: {
      nome: "Jornada ordinária de 7 horas",
      descricao:
        "Jornada de 7 horas ininterruptas, conforme Portaria SJAM-DIREF 135/2025.",
      tipo: "SETE_HORAS",
      cargaDiariaMinutos: 420,
      exigeIntervalo: false,
      intervaloMinimoMinutos: null,
      intervaloMaximoMinutos: null,
      horarioEntradaPadrao: "08:00",
      horarioSaidaPadrao: "15:00",
      horarioDiferenciadoPermitido: true,
      entradaMinimaDiferenciada: "06:00",
      saidaMaximaDiferenciada: "19:00",
      ativo: true,
    },
    create: {
      codigo: "JORNADA_7H",
      nome: "Jornada ordinária de 7 horas",
      descricao:
        "Jornada de 7 horas ininterruptas, conforme Portaria SJAM-DIREF 135/2025.",
      tipo: "SETE_HORAS",
      cargaDiariaMinutos: 420,
      exigeIntervalo: false,
      horarioEntradaPadrao: "08:00",
      horarioSaidaPadrao: "15:00",
      horarioDiferenciadoPermitido: true,
      entradaMinimaDiferenciada: "06:00",
      saidaMaximaDiferenciada: "19:00",
      ativo: true,
    },
  });

  const jornada8h = await prisma.jornada.upsert({
    where: { codigo: "JORNADA_8H" },
    update: {
      nome: "Jornada ordinária de 8 horas",
      descricao: "Jornada de 8 horas em dois turnos, com intervalo de 1h a 3h.",
      tipo: "OITO_HORAS",
      cargaDiariaMinutos: 480,
      exigeIntervalo: true,
      intervaloMinimoMinutos: 60,
      intervaloMaximoMinutos: 180,
      horarioEntradaPadrao: "08:00",
      horarioSaidaPadrao: "17:00",
      horarioDiferenciadoPermitido: true,
      entradaMinimaDiferenciada: "06:00",
      saidaMaximaDiferenciada: "19:00",
      ativo: true,
    },
    create: {
      codigo: "JORNADA_8H",
      nome: "Jornada ordinária de 8 horas",
      descricao: "Jornada de 8 horas em dois turnos, com intervalo de 1h a 3h.",
      tipo: "OITO_HORAS",
      cargaDiariaMinutos: 480,
      exigeIntervalo: true,
      intervaloMinimoMinutos: 60,
      intervaloMaximoMinutos: 180,
      horarioEntradaPadrao: "08:00",
      horarioSaidaPadrao: "17:00",
      horarioDiferenciadoPermitido: true,
      entradaMinimaDiferenciada: "06:00",
      saidaMaximaDiferenciada: "19:00",
      ativo: true,
    },
  });

  return [jornada7h, jornada8h];
}


async function criarIntegracaoSarh() {
  const baseUrl =
    process.env.SARH_BASE_URL ?? "http://sarh.integracao.am.trf1.gov.br";

  const existente = await prisma.integracaoSistema.findFirst({
    where: {
      tipo: "SARH",
      nome: "SARH - Sistema de Gestão de Recursos Humanos",
    },
  });

  const data = {
    nome: "SARH - Sistema de Gestão de Recursos Humanos",
    tipo: "SARH" as const,
    status: "ATIVA" as const,
    direcao: "ENTRADA" as const,
    baseUrl,
    descricao:
      "Integração para carga e sincronização de empresas, lotações, cargos, servidores e lotações dos servidores a partir do SARH.",
    ativo: true,
    configuracao: {
      endpoints: {
        empresas: "/empresas",
        lotacoes: "/lotacao",
        cargos: "/cargos",
        servidores: "/servidores/",
        lotacoesServidores: "/lotacao-servidor/",
      },
      timeoutMs: Number(process.env.SARH_TIMEOUT_MS ?? 30000),
      modoPadrao: "SINCRONIZACAO_COMPLETA",
      permiteDryRun: true,
      cpfComoString: true,
      fonteOficial: ["servidores", "lotacoes", "cargos"],
      camposProtegidosSecp: [
        "jornada",
        "escala",
        "perfil",
        "permissoes",
        "biometria",
        "bancoHoras",
        "marcacoes",
        "homologacoes",
      ],
    },
  };

  if (existente) {
    return prisma.integracaoSistema.update({
      where: { id: existente.id },
      data,
    });
  }

  return prisma.integracaoSistema.create({ data });
}

async function main() {
  console.log("Iniciando seed do SECP...");

  const permissoes = await criarPermissoes();

  const perfilAdmin = await criarPerfilAdministrador();
  const perfilServidor = await criarPerfilServidor();

  await vincularPermissoesAoPerfil(perfilAdmin.id, permissoes);
  await vincularPermissoesPorCodigoAoPerfil(
    perfilServidor.id,
    codigosPermissoesServidor,
  );

  const usuarioInicial = await criarUsuarioInicial(perfilAdmin.id);

  await criarEstruturaInicial();
  await criarJornadasPadrao();
  const integracaoSarh = await criarIntegracaoSarh();

  await prisma.auditoriaEvento.create({
    data: {
      usuarioId: usuarioInicial.id,
      entidade: "Sistema",
      entidadeId: "seed-inicial",
      acao: "SEED_INICIAL_EXECUTADO",
      dadosDepois: {
        usuarioInicial: usuarioInicial.matricula,
        perfis: ["ADMIN", "SERVIDOR"],
        estrutura: ["JFAM", "SJAM", "NUTEC", "NUCGP", "SECAD"],
        jornadas: ["JORNADA_7H", "JORNADA_8H"],
        integracoes: [integracaoSarh.nome],
      },
    },
  });

  console.log("Seed concluído com sucesso.");
  console.log(`Usuário inicial: ${usuarioInicial.matricula}`);
  console.log(
    "Senha inicial: valor definido em SECP_ADMIN_SENHA ou padrão secp.",
  );
}

main()
  .catch((error) => {
    console.error("Erro ao executar seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
