export type StatusFrequencia = "regular" | "pendente" | "falta" | "homologado" | "recesso";
export type TipoDia = "util" | "recesso" | "feriado";

export type EspelhoDia = {
  id: string;
  data: string;
  tipo: TipoDia;
  jornadaPrevista: string;
  marcacoes: string[];
  resultado: string;
  situacao: StatusFrequencia;
  credito: string;
  debito: string;
};

export type MovimentoBancoHoras = {
  id: string;
  data: string;
  tipo: "Crédito" | "Débito" | "Compensação";
  horas: string;
  status: "Validado" | "Pendente" | "A vencer";
  vencimento: string;
  descricao: string;
};

export const mesesEspelho = ["Junho/2026", "Maio/2026", "Abril/2026"];
export const statusEspelho = ["Todos", "Regular", "Pendente", "Falta", "Homologado", "Recesso forense"];
export const tiposEspelho = ["Todos", "Dia útil", "Recesso", "Feriado"];

export const espelhoPontoMock: EspelhoDia[] = [
  { id: "1", data: "01/06/2026", tipo: "util", jornadaPrevista: "7h00", marcacoes: ["08:02", "12:00", "13:00", "15:05"], resultado: "+00h03", situacao: "regular", credito: "00h03", debito: "00h00" },
  { id: "2", data: "02/06/2026", tipo: "util", jornadaPrevista: "7h00", marcacoes: ["08:15", "12:02", "13:05"], resultado: "Pendente", situacao: "pendente", credito: "00h00", debito: "01h48" },
  { id: "3", data: "03/06/2026", tipo: "util", jornadaPrevista: "7h00", marcacoes: [], resultado: "Falta", situacao: "falta", credito: "00h00", debito: "07h00" },
  { id: "4", data: "04/06/2026", tipo: "util", jornadaPrevista: "7h00", marcacoes: ["08:00", "12:00", "13:00", "15:00"], resultado: "Homologado", situacao: "homologado", credito: "00h00", debito: "00h00" },
  { id: "5", data: "20/12/2026", tipo: "recesso", jornadaPrevista: "0h00", marcacoes: [], resultado: "Recesso forense", situacao: "recesso", credito: "00h00", debito: "00h00" },
];

export const bancoHorasMock = {
  saldoAtual: "+08h20",
  creditosAVencer: "04h10",
  debitosACompensar: "02h30",
  limiteMensal: "16h00",
  prazoCompensacao: "até 3 meses",
  impacto: "Créditos próximos do vencimento devem ser acompanhados para evitar perda de prazo.",
};

export const extratoBancoHorasMock: MovimentoBancoHoras[] = [
  { id: "m1", data: "01/06/2026", tipo: "Crédito", horas: "+00h03", status: "Validado", vencimento: "01/09/2026", descricao: "Excedente diário validado." },
  { id: "m2", data: "02/06/2026", tipo: "Débito", horas: "-01h48", status: "Pendente", vencimento: "02/09/2026", descricao: "Saída final pendente de ajuste." },
  { id: "m3", data: "10/06/2026", tipo: "Compensação", horas: "-02h00", status: "Validado", vencimento: "-", descricao: "Compensação autorizada pela chefia." },
  { id: "m4", data: "15/06/2026", tipo: "Crédito", horas: "+04h10", status: "A vencer", vencimento: "15/09/2026", descricao: "Crédito com prazo de compensação em aberto." },
];

