import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { FUSOS_HORARIOS_CADASTRO_PADRAO } from "../src/modules/fusos-horarios/domain/fusos-horarios-oficiais";
import { PROCEDIMENTOS_FREQUENCIA_PADRAO } from "../src/modules/procedimentos-frequencia/domain/procedimentos-frequencia.defaults";

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
    escopo: "subordinados",
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
    descricao: "Aprovar parcialmente solicitacoes de servico extraordinario.",
  },
  {
    recurso: "horas-extras",
    acao: "cancelar-autorizacao",
    escopo: "global",
    descricao: "Cancelar ou substituir autorizacoes de servico extraordinario.",
  },
  {
    recurso: "horas-extras",
    acao: "cadastrar-autorizacao",
    escopo: "global",
    descricao:
      "Cadastrar autorizacoes administrativas de horas extras ja formalizadas.",
  },
  {
    recurso: "horas-extras",
    acao: "retificar-autorizacao",
    escopo: "global",
    descricao:
      "Retificar autorizacoes administrativas de horas extras com trilha de auditoria.",
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
    descricao: "Configurar politicas versionadas de servico extraordinario.",
  },
  {
    recurso: "horas-extras",
    acao: "configurar-workflow",
    escopo: "global",
    descricao: "Configurar workflows versionados de servico extraordinario.",
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

const CODIGOS_PERMISSOES_USUARIO_COM_USO_PRATICO = [
  "afastamentos:consultar:global",
  "afastamentos:consultar:proprio",
  "afd:importar:global",
  "afd:importar:seccional",
  "apuracao:consultar:global",
  "apuracao:consultar:proprio",
  "apuracao:consultar:seccional",
  "apuracao:recalcular:global",
  "apuracao:recalcular:seccional",
  "auditoria:consultar:global",
  "auditoria:consultar:seccional",
  "auditoria:detalhar:global",
  "auditoria:detalhar:seccional",
  "auditoria:exportar:global",
  "auditoria:exportar:seccional",
  "banco-horas:consultar:chefia",
  "banco-horas:consultar:global",
  "banco-horas:consultar:proprio",
  "banco-horas:consultar:seccional",
  "banco-horas:consultar:subordinados",
  "banco-horas:gerenciar:global",
  "banco-horas:gerenciar:seccional",
  "banco-horas:visualizar:proprio",
  "biometria:cadastrar:proprio",
  "biometria:consultar:proprio",
  "biometria:gerenciar:global",
  "biometria:validar:proprio",
  "biometriafacial:cadastrar:proprio",
  "biometriafacial:cadastrar:seccional",
  "biometriafacial:invalidar:global",
  "biometriafacial:recadastrar:proprio",
  "biometriafacial:recadastrar:seccional",
  "biometriafacial:registrar:proprio",
  "biometriafacial:visualizar:global",
  "boletim-frequencia:consultar:global",
  "boletim-frequencia:consultar:seccional",
  "boletim-frequencia:encaminhar:chefia",
  "boletim-frequencia:encaminhar:subordinados",
  "boletim-frequencia:gerar:chefia",
  "boletim-frequencia:gerar:subordinados",
  "boletim-frequencia:receber:global",
  "boletim-frequencia:receber:seccional",
  "chefias:gerenciar:global",
  "chefias:gerenciar:seccional",
  "configuracoes:gerenciar:global",
  "configuracoes:gerenciar:seccional",
  "contracheque:consultar:proprio",
  "dashboard:visualizar:proprio",
  "espelho-ponto:visualizar:proprio",
  "fusos-horarios:gerenciar:global",
  "homologacao:consultar:global",
  "homologacao:consultar:seccional",
  "homologacao:gerenciar:chefia",
  "homologacao:gerenciar:global",
  "homologacao:gerenciar:seccional",
  "homologacao:gerenciar:subordinados",
  "horas-extras:analisar:chefia",
  "horas-extras:analisar-excecao:global",
  "horas-extras:analisar:subordinados",
  "horas-extras:aprovar-parcial:global",
  "horas-extras:auditar:global",
  "horas-extras:cadastrar-autorizacao:global",
  "horas-extras:cadastrar-autorizacao:seccional",
  "horas-extras:cancelar-autorizacao:global",
  "horas-extras:cancelar:proprio",
  "horas-extras:configurar-politica:global",
  "horas-extras:configurar-politica:seccional",
  "horas-extras:configurar-responsaveis:global",
  "horas-extras:configurar-responsaveis:seccional",
  "horas-extras:configurar-workflow:global",
  "horas-extras:configurar-workflow:seccional",
  "horas-extras:deliberar:global",
  "horas-extras:deliberar:seccional",
  "horas-extras:devolver:global",
  "horas-extras:encaminhar-orcamento:chefia",
  "horas-extras:exportar:global",
  "horas-extras:fechar-lote:global",
  "horas-extras:gerar-lote:global",
  "horas-extras:gerar-lote:seccional",
  "horas-extras:rejeitar:global",
  "horas-extras:reprocessar:global",
  "horas-extras:responder-orcamento:global",
  "horas-extras:responder-orcamento:seccional",
  "horas-extras:retificar-autorizacao:global",
  "horas-extras:retificar-autorizacao:seccional",
  "horas-extras:solicitar:proprio",
  "horas-extras:solicitar:subordinados",
  "horas-extras:visualizar-execucao:global",
  "horas-extras:visualizar-execucao:seccional",
  "horas-extras:visualizar-folha:global",
  "horas-extras:visualizar-folha:seccional",
  "horas-extras:visualizar:proprio",
  "integracoes-sarh:configurar:global",
  "integracoes-sarh:consultar:global",
  "integracoes-sarh:executar:global",
  "integracoes-sarh:reprocessar:global",
  "integracoes-sarh:simular:global",
  "integracoes-teams:ativar:global",
  "integracoes-teams:baixar-manifesto:global",
  "integracoes-teams:configurar:global",
  "integracoes-teams:desativar:global",
  "integracoes-teams:testar:global",
  "integracoes-teams:visualizar:global",
  "integracoes:consultar:global",
  "integracoes:consultar:seccional",
  "integracoes:gerenciar:global",
  "integracoes:gerenciar:seccional",
  "integracoes:sincronizar:global",
  "jornadas:gerenciar:global",
  "jornadas:gerenciar:seccional",
  "marcacoes:consultar:global",
  "marcacoes:consultar:proprio",
  "marcacoes:consultar:seccional",
  "marcacoes:excluir:global",
  "marcacoes:excluir:seccional",
  "marcacoes:gerenciar:global",
  "marcacoes:gerenciar:seccional",
  "marcacoes:registrar-facial:proprio",
  "marcacoes:registrar-totem:global",
  "marcacoes:registrar-totem:seccional",
  "marcacoes:registrar-web:proprio",
  "marcacoes:registrar:proprio",
  "marcacoes:visualizar:proprio",
  "menus:personalizar:global",
  "menus:personalizar:seccional",
  "minha-equipe:consultar:chefia",
  "minha-equipe:consultar:global",
  "minha-equipe:consultar:seccional",
  "minha-equipe:consultar:subordinados",
  "painel-executivo:alertas-inteligentes:global",
  "painel-executivo:auditoria-e-conformidade:global",
  "painel-executivo:banco-de-horas:global",
  "painel-executivo:consultar:global",
  "painel-executivo:consultar:seccional",
  "painel-executivo:controle-de-homologacao-mensal:global",
  "painel-executivo:equipamentos-de-ponto:global",
  "painel-executivo:equipamentos:global",
  "painel-executivo:frequencia-e-assiduidade:global",
  "painel-executivo:graficos-importantes:global",
  "painel-executivo:indicadores-por-unidade-e-chefia:global",
  "painel-executivo:indicadores:global",
  "painel-executivo:jornada-e-carga-horaria:global",
  "painel-executivo:justificativas-e-ocorrencias:global",
  "painel-executivo:paineis:global",
  "painel-executivo:pendencias-de-ponto:global",
  "painel-executivo:relatorios-exportaveis:global",
  "painel-executivo:teletrabalho-presencial-registro-web:global",
  "perfis:gerenciar:global",
  "perfis:gerenciar:seccional",
  "procedimentos-frequencia:autorizar:global",
  "procedimentos-frequencia:autorizar:seccional",
  "procedimentos-frequencia:consultar:global",
  "procedimentos-frequencia:consultar:seccional",
  "procedimentos-frequencia:emitir-nada-consta:global",
  "procedimentos-frequencia:emitir-nada-consta:seccional",
  "procedimentos-frequencia:executar:global",
  "procedimentos-frequencia:executar:seccional",
  "procedimentos-frequencia:gerenciar:global",
  "procedimentos-frequencia:gerenciar:seccional",
  "programacao-ferias:consultar:global",
  "programacao-ferias:consultar:proprio",
  "programacao-ferias:consultar:seccional",
  "programacao-ferias:consultar:subordinados",
  "recesso:aceitar:seccional",
  "recesso:consultar:global",
  "recesso:consultar:proprio",
  "recesso:consultar:seccional",
  "recesso:convocacao:global",
  "recesso:excluir:global",
  "recesso:fechar:proprio",
  "recesso:gerenciar:global",
  "recesso:gerenciar:seccional",
  "recesso:homologar:chefia",
  "recesso:homologar:subordinados",
  "regulamentacao-ponto:gerenciar:global",
  "regulamentacao-ponto:gerenciar:seccional",
  "relatorios-gerenciais:consultar:chefia",
  "relatorios-gerenciais:consultar:global",
  "relatorios-gerenciais:consultar:proprio",
  "relatorios-gerenciais:consultar:seccional",
  "relatorios-gerenciais:consultar:subordinados",
  "relatorios-gerenciais:exportar:chefia",
  "relatorios-gerenciais:exportar:global",
  "relatorios-gerenciais:exportar:proprio",
  "relatorios:consultar:global",
  "relatorios:consultar:proprio",
  "relatorios:consultar:seccional",
  "relatorios:exportar:global",
  "relatorios:exportar:proprio",
  "servidores:consultar:global",
  "servidores:consultar:seccional",
  "servidores:gerenciar:global",
  "servidores:gerenciar:seccional",
  "solicitacoes:analisar:chefia",
  "solicitacoes:analisar:subordinados",
  "solicitacoes:consultar:global",
  "solicitacoes:consultar:proprio",
  "solicitacoes:consultar:seccional",
  "solicitacoes:criar:proprio",
  "solicitacoes:visualizar:proprio",
  "substituicoes-funcao:consultar:global",
  "substituicoes-funcao:consultar:seccional",
  "substituicoes-funcao:gerenciar:global",
  "substituicoes-funcao:gerenciar:seccional",
  "substituicoes-funcao:relatorio:global",
  "substituicoes-funcao:relatorio:proprio",
  "substituicoes-funcao:relatorio:seccional",
  "substituicoes-funcao:relatorio:subordinados",
  "teams-aprovacoes:analisar:chefia",
  "teams-banco-horas:consultar:proprio",
  "teams-bot:usar:proprio",
  "teams-homologacao:analisar:chefia",
  "teams-notificacoes:receber:proprio",
  "teams-ponto:registrar:proprio",
  "teams-solicitacoes:criar:proprio",
  "unidades:gerenciar:global",
  "unidades:gerenciar:seccional",
  "usuarios:consultar:global",
  "usuarios:consultar:seccional",
  "usuarios:gerenciar:global",
  "usuarios:gerenciar:seccional",
] as const;

const CODIGOS_PERMISSOES_CONTROLE_SISTEMA = [
  "integracoes:receber-webhook:global",
] as const;

const codigosPermissoesComUsoPratico = new Set<string>([
  ...CODIGOS_PERMISSOES_USUARIO_COM_USO_PRATICO,
  ...CODIGOS_PERMISSOES_CONTROLE_SISTEMA,
]);

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
  "horas-extras:solicitar:subordinados",
  "horas-extras:responder-orcamento:global",
  "horas-extras:deliberar:global",
  "horas-extras:aprovar-parcial:global",
  "horas-extras:cancelar-autorizacao:global",
  "horas-extras:cadastrar-autorizacao:global",
  "horas-extras:cadastrar-autorizacao:seccional",
  "horas-extras:retificar-autorizacao:global",
  "horas-extras:retificar-autorizacao:seccional",
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
    recurso: "procedimentos-frequencia",
    acao: "consultar",
    escopo: "seccional",
    descricao:
      "Consultar procedimentos administrativos de frequencia da propria seccional.",
  },
  {
    recurso: "procedimentos-frequencia",
    acao: "gerenciar",
    escopo: "seccional",
    descricao:
      "Gerenciar procedimentos administrativos de frequencia da propria seccional.",
  },
  {
    recurso: "procedimentos-frequencia",
    acao: "executar",
    escopo: "seccional",
    descricao:
      "Registrar execucao de procedimentos administrativos de frequencia na propria seccional.",
  },
  {
    recurso: "procedimentos-frequencia",
    acao: "autorizar",
    escopo: "seccional",
    descricao:
      "Autorizar procedimentos administrativos de frequencia na propria seccional.",
  },
  {
    recurso: "procedimentos-frequencia",
    acao: "emitir-nada-consta",
    escopo: "seccional",
    descricao:
      "Emitir Nada Consta de frequencia para servidores da propria seccional.",
  },
  {
    recurso: "procedimentos-frequencia",
    acao: "consultar",
    escopo: "global",
    descricao:
      "Consultar procedimentos administrativos de frequencia de todos os orgaos.",
  },
  {
    recurso: "procedimentos-frequencia",
    acao: "gerenciar",
    escopo: "global",
    descricao:
      "Gerenciar procedimentos administrativos de frequencia de todos os orgaos.",
  },
  {
    recurso: "procedimentos-frequencia",
    acao: "executar",
    escopo: "global",
    descricao:
      "Registrar execucao de procedimentos administrativos de frequencia em todos os orgaos.",
  },
  {
    recurso: "procedimentos-frequencia",
    acao: "autorizar",
    escopo: "global",
    descricao:
      "Autorizar procedimentos administrativos de frequencia em todos os orgaos.",
  },
  {
    recurso: "procedimentos-frequencia",
    acao: "emitir-nada-consta",
    escopo: "global",
    descricao:
      "Emitir Nada Consta de frequencia para servidores de todos os orgaos.",
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
    acao: "registrar-totem",
    escopo: "seccional",
    descricao: "Operar Totem de registro facial para servidores da seccional.",
  },
  {
    recurso: "marcacoes",
    acao: "registrar-totem",
    escopo: "global",
    descricao: "Operar Totem de registro facial para qualquer seccional.",
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
    escopo: "global",
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

  // Substituições de função
  {
    recurso: "substituicoes-funcao",
    acao: "consultar",
    escopo: "seccional",
    descricao:
      "Consultar substituições de função, titulares, substitutos e histórico por seccional.",
  },
  {
    recurso: "substituicoes-funcao",
    acao: "gerenciar",
    escopo: "seccional",
    descricao:
      "Cadastrar, editar, suspender e encerrar substituições de função por seccional.",
  },
  {
    recurso: "substituicoes-funcao",
    acao: "configurar-valores",
    escopo: "seccional",
    descricao:
      "Configurar referências e valores de funções usados no cálculo de substituição.",
  },
  {
    recurso: "substituicoes-funcao",
    acao: "calcular-pagamento",
    escopo: "seccional",
    descricao:
      "Calcular pagamento de substituição com base em afastamentos, faltas e regras da seccional.",
  },
  {
    recurso: "substituicoes-funcao",
    acao: "aprovar-pagamento",
    escopo: "seccional",
    descricao:
      "Aprovar, rejeitar ou cancelar pagamentos calculados de substituição.",
  },
  {
    recurso: "substituicoes-funcao",
    acao: "enviar-folha",
    escopo: "seccional",
    descricao:
      "Marcar pagamentos de substituição como enviados para processamento em folha.",
  },
  {
    recurso: "substituicoes-funcao",
    acao: "consultar",
    escopo: "global",
    descricao:
      "Consultar substituições de função, titulares, substitutos e histórico em todas as seccionais.",
  },
  {
    recurso: "substituicoes-funcao",
    acao: "gerenciar",
    escopo: "global",
    descricao:
      "Cadastrar, editar, suspender e encerrar substituições de função em todas as seccionais.",
  },
  {
    recurso: "substituicoes-funcao",
    acao: "configurar-valores",
    escopo: "global",
    descricao:
      "Configurar referências e valores de funções usados no cálculo de substituição em todas as seccionais.",
  },
  {
    recurso: "substituicoes-funcao",
    acao: "calcular-pagamento",
    escopo: "global",
    descricao:
      "Calcular pagamento de substituição com base em afastamentos, faltas e regras de qualquer seccional.",
  },
  {
    recurso: "substituicoes-funcao",
    acao: "aprovar-pagamento",
    escopo: "global",
    descricao:
      "Aprovar, rejeitar ou cancelar pagamentos calculados de substituição em todas as seccionais.",
  },
  {
    recurso: "substituicoes-funcao",
    acao: "enviar-folha",
    escopo: "global",
    descricao:
      "Marcar pagamentos de substituição como enviados para processamento em folha em todas as seccionais.",
  },
  {
    recurso: "substituicoes-funcao",
    acao: "relatorio",
    escopo: "proprio",
    descricao: "Consultar relatório das próprias substituições de função.",
  },
  {
    recurso: "substituicoes-funcao",
    acao: "relatorio",
    escopo: "subordinados",
    descricao:
      "Consultar relatório de substituições de função dos subordinados.",
  },
  {
    recurso: "substituicoes-funcao",
    acao: "relatorio",
    escopo: "seccional",
    descricao:
      "Consultar relatório de substituições de função da própria seccional.",
  },
  {
    recurso: "substituicoes-funcao",
    acao: "relatorio",
    escopo: "global",
    descricao:
      "Consultar relatório de substituições de função de todas as seccionais.",
  },

  // Integração Microsoft Teams
  {
    recurso: "integracoes-teams",
    acao: "visualizar",
    escopo: "global",
    descricao: "Visualizar configuração e saúde da integração Microsoft Teams.",
  },
  {
    recurso: "integracoes-teams",
    acao: "configurar",
    escopo: "global",
    descricao: "Configurar parâmetros da integração Microsoft Teams.",
  },
  {
    recurso: "integracoes-teams",
    acao: "ativar",
    escopo: "global",
    descricao: "Ativar a integração Microsoft Teams.",
  },
  {
    recurso: "integracoes-teams",
    acao: "desativar",
    escopo: "global",
    descricao: "Desativar a integração Microsoft Teams.",
  },
  {
    recurso: "integracoes-teams",
    acao: "testar",
    escopo: "global",
    descricao: "Executar testes operacionais da integração Microsoft Teams.",
  },
  {
    recurso: "integracoes-teams",
    acao: "baixar-manifesto",
    escopo: "global",
    descricao: "Baixar o manifesto do aplicativo Microsoft Teams do SECP.",
  },
  {
    recurso: "teams-bot",
    acao: "usar",
    escopo: "proprio",
    descricao: "Usar o bot conversacional do SECP no Microsoft Teams.",
  },
  {
    recurso: "teams-notificacoes",
    acao: "receber",
    escopo: "proprio",
    descricao: "Receber notificações individuais do SECP no Microsoft Teams.",
  },
  {
    recurso: "teams-ponto",
    acao: "registrar",
    escopo: "proprio",
    descricao: "Registrar ponto pelo Microsoft Teams quando autorizado.",
  },
  {
    recurso: "teams-banco-horas",
    acao: "consultar",
    escopo: "proprio",
    descricao: "Consultar banco de horas pelo Microsoft Teams.",
  },
  {
    recurso: "teams-solicitacoes",
    acao: "criar",
    escopo: "proprio",
    descricao: "Criar solicitações pelo Microsoft Teams.",
  },
  {
    recurso: "teams-aprovacoes",
    acao: "analisar",
    escopo: "chefia",
    descricao: "Analisar aprovações pelo Microsoft Teams.",
  },
  {
    recurso: "teams-homologacao",
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
    escopo: "seccional",
    descricao: "Cadastrar biometria facial de terceiros.",
  },
  {
    recurso: "biometriafacial",
    acao: "recadastrar",
    escopo: "seccional",
    descricao: "Recadastrar biometria facial de terceiros.",
  },
  {
    recurso: "biometriafacial",
    acao: "visualizar",
    escopo: "global",
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
    escopo: "seccional",
    descricao:
      "Importar arquivos AFD de equipamentos biométricos da própria seccional.",
  },
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
    acao: "excluir",
    escopo: "global",
    descricao: "Excluir recesso forense cadastrado.",
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
    escopo: "global",
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
    escopo: "seccional",
    descricao: "Aceitar homologacao do recesso pela SECAD.",
  },
  {
    recurso: "recesso",
    acao: "relatorio",
    escopo: "global",
    descricao: "Gerar relatorio de pecunia do recesso para SEPAG.",
  },
  {
    recurso: "recesso",
    acao: "relatorio",
    escopo: "seccional",
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
  "teams-bot:usar:proprio",
  "teams-notificacoes:receber:proprio",
  "teams-ponto:registrar:proprio",
  "teams-banco-horas:consultar:proprio",
  "teams-solicitacoes:criar:proprio",
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
  "substituicoes-funcao:relatorio:subordinados",
  "afastamentos:consultar:chefia",
  "recesso:homologar:chefia",
  "recesso:consultar:global",
  "teams-bot:usar:proprio",
  "teams-notificacoes:receber:proprio",
  "teams-banco-horas:consultar:proprio",
  "teams-solicitacoes:criar:proprio",
  "teams-aprovacoes:analisar:chefia",
  "teams-homologacao:analisar:chefia",
];

