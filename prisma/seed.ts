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

const permissoesSubmenusPainelExecutivoSeed = [
  {
    recurso: "painel-executivo",
    acao: "indicadores",
    escopo: "global",
    descricao: "Consultar o submenu Indicadores do painel executivo.",
  },
  {
    recurso: "painel-executivo",
    acao: "pendencias-de-ponto",
    escopo: "global",
    descricao: "Consultar o submenu Pendências de ponto do painel executivo.",
  },
  {
    recurso: "painel-executivo",
    acao: "frequencia-e-assiduidade",
    escopo: "global",
    descricao:
      "Consultar o submenu Frequência e assiduidade do painel executivo.",
  },
  {
    recurso: "painel-executivo",
    acao: "justificativas-e-ocorrencias",
    escopo: "global",
    descricao:
      "Consultar o submenu Justificativas e ocorrências do painel executivo.",
  },
  {
    recurso: "painel-executivo",
    acao: "controle-de-homologacao-mensal",
    escopo: "global",
    descricao:
      "Consultar o submenu Controle de homologação mensal do painel executivo.",
  },
  {
    recurso: "painel-executivo",
    acao: "jornada-e-carga-horaria",
    escopo: "global",
    descricao:
      "Consultar o submenu Jornada e carga horária do painel executivo.",
  },
  {
    recurso: "painel-executivo",
    acao: "teletrabalho-presencial-registro-web",
    escopo: "global",
    descricao:
      "Consultar o submenu Teletrabalho, presencial e registro web do painel executivo.",
  },
  {
    recurso: "painel-executivo",
    acao: "equipamentos-de-ponto",
    escopo: "global",
    descricao: "Consultar o submenu Equipamentos de ponto do painel executivo.",
  },
  {
    recurso: "painel-executivo",
    acao: "auditoria-e-conformidade",
    escopo: "global",
    descricao:
      "Consultar o submenu Auditoria e conformidade do painel executivo.",
  },
  {
    recurso: "painel-executivo",
    acao: "indicadores-por-unidade-e-chefia",
    escopo: "global",
    descricao:
      "Consultar o submenu Indicadores por unidade e chefia do painel executivo.",
  },
  {
    recurso: "painel-executivo",
    acao: "alertas-inteligentes",
    escopo: "global",
    descricao: "Consultar o submenu Alertas inteligentes do painel executivo.",
  },
  {
    recurso: "painel-executivo",
    acao: "relatorios-exportaveis",
    escopo: "global",
    descricao:
      "Consultar o submenu Relatórios exportáveis do painel executivo.",
  },
  {
    recurso: "painel-executivo",
    acao: "paineis",
    escopo: "global",
    descricao: "Consultar o submenu Painéis do painel executivo.",
  },
  {
    recurso: "painel-executivo",
    acao: "graficos-importantes",
    escopo: "global",
    descricao: "Consultar o submenu Gráficos importantes do painel executivo.",
  },
  {
    recurso: "painel-executivo",
    acao: "banco-de-horas",
    escopo: "global",
    descricao: "Consultar o submenu Banco de horas do painel executivo.",
  },
] as const;

const codigosPermissoesSubmenusPainelExecutivo =
  permissoesSubmenusPainelExecutivoSeed.map(
    (permissao) => `${permissao.recurso}:${permissao.acao}:${permissao.escopo}`,
  );

const permissoesHorasExtrasSeed = [
  {
    recurso: "horas-extras",
    acao: "visualizar",
    escopo: "proprio",
    descricao:
      "Visualizar as proprias solicitacoes e autorizacoes de servico extraordinario.",
  },
  {
    recurso: "horas-extras",
    acao: "solicitar",
    escopo: "proprio",
    descricao:
      "Criar e enviar solicitacoes proprias de servico extraordinario.",
  },
  {
    recurso: "horas-extras",
    acao: "cancelar",
    escopo: "proprio",
    descricao:
      "Cancelar solicitacoes proprias de servico extraordinario ainda permitidas pelo fluxo.",
  },
  {
    recurso: "horas-extras",
    acao: "solicitar",
    escopo: "unidade",
    descricao:
      "Criar solicitacoes de servico extraordinario para servidores da unidade.",
  },
  {
    recurso: "horas-extras",
    acao: "analisar",
    escopo: "chefia",
    descricao:
      "Analisar solicitacoes de servico extraordinario como chefia ou delegado.",
  },
  {
    recurso: "horas-extras",
    acao: "devolver",
    escopo: "global",
    descricao: "Devolver solicitacoes de servico extraordinario para correcao.",
  },
  {
    recurso: "horas-extras",
    acao: "rejeitar",
    escopo: "global",
    descricao:
      "Rejeitar solicitacoes de servico extraordinario conforme competencia do fluxo.",
  },
  {
    recurso: "horas-extras",
    acao: "encaminhar-orcamento",
    escopo: "chefia",
    descricao:
      "Encaminhar solicitacoes de servico extraordinario para analise orcamentaria.",
  },
  {
    recurso: "horas-extras",
    acao: "responder-orcamento",
    escopo: "global",
    descricao: "Registrar parecer orcamentario para servico extraordinario.",
  },
  {
    recurso: "horas-extras",
    acao: "deliberar",
    escopo: "global",
    descricao: "Registrar deliberacao final de servico extraordinario.",
  },
  {
    recurso: "horas-extras",
    acao: "aprovar-parcial",
    escopo: "global",
    descricao:
      "Aprovar parcialmente solicitacoes de servico extraordinario.",
  },
  {
    recurso: "horas-extras",
    acao: "cancelar-autorizacao",
    escopo: "global",
    descricao: "Cancelar ou substituir autorizacoes de servico extraordinario.",
  },
  {
    recurso: "horas-extras",
    acao: "visualizar-execucao",
    escopo: "global",
    descricao: "Visualizar execucao e calculos de servico extraordinario.",
  },
  {
    recurso: "horas-extras",
    acao: "analisar-excecao",
    escopo: "global",
    descricao: "Analisar excecoes de calculo de servico extraordinario.",
  },
  {
    recurso: "horas-extras",
    acao: "reprocessar",
    escopo: "global",
    descricao: "Reprocessar calculos de servico extraordinario.",
  },
  {
    recurso: "horas-extras",
    acao: "configurar-politica",
    escopo: "global",
    descricao:
      "Configurar politicas versionadas de servico extraordinario.",
  },
  {
    recurso: "horas-extras",
    acao: "configurar-workflow",
    escopo: "global",
    descricao:
      "Configurar workflows versionados de servico extraordinario.",
  },
  {
    recurso: "horas-extras",
    acao: "configurar-responsaveis",
    escopo: "global",
    descricao:
      "Configurar responsaveis funcionais do fluxo de servico extraordinario.",
  },
  {
    recurso: "horas-extras",
    acao: "visualizar-folha",
    escopo: "global",
    descricao:
      "Visualizar previa e lotes de pagamento de servico extraordinario.",
  },
  {
    recurso: "horas-extras",
    acao: "gerar-lote",
    escopo: "global",
    descricao: "Gerar lote mensal de pagamento de servico extraordinario.",
  },
  {
    recurso: "horas-extras",
    acao: "fechar-lote",
    escopo: "global",
    descricao: "Fechar lote mensal de pagamento de servico extraordinario.",
  },
  {
    recurso: "horas-extras",
    acao: "exportar",
    escopo: "global",
    descricao: "Exportar demonstrativos e lotes de servico extraordinario.",
  },
  {
    recurso: "horas-extras",
    acao: "auditar",
    escopo: "global",
    descricao:
      "Auditar solicitacoes, calculos e lotes de servico extraordinario.",
  },
] as const;

