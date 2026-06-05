export function criarDataUtc(data: string) {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

export function obterPeriodoRecessoPorAno(ano: number) {
  return {
    inicio: criarDataUtc(`${ano}-12-20`),
    fim: criarDataUtc(`${ano + 1}-01-06`),
  };
}

export function dataEstaNoPeriodoRecesso(data: Date, anoRecesso: number) {
  const { inicio, fim } = obterPeriodoRecessoPorAno(anoRecesso);
  const referencia = criarDataUtc(data.toISOString().slice(0, 10));

  return referencia >= inicio && referencia <= fim;
}

export function obterMesReferenciaRecesso(data: Date) {
  const mes = data.getUTCMonth() + 1;

  if (mes !== 12 && mes !== 1) {
    throw new Error("O fechamento de recesso deve ser de dezembro ou janeiro.");
  }

  return mes;
}

export function formatarDataRecesso(data: Date | string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(data));
}

export function formatarPeriodoRecesso(dataInicio: Date, dataFim: Date) {
  return `${formatarDataRecesso(dataInicio)} a ${formatarDataRecesso(dataFim)}`;
}
