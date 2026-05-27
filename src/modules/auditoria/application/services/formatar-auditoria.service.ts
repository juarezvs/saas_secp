export function formatarDataHoraAuditoria(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Manaus",
  }).format(data);
}

export function rotuloEntidadeAuditoria(entidade: string) {
  const rotulos: Record<string, string> = {
    Usuario: "Usuário",
    UsuarioPerfil: "Perfil do usuário",
    Marcacao: "Marcação",
    ApuracaoDiaria: "Apuração diária",
    BancoHoras: "Banco de horas",
    BancoHorasSaldo: "Saldo do banco de horas",
    MovimentoBancoHoras: "Movimento do banco de horas",
    Solicitacao: "Solicitação",
    FechamentoMensalUnidade: "Fechamento mensal",
    HomologacaoServidorMes: "Homologação do servidor",
    BoletimFrequencia: "Boletim de frequência",
  };

  return rotulos[entidade] ?? entidade;
}

export function formatarJsonAuditoria(valor: unknown) {
  if (valor === null || valor === undefined) {
    return "-";
  }

  try {
    return JSON.stringify(valor, null, 2);
  } catch {
    return String(valor);
  }
}