const ABRANGENCIAS_PADRAO = [
  "proprio",
  "subordinados",
  "seccional",
  "global",
] as const;

type AbrangenciaPadrao = (typeof ABRANGENCIAS_PADRAO)[number];

type PermissaoSeed = {
  codigo?: string;
  recurso: string;
  acao: string;
  escopo: string;
  descricao: string;
};

const permissoesProgramacaoFeriasSeed = [
  {
    recurso: "programacao-ferias",
    acao: "consultar",
    escopo: "proprio",
    descricao: "Visualizar a propria programacao de ferias.",
  },
  {
    recurso: "programacao-ferias",
    acao: "consultar",
    escopo: "subordinados",
    descricao:
      "Visualizar a programacao de ferias dos subordinados, respeitando a hierarquia departamental.",
  },
  {
    recurso: "programacao-ferias",
    acao: "consultar",
    escopo: "seccional",
    descricao:
      "Consultar a programacao de ferias de todas as pessoas da seccional.",
  },
  {
    recurso: "programacao-ferias",
    acao: "consultar",
    escopo: "global",
    descricao: "Consultar a programacao de ferias de todas as pessoas do SECP.",
  },
] as const;

const codigosPermissoesHorasExtrasServidor = [
  "horas-extras:visualizar:proprio",
  "horas-extras:solicitar:proprio",
  "horas-extras:cancelar:proprio",
];

const codigosPermissoesHorasExtrasChefia = [
  "horas-extras:analisar:chefia",
  "horas-extras:devolver:global",
  "horas-extras:rejeitar:global",
  "horas-extras:encaminhar-orcamento:chefia",
];

