import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { FUSOS_HORARIOS_CADASTRO_PADRAO } from "../src/modules/fusos-horarios/domain/fusos-horarios-oficiais";

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
  {
    recurso: "regulamentacao-ponto",
    acao: "gerenciar",
    escopo: "global",
    descricao: "Gerenciar regras de regulamentação do ponto por órgão.",
  },

  {
    recurso: "fusos-horarios",
    acao: "gerenciar",
    escopo: "global",
    descricao: "Gerenciar fusos horarios disponiveis para orgaos e unidades.",
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

  {
    recurso: "relatorios-gerenciais",
    acao: "consultar",
    escopo: "proprio",
    descricao: "Consultar relatorios gerenciais com dados do proprio servidor.",
  },
  {
    recurso: "relatorios-gerenciais",
    acao: "consultar",
    escopo: "chefia",
    descricao:
      "Consultar relatorios gerenciais da equipe e unidades subordinadas.",
  },
  {
    recurso: "relatorios-gerenciais",
    acao: "consultar",
    escopo: "global",
    descricao: "Consultar relatorios gerenciais de todos os servidores.",
  },
  {
    recurso: "relatorios-gerenciais",
    acao: "exportar",
    escopo: "proprio",
    descricao: "Exportar relatorios gerenciais com dados do proprio servidor.",
  },
  {
    recurso: "relatorios-gerenciais",
    acao: "exportar",
    escopo: "chefia",
    descricao:
      "Exportar relatorios gerenciais da equipe e unidades subordinadas.",
  },
  {
    recurso: "relatorios-gerenciais",
    acao: "exportar",
    escopo: "global",
    descricao: "Exportar relatorios gerenciais de todos os servidores.",
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

  {
    recurso: "biometriafacial",
    acao: "cadastrar",
    escopo: "proprio",
    descricao: "Cadastrar a propria biometria facial com prova de vida.",
  },
  {
    recurso: "biometriafacial",
    acao: "recadastrar",
    escopo: "proprio",
    descricao: "Recadastrar a propria biometria facial.",
  },
  {
    recurso: "biometriafacial",
    acao: "registrar",
    escopo: "proprio",
    descricao: "Usar reconhecimento facial no registro do proprio ponto.",
  },
  {
    recurso: "biometriafacial",
    acao: "cadastrar",
    escopo: "terceiros",
    descricao: "Cadastrar biometria facial de terceiros.",
  },
  {
    recurso: "biometriafacial",
    acao: "recadastrar",
    escopo: "terceiros",
    descricao: "Recadastrar biometria facial de terceiros.",
  },
  {
    recurso: "biometriafacial",
    acao: "visualizar",
    escopo: "auditoria",
    descricao: "Consultar eventos e tentativas de biometria facial.",
  },
  {
    recurso: "biometriafacial",
    acao: "invalidar",
    escopo: "global",
    descricao: "Invalidar cadastro de biometria facial.",
  },

  // AFD
  {
    recurso: "afd",
    acao: "importar",
    escopo: "global",
    descricao: "Importar arquivos AFD de equipamentos biométricos.",
  },
  // Recesso forense
  {
    recurso: "recesso",
    acao: "gerenciar",
    escopo: "global",
    descricao: "Gerenciar recesso forense anual.",
  },
  {
    recurso: "recesso",
    acao: "consultar",
    escopo: "global",
    descricao: "Consultar recessos forenses de todas as unidades.",
  },
  {
    recurso: "recesso",
    acao: "consultar",
    escopo: "proprio",
    descricao: "Consultar o proprio recesso forense.",
  },
  {
    recurso: "recesso",
    acao: "convocacao",
    escopo: "gerenciar",
    descricao: "Gerenciar convocacoes do recesso forense.",
  },
  {
    recurso: "recesso",
    acao: "fechar",
    escopo: "proprio",
    descricao: "Fechar o proprio espelho de recesso.",
  },
  {
    recurso: "recesso",
    acao: "homologar",
    escopo: "chefia",
    descricao: "Homologar recesso dos servidores convocados.",
  },
  {
    recurso: "recesso",
    acao: "aceitar",
    escopo: "secad",
    descricao: "Aceitar homologacao do recesso pela SECAD.",
  },
  {
    recurso: "recesso",
    acao: "relatorio",
    escopo: "sepag",
    descricao: "Gerar relatorio de pecunia do recesso para SEPAG.",
  },
  {
    recurso: "recesso",
    acao: "relatorio",
    escopo: "secap",
    descricao: "Gerar relatorio de folgas do recesso para SECAP.",
  },

  // Afastamentos SARH
  {
    recurso: "afastamentos",
    acao: "consultar",
    escopo: "proprio",
    descricao: "Consultar os próprios afastamentos importados do SARH.",
  },
  {
    recurso: "afastamentos",
    acao: "consultar",
    escopo: "chefia",
    descricao:
      "Consultar afastamentos de servidores subordinados à chefia ou delegação vigente.",
  },
  {
    recurso: "afastamentos",
    acao: "consultar",
    escopo: "global",
    descricao: "Consultar afastamentos importados do SARH em âmbito global.",
  },
];

const codigosPermissoesServidor = [
  "dashboard:visualizar:proprio",
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
  "relatorios-gerenciais:consultar:proprio",
  "relatorios-gerenciais:exportar:proprio",
  "jornada:visualizar:proprio",
  "biometria:consultar:proprio",
  "biometria:cadastrar:proprio",
  "biometriafacial:cadastrar:proprio",
  "biometriafacial:recadastrar:proprio",
  "afastamentos:consultar:proprio",
  "recesso:consultar:proprio",
  "recesso:fechar:proprio",
];

const codigosPermissoesChefia = [
  "dashboard:visualizar:proprio",
  "servidores:consultar:global",
  "marcacoes:consultar:global",
  "apuracao:consultar:global",
  "banco-horas:consultar:global",
  "solicitacoes:analisar:chefia",
  "solicitacoes:consultar:global",
  "homologacao:gerenciar:chefia",
  "homologacao:consultar:global",
  "boletim-frequencia:gerar:chefia",
  "boletim-frequencia:encaminhar:chefia",
  "boletim-frequencia:consultar:global",
  "relatorios:consultar:global",
  "relatorios:exportar:global",
  "relatorios-gerenciais:consultar:chefia",
  "relatorios-gerenciais:exportar:chefia",
  "afastamentos:consultar:chefia",
  "recesso:homologar:chefia",
  "recesso:consultar:global",
];

const codigosPermissoesSecap = [
  "dashboard:visualizar:proprio",
  "usuarios:consultar:global",
  "servidores:gerenciar:global",
  "servidores:consultar:global",
  "chefias:gerenciar:global",
  "jornadas:gerenciar:global",
  "jornadas:gerenciar-politicas:global",
  "marcacoes:consultar:global",
  "marcacoes:gerenciar:global",
  "apuracao:consultar:global",
  "apuracao:recalcular:global",
  "banco-horas:consultar:global",
  "banco-horas:gerenciar:global",
  "solicitacoes:consultar:global",
  "homologacao:consultar:global",
  "homologacao:gerenciar:global",
  "boletim-frequencia:receber:global",
  "boletim-frequencia:consultar:global",
  "relatorios:consultar:global",
  "relatorios:exportar:global",
  "relatorios-gerenciais:consultar:global",
  "relatorios-gerenciais:exportar:global",
  "afastamentos:consultar:global",
  "recesso:consultar:global",
  "recesso:relatorio:secap",
];

const codigosPermissoesSecad = [
  "dashboard:visualizar:proprio",
  "servidores:consultar:global",
  "recesso:gerenciar:global",
  "recesso:consultar:global",
  "recesso:convocacao:gerenciar",
  "recesso:aceitar:secad",
  "relatorios:consultar:global",
  "relatorios:exportar:global",
  "relatorios-gerenciais:consultar:global",
  "relatorios-gerenciais:exportar:global",
  "afastamentos:consultar:global",
  "boletim-frequencia:consultar:global",
];

const codigosPermissoesDiref = [
  "dashboard:visualizar:proprio",
  "servidores:consultar:global",
  "marcacoes:consultar:global",
  "apuracao:consultar:global",
  "banco-horas:consultar:global",
  "homologacao:consultar:global",
  "boletim-frequencia:consultar:global",
  "relatorios:consultar:global",
  "relatorios:exportar:global",
  "relatorios-gerenciais:consultar:global",
  "relatorios-gerenciais:exportar:global",
  "afastamentos:consultar:global",
  "recesso:consultar:global",
  "auditoria:consultar:global",
];

const codigosPermissoesSuporte = [
  "dashboard:visualizar:proprio",
  "integracoes:consultar:global",
  "integracoes:gerenciar:global",
  "integracoes:sincronizar:global",
  "integracoes-sarh:consultar:global",
  "integracoes-sarh:configurar:global",
  "integracoes-sarh:executar:global",
  "integracoes-sarh:simular:global",
  "integracoes-sarh:reprocessar:global",
  "integracoes-sarh:resolver-conflito:global",
  "integracoes-sarh:visualizar-payload:global",
  "afd:importar:global",
  "marcacoes:consultar:global",
  "biometria:gerenciar:global",
  "biometriafacial:cadastrar:terceiros",
  "biometriafacial:recadastrar:terceiros",
  "biometriafacial:visualizar:auditoria",
  "biometriafacial:invalidar:global",
  "auditoria:consultar:global",
  "auditoria:detalhar:global",
  "usuarios:consultar:global",
  "servidores:consultar:global",
  "afastamentos:consultar:global",
  "relatorios:consultar:global",
  "relatorios:exportar:global",
  "relatorios-gerenciais:consultar:global",
  "relatorios-gerenciais:exportar:global",
];

const codigosPermissoesExcecaoRegistroWeb = [
  "marcacoes:registrar:proprio",
  "marcacoes:registrar-web:proprio",
];

const codigosPermissoesExcecaoRegistroFacial = [
  "marcacoes:registrar:proprio",
  "marcacoes:registrar-facial:proprio",
  "biometria:validar:proprio",
  "biometriafacial:registrar:proprio",
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

async function criarFusosHorarios() {
  for (const fuso of FUSOS_HORARIOS_CADASTRO_PADRAO) {
    await prisma.fusoHorario.upsert({
      where: {
        valor: fuso.valor,
      },
      update: {
        rotulo: fuso.rotulo,
        descricao: fuso.descricao,
        ativo: true,
      },
      create: {
        ...fuso,
        ativo: true,
      },
    });
  }
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

async function criarPerfilMaster() {
  return prisma.perfil.upsert({
    where: { codigo: "MASTER" },
    update: {
      nome: "MASTER",
      descricao:
        "Perfil raiz com acesso global a todas as seccionais e configurações do SECP.",
      sistema: true,
      ativo: true,
    },
    create: {
      codigo: "MASTER",
      nome: "MASTER",
      descricao:
        "Perfil raiz com acesso global a todas as seccionais e configurações do SECP.",
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

async function criarPerfilChefia() {
  return prisma.perfil.upsert({
    where: { codigo: "CHEFIA" },
    update: {
      nome: "Chefia/Gestor de Unidade",
      descricao:
        "Perfil para chefias, gestores e substitutos analisarem solicitações, homologarem frequência e encaminharem boletins.",
      sistema: true,
      ativo: true,
    },
    create: {
      codigo: "CHEFIA",
      nome: "Chefia/Gestor de Unidade",
      descricao:
        "Perfil para chefias, gestores e substitutos analisarem solicitações, homologarem frequência e encaminharem boletins.",
      sistema: true,
      ativo: true,
    },
  });
}

async function criarPerfilSecap() {
  return prisma.perfil.upsert({
    where: { codigo: "SECAP" },
    update: {
      nome: "SECAP/NUCGP",
      descricao:
        "Perfil da gestão de pessoas para acompanhar apuração, banco de horas, homologações, boletins e cadastros funcionais.",
      sistema: true,
      ativo: true,
    },
    create: {
      codigo: "SECAP",
      nome: "SECAP/NUCGP",
      descricao:
        "Perfil da gestão de pessoas para acompanhar apuração, banco de horas, homologações, boletins e cadastros funcionais.",
      sistema: true,
      ativo: true,
    },
  });
}

async function criarPerfilSecad() {
  return prisma.perfil.upsert({
    where: { codigo: "SECAD" },
    update: {
      nome: "SECAD",
      descricao:
        "Perfil da Secretaria Administrativa para gerir e aceitar fluxos do recesso forense e consultar relatórios institucionais.",
      sistema: true,
      ativo: true,
    },
    create: {
      codigo: "SECAD",
      nome: "SECAD",
      descricao:
        "Perfil da Secretaria Administrativa para gerir e aceitar fluxos do recesso forense e consultar relatórios institucionais.",
      sistema: true,
      ativo: true,
    },
  });
}

async function criarPerfilDiref() {
  return prisma.perfil.upsert({
    where: { codigo: "DIREF" },
    update: {
      nome: "Direção do Foro",
      descricao:
        "Perfil de consulta institucional da DIREF para acompanhar frequência, banco de horas, boletins, recesso e auditoria.",
      sistema: true,
      ativo: true,
    },
    create: {
      codigo: "DIREF",
      nome: "Direção do Foro",
      descricao:
        "Perfil de consulta institucional da DIREF para acompanhar frequência, banco de horas, boletins, recesso e auditoria.",
      sistema: true,
      ativo: true,
    },
  });
}

async function criarPerfilSuporte() {
  return prisma.perfil.upsert({
    where: { codigo: "NUTEC" },
    update: {
      nome: "NUTEC",
      descricao:
        "Perfil técnico para monitorar integrações, importações, biometria e processamento operacional.",
      sistema: true,
      ativo: true,
    },
    create: {
      codigo: "NUTEC",
      nome: "NUTEC",
      descricao:
        "Perfil técnico para monitorar integrações, importações, biometria e processamento operacional.",
      sistema: true,
      ativo: true,
    },
  });
}

async function criarPerfilSuporteLegado() {
  return prisma.perfil.upsert({
    where: { codigo: "SUPORTE" },
    update: {
      nome: "Suporte técnico",
      descricao:
        "Perfil técnico legado equivalente ao NUTEC, mantido por compatibilidade.",
      sistema: true,
      ativo: true,
    },
    create: {
      codigo: "SUPORTE",
      nome: "Suporte técnico",
      descricao:
        "Perfil técnico legado equivalente ao NUTEC, mantido por compatibilidade.",
      sistema: true,
      ativo: true,
    },
  });
}

async function criarPerfilExcecaoRegistroWeb() {
  return prisma.perfil.upsert({
    where: { codigo: "EXCECAO_REGISTRO_WEB" },
    update: {
      nome: "Exceção - Registro web",
      descricao:
        "Perfil técnico oculto na troca de perfis. Autoriza o servidor a registrar ponto pelo SECP sem reconhecimento facial.",
      sistema: true,
      ativo: true,
    },
    create: {
      codigo: "EXCECAO_REGISTRO_WEB",
      nome: "Exceção - Registro web",
      descricao:
        "Perfil técnico oculto na troca de perfis. Autoriza o servidor a registrar ponto pelo SECP sem reconhecimento facial.",
      sistema: true,
      ativo: true,
    },
  });
}

async function criarPerfilExcecaoRegistroFacial() {
  return prisma.perfil.upsert({
    where: { codigo: "EXCECAO_REGISTRO_FACIAL" },
    update: {
      nome: "Exceção - Registro facial",
      descricao:
        "Perfil técnico oculto na troca de perfis. Autoriza o servidor a registrar ponto pelo SECP com reconhecimento facial.",
      sistema: true,
      ativo: true,
    },
    create: {
      codigo: "EXCECAO_REGISTRO_FACIAL",
      nome: "Exceção - Registro facial",
      descricao:
        "Perfil técnico oculto na troca de perfis. Autoriza o servidor a registrar ponto pelo SECP com reconhecimento facial.",
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
  const permissaoIdsSincronizados: string[] = [];

  for (const codigo of codigos) {
    const permissao = await prisma.permissao.findUnique({
      where: { codigo },
    });

    if (!permissao) {
      console.warn(`Permissão não encontrada no seed: ${codigo}`);
      continue;
    }

    permissaoIdsSincronizados.push(permissao.id);

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

  await prisma.perfilPermissao.deleteMany({
    where: {
      perfilId,
      permissaoId: {
        notIn: permissaoIdsSincronizados,
      },
    },
  });
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

  const perfilGlobalExistente = await prisma.usuarioPerfil.findFirst({
    where: {
      usuarioId: usuario.id,
      perfilId,
      orgaoId: null,
    },
  });

  if (perfilGlobalExistente) {
    await prisma.usuarioPerfil.update({
      where: {
        id: perfilGlobalExistente.id,
      },
      data: {
        ativo: true,
        orgaoId: null,
      },
    });
  } else {
    await prisma.usuarioPerfil.create({
      data: {
        usuarioId: usuario.id,
        perfilId,
        orgaoId: null,
        ativo: true,
      },
    });
  }

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

  const estruturaGerenciadaPeloSarh =
    await prisma.unidadeOrganizacional.findFirst({
      where: {
        codigo: { in: ["SJAM", "NUTEC", "NUCGP", "SECAD"] },
        codigoExternoSarh: { not: null },
      },
      select: { id: true },
    });

  if (estruturaGerenciadaPeloSarh) {
    return orgao;
  }

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
  await criarFusosHorarios();

  const perfilMaster = await criarPerfilMaster();
  const perfilAdmin = await criarPerfilAdministrador();
  const perfilServidor = await criarPerfilServidor();
  const perfilChefia = await criarPerfilChefia();
  const perfilSecap = await criarPerfilSecap();
  const perfilSecad = await criarPerfilSecad();
  const perfilDiref = await criarPerfilDiref();
  const perfilSuporte = await criarPerfilSuporte();
  const perfilSuporteLegado = await criarPerfilSuporteLegado();
  const perfilExcecaoRegistroWeb = await criarPerfilExcecaoRegistroWeb();
  const perfilExcecaoRegistroFacial = await criarPerfilExcecaoRegistroFacial();

  await vincularPermissoesAoPerfil(perfilMaster.id, permissoes);
  await vincularPermissoesAoPerfil(perfilAdmin.id, permissoes);
  await vincularPermissoesPorCodigoAoPerfil(
    perfilServidor.id,
    codigosPermissoesServidor,
  );
  await vincularPermissoesPorCodigoAoPerfil(
    perfilChefia.id,
    codigosPermissoesChefia,
  );
  await vincularPermissoesPorCodigoAoPerfil(
    perfilSecap.id,
    codigosPermissoesSecap,
  );
  await vincularPermissoesPorCodigoAoPerfil(
    perfilSecad.id,
    codigosPermissoesSecad,
  );
  await vincularPermissoesPorCodigoAoPerfil(
    perfilDiref.id,
    codigosPermissoesDiref,
  );
  await vincularPermissoesPorCodigoAoPerfil(
    perfilSuporte.id,
    codigosPermissoesSuporte,
  );
  await vincularPermissoesPorCodigoAoPerfil(
    perfilSuporteLegado.id,
    codigosPermissoesSuporte,
  );
  await vincularPermissoesPorCodigoAoPerfil(
    perfilExcecaoRegistroWeb.id,
    codigosPermissoesExcecaoRegistroWeb,
  );
  await vincularPermissoesPorCodigoAoPerfil(
    perfilExcecaoRegistroFacial.id,
    codigosPermissoesExcecaoRegistroFacial,
  );

  const usuarioInicial = await criarUsuarioInicial(perfilMaster.id);

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
        perfis: [
          "ADMIN",
          "MASTER",
          "SERVIDOR",
          "CHEFIA",
          "SECAP",
          "SECAD",
          "DIREF",
          "NUTEC",
          "SUPORTE",
          "EXCECAO_REGISTRO_WEB",
          "EXCECAO_REGISTRO_FACIAL",
        ],
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
