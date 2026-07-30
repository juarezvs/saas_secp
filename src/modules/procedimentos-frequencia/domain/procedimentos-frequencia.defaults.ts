export type ProcedimentoFrequenciaPadrao = {
  codigo: string;
  nome: string;
  categoria: string;
  objetivoFinal: string;
  descricao: string;
  requerProcessoSei: boolean;
  requerCienciaGestor: boolean;
  requerAutoridade: boolean;
  requerAnexo: boolean;
  permiteBancoAberto: boolean;
  permiteBancoFechado: boolean;
  preservaHistoricoOriginal: boolean;
  permiteRecalculo: boolean;
  permiteLancamentoCompetenciaPosterior: boolean;
  mesesRetroatividadeLivre: number;
  permissaoExecutar: string;
  permissaoAutorizar: string;
  efeitosEsperados: string[];
  checklist: string[];
};

export const PROCEDIMENTOS_FREQUENCIA_PADRAO: ProcedimentoFrequenciaPadrao[] = [
  {
    codigo: "JORNADA_DIARIA",
    nome: "Jornada diária",
    categoria: "JORNADA_DIARIA",
    objetivoFinal:
      "Apurar trabalho diário, crédito e débito conforme a regulamentação da seccional e a jornada vigente do servidor.",
    descricao:
      "Controla a janela ordinária, carga esperada, intervalo aplicável e geração de crédito ou débito no espelho de ponto.",
    requerProcessoSei: false,
    requerCienciaGestor: false,
    requerAutoridade: false,
    requerAnexo: false,
    permiteBancoAberto: true,
    permiteBancoFechado: false,
    preservaHistoricoOriginal: true,
    permiteRecalculo: true,
    permiteLancamentoCompetenciaPosterior: false,
    mesesRetroatividadeLivre: 0,
    permissaoExecutar: "apuracao:recalcular:seccional",
    permissaoAutorizar: "regulamentacao-ponto:gerenciar:seccional",
    efeitosEsperados: [
      "Recalcular marcações, carga prevista, crédito, débito e inconsistências do dia.",
      "Aplicar regras da jornada e da regulamentação do órgão sem afetar outras seccionais.",
    ],
    checklist: [
      "Servidor possui jornada vigente na data.",
      "Regulamentação do órgão está ativa.",
      "Calendário institucional da seccional está atualizado.",
    ],
  },
  {
    codigo: "HORA_EXTRA",
    nome: "Hora extra",
    categoria: "HORA_EXTRA",
    objetivoFinal:
      "Autorizar serviço extraordinário, controlar execução real e separar o que foi executado dentro ou fora do limite autorizado.",
    descricao:
      "Usa política e fluxo de horas extras por seccional para autorização, orçamento, deliberação, execução e folha.",
    requerProcessoSei: true,
    requerCienciaGestor: true,
    requerAutoridade: true,
    requerAnexo: true,
    permiteBancoAberto: true,
    permiteBancoFechado: true,
    preservaHistoricoOriginal: true,
    permiteRecalculo: true,
    permiteLancamentoCompetenciaPosterior: true,
    mesesRetroatividadeLivre: 6,
    permissaoExecutar: "horas-extras:visualizar-execucao:seccional",
    permissaoAutorizar: "horas-extras:deliberar:seccional",
    efeitosEsperados: [
      "Gerar autorização prévia por período, dia e quantidade aprovada.",
      "Confrontar horas autorizadas com horas efetivamente apuradas.",
      "Direcionar valores aprovados para banco de horas ou folha, conforme política.",
    ],
    checklist: [
      "Processo ou autorização formal informado.",
      "Limites diários e mensais conferidos.",
      "Intervalo intrajornada exigido quando aplicável.",
      "Excedente sem autorização permanece separado como não autorizado.",
    ],
  },
  {
    codigo: "COMPENSACAO_SALDO",
    nome: "Compensação de saldo",
    categoria: "COMPENSACAO_SALDO",
    objetivoFinal:
      "Regularizar débito mediante compensação autorizada, reduzindo ausência ou débito no banco de horas.",
    descricao:
      "Permite tratar falta ou débito com autorização, sem depender de código externo de ocorrência.",
    requerProcessoSei: true,
    requerCienciaGestor: true,
    requerAutoridade: false,
    requerAnexo: false,
    permiteBancoAberto: true,
    permiteBancoFechado: true,
    preservaHistoricoOriginal: true,
    permiteRecalculo: true,
    permiteLancamentoCompetenciaPosterior: true,
    mesesRetroatividadeLivre: 6,
    permissaoExecutar: "banco-horas:gerenciar:seccional",
    permissaoAutorizar: "homologacao:gerenciar:chefia",
    efeitosEsperados: [
      "Abater débito com crédito ou compensação previamente autorizada.",
      "Registrar justificativa e vínculo documental no movimento do banco.",
    ],
    checklist: [
      "Débito localizado no espelho ou banco.",
      "Autorização da chefia registrada.",
      "Competência aberta ou procedimento de ajuste posterior autorizado.",
    ],
  },
  {
    codigo: "ALTERACAO_TEMPORARIA_JORNADA",
    nome: "Alteração temporária de jornada",
    categoria: "ALTERACAO_TEMPORARIA_JORNADA",
    objetivoFinal:
      "Aplicar jornada diferente por período, como substituição ou designação temporária, recalculando o período afetado.",
    descricao:
      "Usa vínculo temporal de jornada do servidor com fundamento documental e vigência.",
    requerProcessoSei: true,
    requerCienciaGestor: false,
    requerAutoridade: true,
    requerAnexo: false,
    permiteBancoAberto: true,
    permiteBancoFechado: true,
    preservaHistoricoOriginal: true,
    permiteRecalculo: true,
    permiteLancamentoCompetenciaPosterior: true,
    mesesRetroatividadeLivre: 6,
    permissaoExecutar: "jornadas:gerenciar:seccional",
    permissaoAutorizar: "jornadas:gerenciar:seccional",
    efeitosEsperados: [
      "Criar ou ajustar vínculo de jornada por data inicial e final.",
      "Reprocessar espelho e banco quando a alteração alcançar competência aberta.",
    ],
    checklist: [
      "Jornada de destino cadastrada.",
      "Período de vigência definido.",
      "Documento autorizativo informado.",
    ],
  },
  {
    codigo: "AFASTAMENTO_INFORMATIVO",
    nome: "Afastamento informativo",
    categoria: "AFASTAMENTO_INFORMATIVO",
    objetivoFinal:
      "Registrar afastamento que justifica ou informa a frequência sem necessariamente alterar o saldo do banco.",
    descricao:
      "Permite parametrizar afastamentos importados ou registrados como informativos, com controle de compensação quando necessário.",
    requerProcessoSei: true,
    requerCienciaGestor: true,
    requerAutoridade: false,
    requerAnexo: true,
    permiteBancoAberto: true,
    permiteBancoFechado: true,
    preservaHistoricoOriginal: true,
    permiteRecalculo: true,
    permiteLancamentoCompetenciaPosterior: false,
    mesesRetroatividadeLivre: 6,
    permissaoExecutar: "afastamentos:consultar:global",
    permissaoAutorizar: "solicitacoes:analisar:chefia",
    efeitosEsperados: [
      "Exibir afastamento no espelho como ocorrência informativa.",
      "Preservar saldo quando a norma definir que o evento não altera banco de horas.",
      "Permitir controle de compensação em solicitação separada.",
    ],
    checklist: [
      "Tipo de afastamento identificado no SARH ou solicitação.",
      "Efeito no banco definido como informativo ou compensável.",
      "Gestor ciente da compensação quando houver.",
    ],
  },
  {
    codigo: "JORNADA_ESPECIAL",
    nome: "Jornada especial ou reduzida",
    categoria: "JORNADA_ESPECIAL",
    objetivoFinal:
      "Aplicar jornada especial por razões médicas, legais ou administrativas, com vigência e recalculo do período autorizado.",
    descricao:
      "Usa jornada específica e vínculo por período para alterar carga esperada sem afetar outros servidores.",
    requerProcessoSei: true,
    requerCienciaGestor: false,
    requerAutoridade: true,
    requerAnexo: true,
    permiteBancoAberto: true,
    permiteBancoFechado: true,
    preservaHistoricoOriginal: true,
    permiteRecalculo: true,
    permiteLancamentoCompetenciaPosterior: true,
    mesesRetroatividadeLivre: 6,
    permissaoExecutar: "jornadas:gerenciar:seccional",
    permissaoAutorizar: "jornadas:gerenciar:seccional",
    efeitosEsperados: [
      "Reduzir ou adaptar carga prevista durante a vigência.",
      "Recalcular o período retroativo autorizado quando permitido.",
    ],
    checklist: [
      "Documento autorizativo anexado ao processo.",
      "Jornada especial cadastrada.",
      "Data de início e término definidas ou revisáveis.",
    ],
  },
  {
    codigo: "AJUSTE_BANCO_ABERTO",
    nome: "Ajuste com banco aberto",
    categoria: "AJUSTE_BANCO_ABERTO",
    objetivoFinal:
      "Corrigir marcações, ocorrências ou banco de horas enquanto a competência ainda permite recálculo.",
    descricao:
      "O procedimento pode registrar marcação administrativa, aplicar solicitação deferida e reprocessar o período.",
    requerProcessoSei: false,
    requerCienciaGestor: true,
    requerAutoridade: false,
    requerAnexo: false,
    permiteBancoAberto: true,
    permiteBancoFechado: false,
    preservaHistoricoOriginal: true,
    permiteRecalculo: true,
    permiteLancamentoCompetenciaPosterior: false,
    mesesRetroatividadeLivre: 0,
    permissaoExecutar: "apuracao:recalcular:seccional",
    permissaoAutorizar: "homologacao:gerenciar:chefia",
    efeitosEsperados: [
      "Registrar ajuste ou deferir solicitação.",
      "Recalcular espelho e banco da competência aberta.",
    ],
    checklist: [
      "Competência não homologada ou reaberta.",
      "Solicitação ou justificativa registrada.",
      "Conferência do espelho após o recálculo.",
    ],
  },
  {
    codigo: "AJUSTE_BANCO_FECHADO",
    nome: "Ajuste com banco fechado",
    categoria: "AJUSTE_BANCO_FECHADO",
    objetivoFinal:
      "Regularizar evento pretérito em competência fechada, preservando histórico e lançando o impacto em competência permitida.",
    descricao:
      "Evita apagar registros originais e permite tratar o saldo final por ajuste administrativo posterior.",
    requerProcessoSei: true,
    requerCienciaGestor: true,
    requerAutoridade: true,
    requerAnexo: true,
    permiteBancoAberto: false,
    permiteBancoFechado: true,
    preservaHistoricoOriginal: true,
    permiteRecalculo: false,
    permiteLancamentoCompetenciaPosterior: true,
    mesesRetroatividadeLivre: 6,
    permissaoExecutar: "banco-horas:gerenciar:seccional",
    permissaoAutorizar: "homologacao:gerenciar:global",
    efeitosEsperados: [
      "Preservar espelho e marcações originais da competência fechada.",
      "Registrar justificativa, autoridade e processo.",
      "Lançar crédito ou débito em competência posterior permitida.",
    ],
    checklist: [
      "Espelho original conferido antes do ajuste.",
      "Autoridade competente identificada para eventos além da retroatividade livre.",
      "Competência de lançamento posterior definida.",
      "Impacto sobre saldo vencido verificado.",
    ],
  },
  {
    codigo: "TRABALHO_REMOTO",
    nome: "Teletrabalho ou trabalho remoto",
    categoria: "TRABALHO_REMOTO",
    objetivoFinal:
      "Registrar período autorizado de trabalho remoto e tratar frequência conforme a regra da seccional.",
    descricao:
      "Permite controlar período autorizado, exigência de frequência manual e impacto no espelho.",
    requerProcessoSei: true,
    requerCienciaGestor: true,
    requerAutoridade: true,
    requerAnexo: false,
    permiteBancoAberto: true,
    permiteBancoFechado: true,
    preservaHistoricoOriginal: true,
    permiteRecalculo: true,
    permiteLancamentoCompetenciaPosterior: false,
    mesesRetroatividadeLivre: 6,
    permissaoExecutar: "servidores:gerenciar:seccional",
    permissaoAutorizar: "homologacao:gerenciar:chefia",
    efeitosEsperados: [
      "Registrar período autorizado no servidor.",
      "Aplicar regra de frequência manual ou dispensa conforme parametrização.",
      "Exibir o tratamento no espelho de ponto.",
    ],
    checklist: [
      "Portaria ou ato autorizativo publicado.",
      "Período e unidade do servidor conferidos.",
      "Regra de frequência manual/dispensa definida.",
    ],
  },
  {
    codigo: "CONVERSAO_HORAS_NAO_AUTORIZADAS",
    nome: "Conversão de horas não autorizadas",
    categoria: "CONVERSAO_HORAS_NAO_AUTORIZADAS",
    objetivoFinal:
      "Converter horas excedentes não autorizadas em horas trabalhadas quando houver ciência e autorização competente.",
    descricao:
      "Permite regularizar excedentes, separando mês aberto de mês fechado e preservando a justificativa.",
    requerProcessoSei: true,
    requerCienciaGestor: true,
    requerAutoridade: false,
    requerAnexo: true,
    permiteBancoAberto: true,
    permiteBancoFechado: true,
    preservaHistoricoOriginal: true,
    permiteRecalculo: true,
    permiteLancamentoCompetenciaPosterior: true,
    mesesRetroatividadeLivre: 6,
    permissaoExecutar: "banco-horas:gerenciar:seccional",
    permissaoAutorizar: "homologacao:gerenciar:chefia",
    efeitosEsperados: [
      "Transformar excedente não autorizado em crédito computável quando aprovado.",
      "Em competência fechada, lançar saldo positivo em competência posterior permitida.",
    ],
    checklist: [
      "Ciência do gestor registrada.",
      "Total de horas não autorizadas conferido.",
      "Competência aberta recalculada ou competência posterior definida.",
    ],
  },
  {
    codigo: "NADA_CONSTA",
    nome: "Nada Consta de frequência",
    categoria: "NADA_CONSTA",
    objetivoFinal:
      "Emitir declaração consolidada de situação funcional de frequência, banco de horas, débitos vencidos e faltas.",
    descricao:
      "Consulta saldos e pendências do servidor para instruir processo administrativo.",
    requerProcessoSei: true,
    requerCienciaGestor: false,
    requerAutoridade: false,
    requerAnexo: false,
    permiteBancoAberto: true,
    permiteBancoFechado: true,
    preservaHistoricoOriginal: true,
    permiteRecalculo: false,
    permiteLancamentoCompetenciaPosterior: false,
    mesesRetroatividadeLivre: 0,
    permissaoExecutar: "procedimentos-frequencia:emitir-nada-consta:seccional",
    permissaoAutorizar: "procedimentos-frequencia:emitir-nada-consta:seccional",
    efeitosEsperados: [
      "Informar saldo de banco de horas.",
      "Apontar débitos vencidos, faltas injustificadas e pendências de homologação.",
      "Registrar emissão vinculada ao processo.",
    ],
    checklist: [
      "Servidor identificado.",
      "Banco de horas atualizado.",
      "Homologações e pendências conferidas.",
      "Resultado anexado ou informado no processo.",
    ],
  },
];