const codigosPermissoesAdministrador = [
  "dashboard:visualizar:proprio",
  "painel-executivo:consultar:global",
  ...codigosPermissoesSubmenusPainelExecutivo,
  "usuarios:gerenciar:global",
  "usuarios:consultar:global",
  "perfis:gerenciar:global",
  "unidades:gerenciar:global",
  "servidores:gerenciar:global",
  "servidores:consultar:global",
  "chefias:gerenciar:global",
  "jornadas:gerenciar:global",
  "jornadas:gerenciar-politicas:global",
  "configuracoes:gerenciar:global",
  "menus:personalizar:global",
  "regulamentacao-ponto:gerenciar:global",
  "procedimentos-frequencia:consultar:global",
  "procedimentos-frequencia:gerenciar:global",
  "procedimentos-frequencia:executar:global",
  "procedimentos-frequencia:autorizar:global",
  "procedimentos-frequencia:emitir-nada-consta:global",
  "substituicoes-funcao:consultar:seccional",
  "substituicoes-funcao:gerenciar:seccional",
  "substituicoes-funcao:configurar-valores:seccional",
  "substituicoes-funcao:calcular-pagamento:seccional",
  "substituicoes-funcao:aprovar-pagamento:seccional",
  "substituicoes-funcao:enviar-folha:seccional",
  "substituicoes-funcao:relatorio:seccional",
  "fusos-horarios:gerenciar:global",
  "marcacoes:consultar:global",
  "marcacoes:gerenciar:global",
  "marcacoes:excluir:global",
  "marcacoes:registrar-totem:global",
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
  "substituicoes-funcao:relatorio:global",
  "afastamentos:consultar:global",
  "recesso:consultar:global",
  "recesso:gerenciar:global",
  "recesso:excluir:global",
  "recesso:convocacao:global",
  "integracoes:consultar:global",
  "integracoes:gerenciar:global",
  "auditoria:consultar:global",
  "auditoria:detalhar:global",
  "auditoria:exportar:global",
  "biometriafacial:cadastrar:seccional",
  "biometriafacial:recadastrar:seccional",
  "biometriafacial:visualizar:global",
  "biometriafacial:invalidar:global",
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
  "procedimentos-frequencia:consultar:global",
  "procedimentos-frequencia:gerenciar:global",
  "procedimentos-frequencia:executar:global",
  "procedimentos-frequencia:autorizar:global",
  "procedimentos-frequencia:emitir-nada-consta:global",
  "substituicoes-funcao:consultar:seccional",
  "substituicoes-funcao:gerenciar:seccional",
  "substituicoes-funcao:configurar-valores:seccional",
  "substituicoes-funcao:calcular-pagamento:seccional",
  "substituicoes-funcao:aprovar-pagamento:seccional",
  "substituicoes-funcao:enviar-folha:seccional",
  "substituicoes-funcao:relatorio:seccional",
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
  "substituicoes-funcao:relatorio:global",
  "afastamentos:consultar:global",
  "recesso:consultar:global",
  "recesso:relatorio:seccional",
];