const codigosPermissoesHorasExtrasGestao = [
  "horas-extras:solicitar:unidade",
  "horas-extras:responder-orcamento:global",
  "horas-extras:deliberar:global",
  "horas-extras:aprovar-parcial:global",
  "horas-extras:cancelar-autorizacao:global",
  "horas-extras:visualizar-execucao:global",
  "horas-extras:analisar-excecao:global",
  "horas-extras:reprocessar:global",
  "horas-extras:configurar-politica:global",
  "horas-extras:configurar-workflow:global",
  "horas-extras:configurar-responsaveis:global",
  "horas-extras:visualizar-folha:global",
  "horas-extras:gerar-lote:global",
  "horas-extras:fechar-lote:global",
  "horas-extras:exportar:global",
  "horas-extras:auditar:global",
];

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
    recurso: "minha-equipe",
    acao: "consultar",
    escopo: "chefia",
    descricao:
      "Consultar presença diária dos servidores subordinados à chefia ou delegação.",
  },
  {
    recurso: "configuracoes",
    acao: "gerenciar",
    escopo: "global",
    descricao: "Gerenciar parâmetros gerais do SECP.",
  },
  {
    recurso: "menus",
    acao: "personalizar",
    escopo: "global",
    descricao: "Personalizar menus laterais por perfil.",
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

  {
    recurso: "painel-executivo",
    acao: "consultar",
    escopo: "global",
    descricao:
      "Consultar painel executivo com indicadores gerenciais de frequencia, homologacao, pendencias e conformidade.",
  },
  {
    recurso: "painel-executivo",
    acao: "equipamentos",
    escopo: "global",
    descricao:
      "Consultar indicadores tecnicos de equipamentos de ponto no painel executivo.",
  },
  ...permissoesSubmenusPainelExecutivoSeed,

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
  {
    recurso: "marcacoes",
    acao: "excluir",
    escopo: "global",
    descricao: "Excluir/cancelar marcacoes de ponto.",
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
  {
    recurso: "contracheque",
    acao: "consultar",
    escopo: "proprio",
    descricao:
      "Consultar e exportar o próprio contracheque diretamente no SARH.",
  },
  ...permissoesHorasExtrasSeed,

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
    escopo: "chefia",
    descricao: "Consultar banco de horas de servidores subordinados.",
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

  // Integração Microsoft Teams
  {
    codigo: "integracoes:teams:visualizar",
    recurso: "integracoes:teams",
    acao: "visualizar",
    escopo: "global",
    descricao: "Visualizar configuração e saúde da integração Microsoft Teams.",
  },
  {
    codigo: "integracoes:teams:configurar",
    recurso: "integracoes:teams",
    acao: "configurar",
    escopo: "global",
    descricao: "Configurar parâmetros da integração Microsoft Teams.",
  },
  {
    codigo: "integracoes:teams:ativar",
    recurso: "integracoes:teams",
    acao: "ativar",
    escopo: "global",
    descricao: "Ativar a integração Microsoft Teams.",
  },
  {
    codigo: "integracoes:teams:desativar",
    recurso: "integracoes:teams",
    acao: "desativar",
    escopo: "global",
    descricao: "Desativar a integração Microsoft Teams.",
  },
  {
    codigo: "integracoes:teams:testar",
    recurso: "integracoes:teams",
    acao: "testar",
    escopo: "global",
    descricao: "Executar testes operacionais da integração Microsoft Teams.",
  },
  {
    codigo: "integracoes:teams:baixar-manifesto",
    recurso: "integracoes:teams",
    acao: "baixar-manifesto",
    escopo: "global",
    descricao: "Baixar o manifesto do aplicativo Microsoft Teams do SECP.",
  },
  {
    codigo: "teams:bot:usar",
    recurso: "teams:bot",
    acao: "usar",
    escopo: "proprio",
    descricao: "Usar o bot conversacional do SECP no Microsoft Teams.",
  },
  {
    codigo: "teams:notificacoes:receber",
    recurso: "teams:notificacoes",
    acao: "receber",
    escopo: "proprio",
    descricao: "Receber notificações individuais do SECP no Microsoft Teams.",
  },
  {
    codigo: "teams:ponto:registrar",
    recurso: "teams:ponto",
    acao: "registrar",
    escopo: "proprio",
    descricao: "Registrar ponto pelo Microsoft Teams quando autorizado.",
  },
  {
    codigo: "teams:banco-horas:consultar",
    recurso: "teams:banco-horas",
    acao: "consultar",
    escopo: "proprio",
    descricao: "Consultar banco de horas pelo Microsoft Teams.",
  },
  {
    codigo: "teams:solicitacoes:criar",
    recurso: "teams:solicitacoes",
    acao: "criar",
    escopo: "proprio",
    descricao: "Criar solicitações pelo Microsoft Teams.",
  },
  {
    codigo: "teams:aprovacoes:analisar",
    recurso: "teams:aprovacoes",
    acao: "analisar",
    escopo: "chefia",
    descricao: "Analisar aprovações pelo Microsoft Teams.",
  },
  {
    codigo: "teams:homologacao:analisar",
    recurso: "teams:homologacao",
    acao: "analisar",
    escopo: "chefia",
    descricao: "Analisar homologações pelo Microsoft Teams.",
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
  "contracheque:consultar:proprio",
  ...codigosPermissoesHorasExtrasServidor,
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
  "teams:bot:usar",
  "teams:notificacoes:receber",
  "teams:ponto:registrar",
  "teams:banco-horas:consultar",
  "teams:solicitacoes:criar",
];

const codigosPermissoesPessoaExterna = [
  "dashboard:visualizar:proprio",
  "marcacoes:consultar:proprio",
  "marcacoes:visualizar:proprio",
  "espelho-ponto:visualizar:proprio",
  "solicitacoes:criar:proprio",
  "solicitacoes:consultar:proprio",
  "solicitacoes:visualizar:proprio",
];

const codigosPermissoesChefia = [
  "dashboard:visualizar:proprio",
  "servidores:consultar:global",
  "minha-equipe:consultar:chefia",
  "marcacoes:consultar:global",
  "apuracao:consultar:global",
  "banco-horas:consultar:chefia",
  "solicitacoes:analisar:chefia",
  ...codigosPermissoesHorasExtrasChefia,
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
  "teams:bot:usar",
  "teams:notificacoes:receber",
  "teams:banco-horas:consultar",
  "teams:solicitacoes:criar",
  "teams:aprovacoes:analisar",
  "teams:homologacao:analisar",
];

const codigosPermissoesSecap = [
  "dashboard:visualizar:proprio",
  "painel-executivo:consultar:global",
  ...codigosPermissoesSubmenusPainelExecutivo,
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
  ...codigosPermissoesHorasExtrasGestao,
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
  "painel-executivo:consultar:global",
  ...codigosPermissoesSubmenusPainelExecutivo,
  "servidores:consultar:global",
  ...codigosPermissoesHorasExtrasGestao,
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
  "painel-executivo:consultar:global",
  ...codigosPermissoesSubmenusPainelExecutivo,
  "servidores:consultar:global",
  "horas-extras:visualizar-execucao:global",
  "horas-extras:auditar:global",
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
  "painel-executivo:consultar:global",
  ...codigosPermissoesSubmenusPainelExecutivo,
  "painel-executivo:equipamentos:global",
  "integracoes:consultar:global",
  "integracoes:gerenciar:global",
  "integracoes:sincronizar:global",
  "integracoes:teams:visualizar",
  "integracoes:teams:configurar",
  "integracoes:teams:ativar",
  "integracoes:teams:desativar",
  "integracoes:teams:testar",
  "integracoes:teams:baixar-manifesto",
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
  codigo?: string;
  recurso: string;
  acao: string;
  escopo: string;
}) {
  return item.codigo ?? `${item.recurso}:${item.acao}:${item.escopo}`;
}

function escopoPadrao(escopo: string): AbrangenciaPadrao {
  if (escopo === "chefia" || escopo === "unidade") {
    return "subordinados";
  }

  if (escopo === "terceiros" || escopo === "secad" || escopo === "secap") {
    return "seccional";
  }

  if (
    escopo === "auditoria" ||
    escopo === "gerenciar" ||
    escopo === "sepag" ||
    escopo === "sistema"
  ) {
    return "global";
  }

  if (ABRANGENCIAS_PADRAO.includes(escopo as AbrangenciaPadrao)) {
    return escopo as AbrangenciaPadrao;
  }

  return "global";
}

function descricaoAbrangencia(abrangencia: AbrangenciaPadrao) {
  const descricoes: Record<AbrangenciaPadrao, string> = {
    proprio: "Abrangencia: proprio usuario.",
    subordinados:
      "Abrangencia: subordinados conforme chefia, substituicao ou delegacao vigente.",
    seccional: "Abrangencia: pessoas vinculadas a seccional do perfil.",
    global: "Abrangencia: todas as pessoas e seccionais do SECP.",
  };

  return descricoes[abrangencia];
}

function criarPermissaoPadrao(
  item: PermissaoSeed,
  escopo: AbrangenciaPadrao,
): PermissaoSeed {
  const itemProgramacaoFerias = permissoesProgramacaoFeriasSeed.find(
    (permissao) =>
      permissao.recurso === item.recurso &&
      permissao.acao === item.acao &&
      permissao.escopo === escopo,
  );

  return {
    recurso: item.recurso,
    acao: item.acao,
    escopo,
    descricao:
      itemProgramacaoFerias?.descricao ??
      (escopoPadrao(item.escopo) === escopo
        ? item.descricao
        : `${item.descricao} ${descricaoAbrangencia(escopo)}`),
  };
}

function montarPermissoesSeedPadronizadas() {
  const permissoesBase: PermissaoSeed[] = [
    ...permissoesIniciais,
    ...permissoesProgramacaoFeriasSeed,
  ];
  const permissoes = new Map<string, PermissaoSeed>();
  const bases = new Map<string, PermissaoSeed>();

  for (const item of permissoesBase) {
    bases.set(`${item.recurso}:${item.acao}`, item);
  }

  for (const item of bases.values()) {
    for (const escopo of ABRANGENCIAS_PADRAO) {
      const permissaoPadrao = criarPermissaoPadrao(item, escopo);
      permissoes.set(codigoPermissao(permissaoPadrao), permissaoPadrao);
    }
  }

  for (const item of permissoesBase) {
    permissoes.set(codigoPermissao(item), item);
  }

  const permissoesPorTripla = new Map<string, PermissaoSeed>();

  for (const item of permissoes.values()) {
    const chave = `${item.recurso}:${item.acao}:${item.escopo}`;
    const existente = permissoesPorTripla.get(chave);

    if (!existente || item.codigo) {
      permissoesPorTripla.set(chave, item);
    }
  }

  return Array.from(permissoesPorTripla.values());
}

async function criarPermissoes() {
  const permissoes = [];
  const codigosCriados = new Set<string>();

  for (const item of montarPermissoesSeedPadronizadas()) {
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
      administrativo: true,
      excecao: false,
    },
    create: {
      codigo: "ADMIN",
      nome: "Administrador do Sistema",
      descricao:
        "Perfil com acesso integral às configurações iniciais do SECP.",
      sistema: true,
      ativo: true,
      administrativo: true,
      excecao: false,
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
      administrativo: true,
      excecao: false,
    },
    create: {
      codigo: "MASTER",
      nome: "MASTER",
      descricao:
        "Perfil raiz com acesso global a todas as seccionais e configurações do SECP.",
      sistema: true,
      ativo: true,
      administrativo: true,
      excecao: false,
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
      administrativo: false,
      excecao: false,
    },
    create: {
      codigo: "SERVIDOR",
      nome: "Servidor",
      descricao: "Perfil básico para servidores utilizarem o SECP.",
      sistema: true,
      ativo: true,
      administrativo: false,
      excecao: false,
    },
  });
}

