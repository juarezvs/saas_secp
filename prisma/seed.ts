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
  {
    recurso: "usuarios",
    acao: "gerenciar",
    escopo: "global",
    descricao: "Gerenciar usuários do sistema.",
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
    recurso: "chefias",
    acao: "gerenciar",
    escopo: "global",
    descricao: "Gerenciar chefias, gestores, substitutos e delegações.",
  },
  {
    recurso: "auditoria",
    acao: "consultar",
    escopo: "global",
    descricao: "Consultar trilhas de auditoria.",
  },
  {
    recurso: "configuracoes",
    acao: "gerenciar",
    escopo: "global",
    descricao: "Gerenciar parâmetros gerais do SECP.",
  },
  {
    recurso: "jornadas",
    acao: "gerenciar",
    escopo: "global",
    descricao:
      "Gerenciar jornadas, escalas e atribuições de jornada aos servidores.",
  },
  {
    recurso: "marcacoes",
    acao: "registrar",
    escopo: "proprio",
    descricao: "Registrar a própria marcação de ponto.",
  },
  {
    recurso: "marcacoes",
    acao: "consultar",
    escopo: "proprio",
    descricao: "Consultar as próprias marcações de ponto.",
  },
  {
    recurso: "marcacoes",
    acao: "consultar",
    escopo: "global",
    descricao: "Consultar marcações de todos os servidores.",
  },
  {
    recurso: "apuracao",
    acao: "consultar",
    escopo: "proprio",
    descricao: "Consultar a própria apuração diária e espelho de ponto.",
  },
  {
    recurso: "apuracao",
    acao: "recalcular",
    escopo: "global",
    descricao: "Recalcular apurações de frequência.",
  },
  {
    recurso: "apuracao",
    acao: "consultar",
    escopo: "global",
    descricao: "Consultar apurações de todos os servidores.",
  },
  {
    recurso: "banco-horas",
    acao: "consultar",
    escopo: "proprio",
    descricao: "Consultar o próprio banco de horas.",
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
];

async function criarPermissoes() {
  const permissoes = [];

  for (const item of permissoesIniciais) {
    const codigo = `${item.recurso}:${item.acao}:${item.escopo}`;

    const permissao = await prisma.permissao.upsert({
      where: { codigo },
      update: {
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

async function main() {
  console.log("Iniciando seed do SECP...");

  const permissoes = await criarPermissoes();
  const perfilAdmin = await criarPerfilAdministrador();

  await vincularPermissoesAoPerfil(perfilAdmin.id, permissoes);

  const usuarioInicial = await criarUsuarioInicial(perfilAdmin.id);
  await criarEstruturaInicial();
  await criarJornadasPadrao();

  await prisma.auditoriaEvento.create({
    data: {
      usuarioId: usuarioInicial.id,
      entidade: "Sistema",
      entidadeId: "seed-inicial",
      acao: "SEED_INICIAL_EXECUTADO",
      dadosDepois: {
        usuarioInicial: usuarioInicial.matricula,
        perfil: "ADMIN",
        estrutura: ["JFAM", "SJAM", "NUTEC", "NUCGP", "SECAD"],
      },
    },
  });

  console.log("Seed concluído com sucesso.");
  console.log(`Usuário inicial: ${usuarioInicial.matricula}`);
  console.log("Senha inicial: valor definido em SECP_ADMIN_SENHA.");
}

main()
  .catch((error) => {
    console.error("Erro ao executar seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