const codigosPermissoesSecad = [
  "dashboard:visualizar:proprio",
  "painel-executivo:consultar:global",
  ...codigosPermissoesSubmenusPainelExecutivo,
  "servidores:consultar:global",
  ...codigosPermissoesHorasExtrasGestao,
  "recesso:gerenciar:global",
  "recesso:excluir:global",
  "recesso:consultar:global",
  "recesso:convocacao:global",
  "recesso:aceitar:seccional",
  "relatorios:consultar:global",
  "relatorios:exportar:global",
  "relatorios-gerenciais:consultar:global",
  "relatorios-gerenciais:exportar:global",
  "substituicoes-funcao:relatorio:global",
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
  "substituicoes-funcao:relatorio:global",
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
  "integracoes-teams:visualizar:global",
  "integracoes-teams:configurar:global",
  "integracoes-teams:ativar:global",
  "integracoes-teams:desativar:global",
  "integracoes-teams:testar:global",
  "integracoes-teams:baixar-manifesto:global",
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
  "biometriafacial:cadastrar:seccional",
  "biometriafacial:recadastrar:seccional",
  "biometriafacial:visualizar:global",
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
  "substituicoes-funcao:relatorio:global",
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
  if (escopo === "chefia") {
    return "subordinados";
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

function montarPermissoesSeedCatalogoAmplo() {
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

function montarPermissoesSeedPadronizadas() {
  return montarPermissoesSeedCatalogoAmplo().filter((item) =>
    codigosPermissoesComUsoPratico.has(codigoPermissao(item)),
  );
}

async function criarPermissoes() {
  const permissoes = [];
  const codigosCriados = new Set<string>();
  const itensPermissao = montarPermissoesSeedPadronizadas();

  for (const item of itensPermissao) {
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

  const codigosCatalogoGerenciadoRemoviveis =
    montarPermissoesSeedCatalogoAmplo()
      .map(codigoPermissao)
      .filter((codigo) => !codigosCriados.has(codigo));
  const permissoesRemovidas = await prisma.permissao.findMany({
    where: {
      codigo: {
        in: codigosCatalogoGerenciadoRemoviveis,
      },
    },
    select: {
      id: true,
    },
  });
  const idsRemovidos = permissoesRemovidas.map((permissao) => permissao.id);

  if (idsRemovidos.length > 0) {
    await prisma.perfilPermissao.deleteMany({
      where: {
        permissaoId: {
          in: idsRemovidos,
        },
      },
    });
    await prisma.permissao.deleteMany({
      where: {
        id: {
          in: idsRemovidos,
        },
      },
    });
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
  const partes = codigo.split(":");
  const ultimoSegmento = partes.at(-1);

  if (!ultimoSegmento) {
    return codigo;
  }

  const escoposConhecidos = new Set([...ABRANGENCIAS_PADRAO, "chefia"]);

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
  const codigosUnicos = Array.from(new Set(codigos)).filter((codigo) =>
    codigosPermissoesComUsoPratico.has(codigo),
  );
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
      console.warn(`Permissão não encontrada no seed: ${codigo}`);
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
    {
      dayType: "DIA_UTIL",
      ratePercent: "50",
      dailyLimitMinutes: 120,
      eligibilityThresholdMinutes: 480,
    },
    {
      dayType: "SABADO",
      ratePercent: "50",
      dailyLimitMinutes: 480,
      eligibilityThresholdMinutes: 0,
    },
    {
      dayType: "DOMINGO",
      ratePercent: "100",
      dailyLimitMinutes: 480,
      eligibilityThresholdMinutes: 0,
    },
    {
      dayType: "FERIADO_NACIONAL",
      ratePercent: "100",
      dailyLimitMinutes: 480,
      eligibilityThresholdMinutes: 0,
    },
    {
      dayType: "FERIADO_ESTADUAL",
      ratePercent: "100",
      dailyLimitMinutes: 480,
      eligibilityThresholdMinutes: 0,
    },
    {
      dayType: "FERIADO_MUNICIPAL",
      ratePercent: "100",
      dailyLimitMinutes: 480,
      eligibilityThresholdMinutes: 0,
    },
    {
      dayType: "FERIADO_REGIMENTAL",
      ratePercent: "100",
      dailyLimitMinutes: 480,
      eligibilityThresholdMinutes: 0,
    },
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
      id:
        workflowDefinitionExistente?.id ??
        "00000000-0000-0000-0000-000000000000",
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
    {
      code: "SERVIDOR_SOLICITANTE",
      name: "Servidor solicitante",
      order: 1,
      requiredPermission: "horas-extras:solicitar:proprio",
      allowsPartialApproval: false,
    },
    {
      code: "ANALISE_CHEFIA",
      name: "Analise da chefia",
      order: 2,
      requiredPermission: "horas-extras:analisar:chefia",
      allowsPartialApproval: true,
    },
    {
      code: "ANALISE_ORCAMENTARIA",
      name: "Analise orcamentaria",
      order: 3,
      requiredPermission: "horas-extras:responder-orcamento:global",
      allowsPartialApproval: true,
    },
    {
      code: "DELIBERACAO_FINAL",
      name: "Deliberacao final",
      order: 4,
      requiredPermission: "horas-extras:deliberar:global",
      allowsPartialApproval: true,
    },
    {
      code: "EXECUCAO",
      name: "Execucao",
      order: 5,
      requiredPermission: "horas-extras:visualizar-execucao:global",
      allowsPartialApproval: false,
    },
    {
      code: "FECHAMENTO",
      name: "Fechamento",
      order: 6,
      requiredPermission: "horas-extras:gerar-lote:global",
      allowsPartialApproval: false,
    },
    {
      code: "PAGAMENTO",
      name: "Pagamento",
      order: 7,
      requiredPermission: "horas-extras:visualizar-folha:global",
      allowsPartialApproval: false,
    },
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
    {
      fromStepCode: "SERVIDOR_SOLICITANTE",
      toStepCode: "ANALISE_CHEFIA",
      actionCode: "SUBMIT",
      requiredPermission: "horas-extras:solicitar:proprio",
    },
    {
      fromStepCode: "ANALISE_CHEFIA",
      toStepCode: "SERVIDOR_SOLICITANTE",
      actionCode: "RETURN",
      requiredPermission: "horas-extras:devolver:global",
    },
    {
      fromStepCode: "ANALISE_CHEFIA",
      toStepCode: "ANALISE_ORCAMENTARIA",
      actionCode: "FORWARD_BUDGET",
      requiredPermission: "horas-extras:encaminhar-orcamento:chefia",
    },
    {
      fromStepCode: "ANALISE_ORCAMENTARIA",
      toStepCode: "DELIBERACAO_FINAL",
      actionCode: "BUDGET_REVIEWED",
      requiredPermission: "horas-extras:responder-orcamento:global",
    },
    {
      fromStepCode: "DELIBERACAO_FINAL",
      toStepCode: "EXECUCAO",
      actionCode: "APPROVE",
      requiredPermission: "horas-extras:deliberar:global",
    },
    {
      fromStepCode: "EXECUCAO",
      toStepCode: "FECHAMENTO",
      actionCode: "CLOSE_EXECUTION",
      requiredPermission: "horas-extras:visualizar-execucao:global",
    },
    {
      fromStepCode: "FECHAMENTO",
      toStepCode: "PAGAMENTO",
      actionCode: "CLOSE_BATCH",
      requiredPermission: "horas-extras:fechar-lote:global",
    },
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

async function criarProcedimentosFrequenciaPadrao() {
  const orgaos = await prisma.orgao.findMany({
    where: { ativo: true },
    select: { id: true },
  });

  for (const orgao of orgaos) {
    for (const [
      index,
      procedimento,
    ] of PROCEDIMENTOS_FREQUENCIA_PADRAO.entries()) {
      await prisma.procedimentoAdministrativoFrequencia.upsert({
        where: {
          orgaoId_codigo: {
            orgaoId: orgao.id,
            codigo: procedimento.codigo,
          },
        },
        update: {
          nome: procedimento.nome,
          categoria: procedimento.categoria as never,
          objetivoFinal: procedimento.objetivoFinal,
          descricao: procedimento.descricao,
          efeitosEsperados: procedimento.efeitosEsperados,
          checklist: procedimento.checklist,
          ordem: index + 1,
        },
        create: {
          orgaoId: orgao.id,
          codigo: procedimento.codigo,
          nome: procedimento.nome,
          categoria: procedimento.categoria as never,
          objetivoFinal: procedimento.objetivoFinal,
          descricao: procedimento.descricao,
          requerProcessoSei: procedimento.requerProcessoSei,
          requerCienciaGestor: procedimento.requerCienciaGestor,
          requerAutoridade: procedimento.requerAutoridade,
          requerAnexo: procedimento.requerAnexo,
          permiteBancoAberto: procedimento.permiteBancoAberto,
          permiteBancoFechado: procedimento.permiteBancoFechado,
          preservaHistoricoOriginal: procedimento.preservaHistoricoOriginal,
          permiteRecalculo: procedimento.permiteRecalculo,
          permiteLancamentoCompetenciaPosterior:
            procedimento.permiteLancamentoCompetenciaPosterior,
          mesesRetroatividadeLivre: procedimento.mesesRetroatividadeLivre,
          permissaoExecutar: procedimento.permissaoExecutar,
          permissaoAutorizar: procedimento.permissaoAutorizar,
          efeitosEsperados: procedimento.efeitosEsperados,
          checklist: procedimento.checklist,
          ordem: index + 1,
        },
      });
    }
  }
}

const permissoesLegadasNormalizadas = [
  {
    de: ["integracoes", "teams", "visualizar"],
    para: "integracoes-teams:visualizar:global",
  },
  {
    de: ["integracoes", "teams", "configurar"],
    para: "integracoes-teams:configurar:global",
  },
  {
    de: ["integracoes", "teams", "ativar"],
    para: "integracoes-teams:ativar:global",
  },
  {
    de: ["integracoes", "teams", "desativar"],
    para: "integracoes-teams:desativar:global",
  },
  {
    de: ["integracoes", "teams", "testar"],
    para: "integracoes-teams:testar:global",
  },
  {
    de: ["integracoes", "teams", "baixar-manifesto"],
    para: "integracoes-teams:baixar-manifesto:global",
  },
  { de: ["teams", "bot", "usar"], para: "teams-bot:usar:proprio" },
  {
    de: ["teams", "notificacoes", "receber"],
    para: "teams-notificacoes:receber:proprio",
  },
  {
    de: ["teams", "ponto", "registrar"],
    para: "teams-ponto:registrar:proprio",
  },
  {
    de: ["teams", "banco-horas", "consultar"],
    para: "teams-banco-horas:consultar:proprio",
  },
  {
    de: ["teams", "solicitacoes", "criar"],
    para: "teams-solicitacoes:criar:proprio",
  },
  {
    de: ["teams", "aprovacoes", "analisar"],
    para: "teams-aprovacoes:analisar:chefia",
  },
  {
    de: ["teams", "homologacao", "analisar"],
    para: "teams-homologacao:analisar:chefia",
  },
  {
    de: ["biometriafacial", "cadastrar", "terceiros"],
    para: "biometriafacial:cadastrar:seccional",
  },
  {
    de: ["biometriafacial", "recadastrar", "terceiros"],
    para: "biometriafacial:recadastrar:seccional",
  },
  {
    de: ["biometriafacial", "visualizar", "auditoria"],
    para: "biometriafacial:visualizar:global",
  },
  {
    de: ["integracoes", "receber-webhook", "sistema"],
    para: "integracoes:receber-webhook:global",
  },
  {
    de: ["horas-extras", "solicitar", "unidade"],
    para: "horas-extras:solicitar:subordinados",
  },
  { de: ["recesso", "aceitar", "secad"], para: "recesso:aceitar:seccional" },
  {
    de: ["recesso", "convocacao", "gerenciar"],
    para: "recesso:convocacao:global",
  },
  {
    de: ["recesso", "relatorio", "secap"],
    para: "recesso:relatorio:seccional",
  },
  { de: ["recesso", "relatorio", "sepag"], para: "recesso:relatorio:global" },
] as const;

async function normalizarPermissoesLegadas() {
  for (const mapeamento of permissoesLegadasNormalizadas) {
    const codigoLegado = mapeamento.de.join(":");
    const [permissaoLegada, permissaoNormalizada] = await Promise.all([
      prisma.permissao.findUnique({ where: { codigo: codigoLegado } }),
      prisma.permissao.findUnique({ where: { codigo: mapeamento.para } }),
    ]);

    if (!permissaoLegada) {
      continue;
    }

    if (!permissaoNormalizada) {
      await prisma.$transaction([
        prisma.perfilPermissao.deleteMany({
          where: { permissaoId: permissaoLegada.id },
        }),
        prisma.permissao.delete({
          where: { id: permissaoLegada.id },
        }),
      ]);
      continue;
    }

    const vinculos = await prisma.perfilPermissao.findMany({
      where: { permissaoId: permissaoLegada.id },
      select: { perfilId: true },
    });

    await prisma.$transaction([
      ...vinculos.map((vinculo) =>
        prisma.perfilPermissao.upsert({
          where: {
            perfilId_permissaoId: {
              perfilId: vinculo.perfilId,
              permissaoId: permissaoNormalizada.id,
            },
          },
          update: {},
          create: {
            perfilId: vinculo.perfilId,
            permissaoId: permissaoNormalizada.id,
          },
        }),
      ),
      prisma.perfilPermissao.deleteMany({
        where: { permissaoId: permissaoLegada.id },
      }),
    ]);

    await prisma.permissao
      .delete({ where: { id: permissaoLegada.id } })
      .catch(() => undefined);
  }
}

async function criarCategoriasPessoasPadrao() {
  const categorias = [
    {
      codigo: "SERVIDOR",
      nome: "Servidor",
      descricao: "Categoria padrao para servidores.",
    },
    {
      codigo: "ESTAGIARIO",
      nome: "Estagiario",
      descricao: "Categoria padrao para estagiarios.",
    },
    {
      codigo: "VOLUNTARIO",
      nome: "Voluntario",
      descricao: "Categoria padrao para voluntarios.",
    },
    {
      codigo: "PRESTADOR",
      nome: "Prestador",
      descricao: "Categoria padrao para prestadores.",
    },
  ];

  for (const categoria of categorias) {
    await prisma.categoriaPessoa.upsert({
      where: { codigo: categoria.codigo },
      update: {
        nome: categoria.nome,
        descricao: categoria.descricao,
        ativo: true,
        sistema: true,
      },
      create: {
        ...categoria,
        sistema: true,
      },
    });
  }
}

async function main() {
  console.log("Iniciando seed do SECP...");

  const permissoes = await criarPermissoes();
  await normalizarPermissoesLegadas();
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
  await sincronizarPermissoesPorCodigoAoPerfil(
    perfilMaster.id,
    codigosPermissoesGlobais,
  );
  await sincronizarPermissoesPorCodigoAoPerfil(
    perfilAdmin.id,
    normalizarCodigosPermissoesPerfil(
      codigosPermissoesAdministrador,
      "seccional",
    ),
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
        "substituicoes-funcao:relatorio:proprio",
      ],
      "proprio",
    ),
  );
  await sincronizarPermissoesPorCodigoAoPerfil(
    perfilPrestador.id,
    normalizarCodigosPermissoesPerfil(
      [
        ...codigosPermissoesPessoaExterna,
        "programacao-ferias:consultar:proprio",
      ],
      "proprio",
    ),
  );
  await sincronizarPermissoesPorCodigoAoPerfil(
    perfilVoluntario.id,
    normalizarCodigosPermissoesPerfil(
      [
        ...codigosPermissoesPessoaExterna,
        "programacao-ferias:consultar:proprio",
      ],
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
  await sincronizarPermissoesPorCodigoAoPerfil(perfilChefia.id, [
    ...normalizarCodigosPermissoesPerfil(codigosPermissoesServidor, "proprio"),
    ...normalizarCodigosPermissoesPerfil(
      codigosPermissoesChefia,
      "subordinados",
    ),
    "programacao-ferias:consultar:subordinados",
  ]);
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
  await criarCategoriasPessoasPadrao();
  const configuracaoHorasExtras = await criarConfiguracaoHorasExtrasPadrao(
    orgao.id,
  );
  await criarProcedimentosFrequenciaPadrao();
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