async function criarPerfilPessoaPonto(params: {
  codigo: string;
  nome: string;
  descricao: string;
}) {
  return prisma.perfil.upsert({
    where: { codigo: params.codigo },
    update: {
      nome: params.nome,
      descricao: params.descricao,
      sistema: true,
      ativo: true,
      administrativo: false,
      excecao: false,
    },
    create: {
      codigo: params.codigo,
      nome: params.nome,
      descricao: params.descricao,
      sistema: true,
      ativo: true,
      administrativo: false,
      excecao: false,
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
      administrativo: false,
      excecao: false,
    },
    create: {
      codigo: "CHEFIA",
      nome: "Chefia/Gestor de Unidade",
      descricao:
        "Perfil para chefias, gestores e substitutos analisarem solicitações, homologarem frequência e encaminharem boletins.",
      sistema: true,
      ativo: true,
      administrativo: false,
      excecao: false,
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
      administrativo: true,
      excecao: false,
    },
    create: {
      codigo: "SECAP",
      nome: "SECAP/NUCGP",
      descricao:
        "Perfil da gestão de pessoas para acompanhar apuração, banco de horas, homologações, boletins e cadastros funcionais.",
      sistema: true,
      ativo: true,
      administrativo: true,
      excecao: false,
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
      administrativo: true,
      excecao: false,
    },
    create: {
      codigo: "SECAD",
      nome: "SECAD",
      descricao:
        "Perfil da Secretaria Administrativa para gerir e aceitar fluxos do recesso forense e consultar relatórios institucionais.",
      sistema: true,
      ativo: true,
      administrativo: true,
      excecao: false,
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
      administrativo: true,
      excecao: false,
    },
    create: {
      codigo: "DIREF",
      nome: "Direção do Foro",
      descricao:
        "Perfil de consulta institucional da DIREF para acompanhar frequência, banco de horas, boletins, recesso e auditoria.",
      sistema: true,
      ativo: true,
      administrativo: true,
      excecao: false,
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
      administrativo: true,
      excecao: false,
    },
    create: {
      codigo: "NUTEC",
      nome: "NUTEC",
      descricao:
        "Perfil técnico para monitorar integrações, importações, biometria e processamento operacional.",
      sistema: true,
      ativo: true,
      administrativo: true,
      excecao: false,
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
      administrativo: true,
      excecao: false,
    },
    create: {
      codigo: "SUPORTE",
      nome: "Suporte técnico",
      descricao:
        "Perfil técnico legado equivalente ao NUTEC, mantido por compatibilidade.",
      sistema: true,
      ativo: true,
      administrativo: true,
      excecao: false,
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
      administrativo: false,
      excecao: true,
      perfilDestinoExcecao: {
        connect: {
          codigo: "SERVIDOR",
        },
      },
    },
    create: {
      codigo: "EXCECAO_REGISTRO_WEB",
      nome: "Exceção - Registro web",
      descricao:
        "Perfil técnico oculto na troca de perfis. Autoriza o servidor a registrar ponto pelo SECP sem reconhecimento facial.",
      sistema: true,
      ativo: true,
      administrativo: false,
      excecao: true,
      perfilDestinoExcecao: {
        connect: {
          codigo: "SERVIDOR",
        },
      },
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
      administrativo: false,
      excecao: true,
      perfilDestinoExcecao: {
        connect: {
          codigo: "SERVIDOR",
        },
      },
    },
    create: {
      codigo: "EXCECAO_REGISTRO_FACIAL",
      nome: "Exceção - Registro facial",
      descricao:
        "Perfil técnico oculto na troca de perfis. Autoriza o servidor a registrar ponto pelo SECP com reconhecimento facial.",
      sistema: true,
      ativo: true,
      administrativo: false,
      excecao: true,
      perfilDestinoExcecao: {
        connect: {
          codigo: "SERVIDOR",
        },
      },
    },
  });
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

function normalizarCodigoPermissaoParaAbrangencia(
  codigo: string,
  abrangencia: AbrangenciaPadrao,
) {
  const codigosCustomizadosTeams: Record<string, string> = {
    "teams:aprovacoes:analisar": "teams:aprovacoes:analisar",
    "teams:homologacao:analisar": "teams:homologacao:analisar",
  };

  if (codigosCustomizadosTeams[codigo]) {
    return `${codigosCustomizadosTeams[codigo]}:${abrangencia}`;
  }

  const partes = codigo.split(":");
  const ultimoSegmento = partes.at(-1);

  if (!ultimoSegmento) {
    return codigo;
  }

  const escoposConhecidos = new Set([
    ...ABRANGENCIAS_PADRAO,
    "auditoria",
    "chefia",
    "gerenciar",
    "secad",
    "secap",
    "sepag",
    "sistema",
    "terceiros",
    "unidade",
  ]);

  if (!escoposConhecidos.has(ultimoSegmento)) {
    return codigo;
  }

  return [...partes.slice(0, -1), abrangencia].join(":");
}

function normalizarCodigosPermissoesPerfil(
  codigos: string[],
  abrangencia: AbrangenciaPadrao,
) {
  return Array.from(
    new Set(
      codigos.map((codigo) =>
        normalizarCodigoPermissaoParaAbrangencia(codigo, abrangencia),
      ),
    ),
  );
}

function codigosPermissoesPorAbrangencia(
  permissoes: Array<{ codigo: string; escopo: string }>,
  abrangencia: AbrangenciaPadrao,
) {
  return permissoes
    .filter(
      (permissao) =>
        permissao.escopo === abrangencia &&
        permissao.codigo.endsWith(`:${abrangencia}`),
    )
    .map((permissao) => permissao.codigo);
}

async function sincronizarPermissoesPorCodigoAoPerfil(
  perfilId: string,
  codigos: string[],
) {
  const codigosUnicos = Array.from(new Set(codigos));
  const permissoes = await prisma.permissao.findMany({
    where: {
      codigo: {
        in: codigosUnicos,
      },
    },
    select: {
      id: true,
      codigo: true,
    },
  });
  const codigosEncontrados = new Set(
    permissoes.map((permissao) => permissao.codigo),
  );
  const idsPermissoes = permissoes.map((permissao) => permissao.id);

  for (const codigo of codigosUnicos) {
    if (!codigosEncontrados.has(codigo)) {
      console.warn(`PermissÃ£o nÃ£o encontrada no seed: ${codigo}`);
    }
  }

  await prisma.perfilPermissao.deleteMany({
    where: {
      perfilId,
      permissaoId: {
        notIn: idsPermissoes,
      },
    },
  });

  await vincularPermissoesPorCodigoAoPerfil(perfilId, codigosUnicos);
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

async function criarConfiguracaoHorasExtrasPadrao(orgaoId: string) {
  const policyExistente = await prisma.overtimePolicy.findFirst({
    where: {
      orgaoId,
      code: "POLITICA_HE_JF_REFERENCIA",
      scopeUnitId: null,
    },
  });
  const policy = policyExistente
    ? await prisma.overtimePolicy.update({
        where: { id: policyExistente.id },
        data: {
          name: "Politica de servico extraordinario - referencia JF",
          description:
            "Politica inicial editavel para servico extraordinario remunerado.",
          active: true,
        },
      })
    : await prisma.overtimePolicy.create({
        data: {
          orgaoId,
          scopeUnitId: null,
          code: "POLITICA_HE_JF_REFERENCIA",
          name: "Politica de servico extraordinario - referencia JF",
          description:
            "Politica inicial editavel para servico extraordinario remunerado.",
          active: true,
        },
      });

  const policyVersion = await prisma.overtimePolicyVersion.upsert({
    where: {
      policyId_version: {
        policyId: policy.id,
        version: 1,
      },
    },
    update: {
      orgaoId,
      scopeUnitId: null,
      normativeBasis:
        "Configuracao inicial editavel: 50% para dias uteis e sabados, 100% para domingos e feriados, limite de 2h em dias uteis, 44h mensais e 134h anuais.",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      priorAuthorization: true,
      budgetReviewRequired: true,
      minimumBusinessDays: 0,
      workPlanRequired: true,
      justificationRequired: true,
      divisorMinutes: 12000,
      monthlyLimitMinutes: 2640,
      annualLimitMinutes: 8040,
      active: true,
      snapshot: {
        paymentDestinationDefault: "PECUNIA",
        weekdayEligibilityThreshold: "apos_oitava_hora",
        rounding: "minute",
      },
    },
    create: {
      policyId: policy.id,
      orgaoId,
      scopeUnitId: null,
      version: 1,
      normativeBasis:
        "Configuracao inicial editavel: 50% para dias uteis e sabados, 100% para domingos e feriados, limite de 2h em dias uteis, 44h mensais e 134h anuais.",
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      priorAuthorization: true,
      budgetReviewRequired: true,
      minimumBusinessDays: 0,
      workPlanRequired: true,
      justificationRequired: true,
      divisorMinutes: 12000,
      monthlyLimitMinutes: 2640,
      annualLimitMinutes: 8040,
      active: true,
      snapshot: {
        paymentDestinationDefault: "PECUNIA",
        weekdayEligibilityThreshold: "apos_oitava_hora",
        rounding: "minute",
      },
    },
  });

  const rateRules = [
    { dayType: "DIA_UTIL", ratePercent: "50", dailyLimitMinutes: 120, eligibilityThresholdMinutes: 480 },
    { dayType: "SABADO", ratePercent: "50", dailyLimitMinutes: 480, eligibilityThresholdMinutes: 0 },
    { dayType: "DOMINGO", ratePercent: "100", dailyLimitMinutes: 480, eligibilityThresholdMinutes: 0 },
    { dayType: "FERIADO_NACIONAL", ratePercent: "100", dailyLimitMinutes: 480, eligibilityThresholdMinutes: 0 },
    { dayType: "FERIADO_ESTADUAL", ratePercent: "100", dailyLimitMinutes: 480, eligibilityThresholdMinutes: 0 },
    { dayType: "FERIADO_MUNICIPAL", ratePercent: "100", dailyLimitMinutes: 480, eligibilityThresholdMinutes: 0 },
    { dayType: "FERIADO_REGIMENTAL", ratePercent: "100", dailyLimitMinutes: 480, eligibilityThresholdMinutes: 0 },
  ] as const;

  for (const rule of rateRules) {
    await prisma.overtimeRateRule.upsert({
      where: {
        policyVersionId_dayType: {
          policyVersionId: policyVersion.id,
          dayType: rule.dayType,
        },
      },
      update: {
        ratePercent: rule.ratePercent,
        dailyLimitMinutes: rule.dailyLimitMinutes,
        eligibilityThresholdMinutes: rule.eligibilityThresholdMinutes,
        active: true,
      },
      create: {
        policyVersionId: policyVersion.id,
        dayType: rule.dayType,
        ratePercent: rule.ratePercent,
        dailyLimitMinutes: rule.dailyLimitMinutes,
        eligibilityThresholdMinutes: rule.eligibilityThresholdMinutes,
        active: true,
      },
    });
  }

  const workflowDefinitionExistente =
    await prisma.overtimeWorkflowDefinition.findFirst({
      where: {
        orgaoId,
        code: "FLUXO_HE_CHEFIA_ORCAMENTO_DELIBERACAO",
        scopeUnitId: null,
      },
    });

  const workflowDefinition = await prisma.overtimeWorkflowDefinition.upsert({
    where: {
      id: workflowDefinitionExistente?.id ?? "00000000-0000-0000-0000-000000000000",
    },
    update: {
      name: "Chefia, orçamento e deliberação final",
      description:
        "Fluxo inicial editavel para solicitacao, analise, parecer, deliberacao, execucao, fechamento e pagamento de servico extraordinario.",
      active: true,
    },
    create: {
      orgaoId,
      scopeUnitId: null,
      code: "FLUXO_HE_CHEFIA_ORCAMENTO_DELIBERACAO",
      name: "Chefia, orçamento e deliberação final",
      description:
        "Fluxo inicial editavel para solicitacao, analise, parecer, deliberacao, execucao, fechamento e pagamento de servico extraordinario.",
      active: true,
    },
  });

  const workflowVersion = await prisma.overtimeWorkflowVersion.upsert({
    where: {
      definitionId_version: {
        definitionId: workflowDefinition.id,
        version: 1,
      },
    },
    update: {
      orgaoId,
      scopeUnitId: null,
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      initialStepCode: "SERVIDOR_SOLICITANTE",
      active: true,
      snapshot: {
        version: 1,
        template: workflowDefinition.code,
      },
    },
    create: {
      definitionId: workflowDefinition.id,
      orgaoId,
      scopeUnitId: null,
      version: 1,
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      initialStepCode: "SERVIDOR_SOLICITANTE",
      active: true,
      snapshot: {
        version: 1,
        template: workflowDefinition.code,
      },
    },
  });

  const steps = [
    { code: "SERVIDOR_SOLICITANTE", name: "Servidor solicitante", order: 1, requiredPermission: "horas-extras:solicitar:proprio", allowsPartialApproval: false },
    { code: "ANALISE_CHEFIA", name: "Analise da chefia", order: 2, requiredPermission: "horas-extras:analisar:chefia", allowsPartialApproval: true },
    { code: "ANALISE_ORCAMENTARIA", name: "Analise orcamentaria", order: 3, requiredPermission: "horas-extras:responder-orcamento:global", allowsPartialApproval: true },
    { code: "DELIBERACAO_FINAL", name: "Deliberacao final", order: 4, requiredPermission: "horas-extras:deliberar:global", allowsPartialApproval: true },
    { code: "EXECUCAO", name: "Execucao", order: 5, requiredPermission: "horas-extras:visualizar-execucao:global", allowsPartialApproval: false },
    { code: "FECHAMENTO", name: "Fechamento", order: 6, requiredPermission: "horas-extras:gerar-lote:global", allowsPartialApproval: false },
    { code: "PAGAMENTO", name: "Pagamento", order: 7, requiredPermission: "horas-extras:visualizar-folha:global", allowsPartialApproval: false },
  ] as const;

  for (const step of steps) {
    await prisma.overtimeWorkflowStepDefinition.upsert({
      where: {
        workflowVersionId_code: {
          workflowVersionId: workflowVersion.id,
          code: step.code,
        },
      },
      update: {
        name: step.name,
        order: step.order,
        requiredPermission: step.requiredPermission,
        allowsPartialApproval: step.allowsPartialApproval,
      },
      create: {
        workflowVersionId: workflowVersion.id,
        code: step.code,
        name: step.name,
        order: step.order,
        requiredPermission: step.requiredPermission,
        allowsPartialApproval: step.allowsPartialApproval,
      },
    });
  }

  const transitions = [
    { fromStepCode: "SERVIDOR_SOLICITANTE", toStepCode: "ANALISE_CHEFIA", actionCode: "SUBMIT", requiredPermission: "horas-extras:solicitar:proprio" },
    { fromStepCode: "ANALISE_CHEFIA", toStepCode: "SERVIDOR_SOLICITANTE", actionCode: "RETURN", requiredPermission: "horas-extras:devolver:global" },
    { fromStepCode: "ANALISE_CHEFIA", toStepCode: "ANALISE_ORCAMENTARIA", actionCode: "FORWARD_BUDGET", requiredPermission: "horas-extras:encaminhar-orcamento:chefia" },
    { fromStepCode: "ANALISE_ORCAMENTARIA", toStepCode: "DELIBERACAO_FINAL", actionCode: "BUDGET_REVIEWED", requiredPermission: "horas-extras:responder-orcamento:global" },
    { fromStepCode: "DELIBERACAO_FINAL", toStepCode: "EXECUCAO", actionCode: "APPROVE", requiredPermission: "horas-extras:deliberar:global" },
    { fromStepCode: "EXECUCAO", toStepCode: "FECHAMENTO", actionCode: "CLOSE_EXECUTION", requiredPermission: "horas-extras:visualizar-execucao:global" },
    { fromStepCode: "FECHAMENTO", toStepCode: "PAGAMENTO", actionCode: "CLOSE_BATCH", requiredPermission: "horas-extras:fechar-lote:global" },
  ] as const;

  for (const transition of transitions) {
    await prisma.overtimeWorkflowTransition.upsert({
      where: {
        workflowVersionId_fromStepCode_actionCode: {
          workflowVersionId: workflowVersion.id,
          fromStepCode: transition.fromStepCode,
          actionCode: transition.actionCode,
        },
      },
      update: {
        toStepCode: transition.toStepCode,
        requiredPermission: transition.requiredPermission,
      },
      create: {
        workflowVersionId: workflowVersion.id,
        fromStepCode: transition.fromStepCode,
        toStepCode: transition.toStepCode,
        actionCode: transition.actionCode,
        requiredPermission: transition.requiredPermission,
      },
    });
  }

  return {
    policy,
    policyVersion,
    workflowDefinition,
    workflowVersion,
  };
}

async function main() {
  console.log("Iniciando seed do SECP...");

  const permissoes = await criarPermissoes();
  await criarFusosHorarios();

  const perfilMaster = await criarPerfilMaster();
  const perfilAdmin = await criarPerfilAdministrador();
  const perfilServidor = await criarPerfilServidor();
  const perfilEstagiario = await criarPerfilPessoaPonto({
    codigo: "ESTAGIARIO",
    nome: "Estagiário",
    descricao: "Perfil básico para estagiários utilizarem o SECP.",
  });
  const perfilPrestador = await criarPerfilPessoaPonto({
    codigo: "PRESTADOR",
    nome: "Prestador",
    descricao: "Perfil básico para prestadores utilizarem o SECP.",
  });
  const perfilVoluntario = await criarPerfilPessoaPonto({
    codigo: "VOLUNTARIO",
    nome: "Voluntário",
    descricao: "Perfil básico para voluntários utilizarem o SECP.",
  });
  const perfilMagistrado = await criarPerfilPessoaPonto({
    codigo: "MAGISTRADO",
    nome: "Magistrado",
    descricao: "Perfil básico para magistrados utilizarem o SECP.",
  });
  const perfilChefia = await criarPerfilChefia();
  const perfilSecap = await criarPerfilSecap();
  const perfilSecad = await criarPerfilSecad();
  const perfilDiref = await criarPerfilDiref();
  const perfilSuporte = await criarPerfilSuporte();
  const perfilSuporteLegado = await criarPerfilSuporteLegado();
  const perfilExcecaoRegistroWeb = await criarPerfilExcecaoRegistroWeb();
  const perfilExcecaoRegistroFacial = await criarPerfilExcecaoRegistroFacial();

  const codigosPermissoesGlobais = codigosPermissoesPorAbrangencia(
    permissoes,
    "global",
  );
  const codigosPermissoesSeccionais = codigosPermissoesPorAbrangencia(
    permissoes,
    "seccional",
  );

  await sincronizarPermissoesPorCodigoAoPerfil(
    perfilMaster.id,
    codigosPermissoesGlobais,
  );
  await sincronizarPermissoesPorCodigoAoPerfil(
    perfilAdmin.id,
    codigosPermissoesSeccionais,
  );
  await sincronizarPermissoesPorCodigoAoPerfil(
    perfilServidor.id,
    normalizarCodigosPermissoesPerfil(
      [...codigosPermissoesServidor, "programacao-ferias:consultar:proprio"],
      "proprio",
    ),
  );
  await sincronizarPermissoesPorCodigoAoPerfil(
    perfilEstagiario.id,
    normalizarCodigosPermissoesPerfil(
      [
        ...codigosPermissoesPessoaExterna,
        "afastamentos:consultar:proprio",
        "programacao-ferias:consultar:proprio",
      ],
      "proprio",
    ),
  );
  await sincronizarPermissoesPorCodigoAoPerfil(
    perfilPrestador.id,
    normalizarCodigosPermissoesPerfil(
      [...codigosPermissoesPessoaExterna, "programacao-ferias:consultar:proprio"],
      "proprio",
    ),
  );
  await sincronizarPermissoesPorCodigoAoPerfil(
    perfilVoluntario.id,
    normalizarCodigosPermissoesPerfil(
      [...codigosPermissoesPessoaExterna, "programacao-ferias:consultar:proprio"],
      "proprio",
    ),
  );
  await sincronizarPermissoesPorCodigoAoPerfil(
    perfilMagistrado.id,
    normalizarCodigosPermissoesPerfil(
      [...codigosPermissoesServidor, "programacao-ferias:consultar:proprio"],
      "proprio",
    ),
  );
  await sincronizarPermissoesPorCodigoAoPerfil(
    perfilChefia.id,
    [
      ...normalizarCodigosPermissoesPerfil(codigosPermissoesServidor, "proprio"),
      ...normalizarCodigosPermissoesPerfil(codigosPermissoesChefia, "subordinados"),
      "programacao-ferias:consultar:subordinados",
    ],
  );
  await sincronizarPermissoesPorCodigoAoPerfil(
    perfilSecap.id,
    normalizarCodigosPermissoesPerfil(codigosPermissoesSecap, "seccional"),
  );
  await sincronizarPermissoesPorCodigoAoPerfil(
    perfilSecad.id,
    normalizarCodigosPermissoesPerfil(codigosPermissoesSecad, "seccional"),
  );
  await sincronizarPermissoesPorCodigoAoPerfil(
    perfilDiref.id,
    normalizarCodigosPermissoesPerfil(codigosPermissoesDiref, "global"),
  );
  await sincronizarPermissoesPorCodigoAoPerfil(
    perfilSuporte.id,
    normalizarCodigosPermissoesPerfil(codigosPermissoesSuporte, "global"),
  );
  await sincronizarPermissoesPorCodigoAoPerfil(
    perfilSuporteLegado.id,
    normalizarCodigosPermissoesPerfil(codigosPermissoesSuporte, "global"),
  );
  await sincronizarPermissoesPorCodigoAoPerfil(
    perfilExcecaoRegistroWeb.id,
    codigosPermissoesExcecaoRegistroWeb,
  );
  await sincronizarPermissoesPorCodigoAoPerfil(
    perfilExcecaoRegistroFacial.id,
    codigosPermissoesExcecaoRegistroFacial,
  );

  const usuarioInicial = await criarUsuarioInicial(perfilMaster.id);

  const orgao = await criarEstruturaInicial();
  await criarJornadasPadrao();
  const configuracaoHorasExtras = await criarConfiguracaoHorasExtrasPadrao(
    orgao.id,
  );
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
        horasExtras: {
          politica: configuracaoHorasExtras.policy.code,
          workflow: configuracaoHorasExtras.workflowDefinition.code,
        },
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
