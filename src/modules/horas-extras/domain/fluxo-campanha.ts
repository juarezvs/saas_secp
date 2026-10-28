import { parseIsoDateOnly } from "../application/services/horas-extras-datas.service";

export const estadosProjeto = {
  DRAFT: "Rascunho", ADMIN_REVIEW: "Análise administrativa", BUDGET_REVIEW: "Análise orçamentária",
  AUTHORITY_REVIEW: "Decisão da DIREF", AUTHORIZED: "Autorizada", EXECUTING: "Em execução",
  AWAITING_PROOF: "Aguardando comprovação", PROVEN: "Comprovada", HOMOLOGATED: "Homologada",
  FINANCIAL_REVIEW: "Definição financeira", READY_FOR_PAYROLL: "Liberada para folha", CONVERTED: "Convertida em banco",
  COMPLETED: "Concluída", RETURNED: "Devolvida", REJECTED: "Indeferida", CANCELLED: "Cancelada", SUPERSEDED: "Substituída",
} as const;
export type EstadoProjeto = keyof typeof estadosProjeto;
export const transicoesProjeto = {
  SUBMIT: { from: ["DRAFT"], to: "ADMIN_REVIEW", permission: "solicitar" },
  ADMIN_APPROVE: { from: ["ADMIN_REVIEW"], to: "BUDGET_REVIEW", permission: "analisar" },
  BUDGET_APPROVE: { from: ["BUDGET_REVIEW"], to: "AUTHORITY_REVIEW", permission: "responder-orcamento" },
  AUTHORIZE: { from: ["AUTHORITY_REVIEW"], to: "AUTHORIZED", permission: "deliberar" },
  START: { from: ["AUTHORIZED"], to: "EXECUTING", permission: "solicitar" },
  PROCESS: { from: ["AUTHORIZED", "EXECUTING", "AWAITING_PROOF"], to: "AWAITING_PROOF", permission: "reprocessar" },
  DOCUMENT_EXECUTION: {from:["AWAITING_PROOF"],to:"AWAITING_PROOF",permission:"deliberar"},
  PROVE: { from: ["AWAITING_PROOF"], to: "PROVEN", permission: "solicitar" },
  HOMOLOGATE: { from: ["PROVEN"], to: "HOMOLOGATED", permission: "deliberar" },
  DOCUMENT_BANK: {from:["HOMOLOGATED"],to:"HOMOLOGATED",permission:"deliberar"},
  FINANCIAL: { from: ["HOMOLOGATED"], to: "FINANCIAL_REVIEW", permission: "gerar-lote" },
  RECALCULATE: {from:["FINANCIAL_REVIEW"],to:"FINANCIAL_REVIEW",permission:"gerar-lote"},
  RELEASE_PAYMENT: { from: ["FINANCIAL_REVIEW"], to: "READY_FOR_PAYROLL", permission: "gerar-lote" },
  CONVERT: { from: ["HOMOLOGATED"], to: "CONVERTED", permission: "deliberar" },
  COMPLETE_BANK: { from: ["CONVERTED"], to: "COMPLETED", permission: "deliberar" },
  COMPLETE_NO_CREDIT: {from:["HOMOLOGATED"],to:"COMPLETED",permission:"deliberar"},
  CONFIRM_PAYROLL: { from: ["READY_FOR_PAYROLL"], to: "COMPLETED", permission: "gerar-lote" },
  RETURN: { from: ["ADMIN_REVIEW", "BUDGET_REVIEW", "AUTHORITY_REVIEW"], to: "RETURNED", permission: "analisar" },
  REJECT: { from: ["AUTHORITY_REVIEW"], to: "REJECTED", permission: "deliberar" },
  CANCEL: { from: ["DRAFT", "ADMIN_REVIEW", "BUDGET_REVIEW", "AUTHORITY_REVIEW", "AUTHORIZED"], to: "CANCELLED", permission: "deliberar" },
} satisfies Record<string, { from: string[]; to: EstadoProjeto; permission: string }>;
export type AcaoProjeto = keyof typeof transicoesProjeto;
export function proximoEstadoProjeto(status: string, action: AcaoProjeto) {
  const transition = transicoesProjeto[action];
  if (!transition || !(transition.from as readonly string[]).includes(status)) throw new Error("Ação incompatível com a etapa atual. Atualize a página.");
  return transition.to;
}
export function minutosHorario(time: string) {
  if(time === "24:00") return 1440;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Horário inválido.");
  const [h, m] = time.split(":").map(Number); return h * 60 + m;
}
export function minutosCivis(date: string, time: string) { return parseIsoDateOnly(date).getTime() / 60000 + minutosHorario(time); }
export type Trecho = { start: number; end: number };
export function intervaloCivil(date: string, startTime: string, endTime: string): Trecho {
  const start = minutosCivis(date, startTime); let end = minutosCivis(date, endTime);
  if (end <= start) end += 1440;
  if (end - start > 960) throw new Error("Intervalo superior a 16 horas: revise os horários.");
  return { start, end };
}
export function sobreposicao(a: Trecho, b: Trecho) { return Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start)); }
export function subtrairTrechos(source: Trecho[], exclusions: Trecho[]) {
  return exclusions.reduce((result, exclusion) => result.flatMap(t => {
    if (!sobreposicao(t, exclusion)) return [t];
    return [...(exclusion.start > t.start ? [{start:t.start,end:exclusion.start}] : []), ...(exclusion.end < t.end ? [{start:exclusion.end,end:t.end}] : [])];
  }), source);
}
export function diasUteisEntre(from: string, until: string, holidays: Set<string>) {
  const day = parseIsoDateOnly(from); const end = parseIsoDateOnly(until); let count = 0;
  for (day.setUTCDate(day.getUTCDate()+1); day < end; day.setUTCDate(day.getUTCDate()+1)) {
    if (![0,6].includes(day.getUTCDay()) && !holidays.has(day.toISOString().slice(0,10))) count++;
  }
  return count;
}
export function validarAntecedencia(today: string, firstDay: string, holidays: Set<string>, urgencyReason?: string | null) {
  if (firstDay <= today) throw new Error("Autorização e retificação devem anteceder a prestação do serviço.");
  const days = diasUteisEntre(today, firstDay, holidays);
  if (days < 5 && (urgencyReason?.trim().length ?? 0) < 30) throw new Error("Antecedência inferior a cinco dias úteis exige urgência específica para decisão da autoridade.");
  return { businessDays: days, urgencyRequiresDecision: days < 5 };
}
export function percentualDia(tipo: string) { return tipo === "DOMINGO" || tipo === "RECESSO" || tipo.startsWith("FERIADO") ? 100 : 50; }
export function fatorBanco(tipo: string) { return percentualDia(tipo) === 100 ? 2 : 1.5; }
export function validarLimitesGlobais(rows: Array<{employeeId:string; date:string; minutes:number; dayType:string; recessoAutorizado?:boolean}>) {
  const daily = new Map<string,number>(), monthly = new Map<string,number>(), annual = new Map<string,number>(), recess = new Map<string,number>();
  for (const r of rows) {
    if (!Number.isSafeInteger(r.minutes) || r.minutes < 0) throw new Error("Minutos inválidos.");
    const key = `${r.employeeId}:${r.date}`, month = key.slice(0,-3), year = `${r.employeeId}:${r.date.slice(0,4)}`;
    if(r.recessoAutorizado) {
      if(!((r.date.slice(5,7)==="12"&&Number(r.date.slice(8))>=20)||(r.date.slice(5,7)==="01"&&Number(r.date.slice(8))<=6)))throw new Error("Exceção de recesso fora do período próprio.");
      const total=(recess.get(month)??0)+r.minutes;if(total>2640)throw new Error("Limite especial de 44 horas de recesso no mês excedido.");recess.set(month,total);
    }
    const d=(daily.get(key)??0)+r.minutes, m=(monthly.get(month)??0)+(r.recessoAutorizado?0:r.minutes), a=(annual.get(year)??0)+(r.recessoAutorizado?0:r.minutes);
    const limit = r.dayType === "DIA_UTIL" || r.dayType === "PONTO_FACULTATIVO" ? 120 : 600;
    if (d > limit) throw new Error(`Limite diário excedido em ${r.date}.`);
    if (m > 2640) throw new Error(`Limite mensal de 44 horas excedido em ${r.date.slice(0,7)}.`);
    if (a > 12000) throw new Error(`Limite anual de 200 horas excedido em ${r.date.slice(0,4)}.`);
    daily.set(key,d); monthly.set(month,m); annual.set(year,a);
  }
}
export function validadeMaximaCredito(data:string) {
 const date=parseIsoDateOnly(data);return `${date.getUTCFullYear()+(date.getUTCMonth()>=10?2:1)}-12-31`;
}

/** Cada par preserva IDs, fonte e instante. Não emparelha novamente marcas ímpares. */
export function apurarTrechosReais(marks: Array<{id:string; dataHora:Date; fusoHorario:string; tipo:string; fonte:string}>, authorized: Trecho, ordinary: Trecho[], dailyOrdinaryMinutes: number) {
  const sorted=[...marks].sort((a,b)=>+a.dataHora-+b.dataHora); const issues:string[]=[];
  const civil=(m:typeof marks[number])=> {
    const parts=new Intl.DateTimeFormat("en-CA",{timeZone:m.fusoHorario,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(m.dataHora);
    const get=(type:string)=>parts.find(p=>p.type===type)!.value;
    return minutosCivis(`${get("year")}-${get("month")}-${get("day")}`,`${get("hour")}:${get("minute")}`);
  };
  const dayWindow={start:Math.floor(authorized.start/1440)*1440,end:Math.floor(authorized.start/1440)*1440+1440};
  const actual:Trecho[]=[]; let opening:typeof marks[number]|undefined;
  const relevant=(m:typeof marks[number])=>civil(m)>=dayWindow.start&&civil(m)<dayWindow.end;
  for(const mark of sorted) {
    const entry=mark.tipo === "ENTRADA" || mark.tipo === "RETORNO_INTERVALO";
    if(entry) { if(opening&&(relevant(mark)||relevant(opening))) issues.push("Entradas consecutivas: regularize as marcações."); opening=mark; }
    else if(mark.tipo==="SAIDA"||mark.tipo==="SAIDA_INTERVALO") { if(!opening) {if(relevant(mark))issues.push("Saída sem entrada correspondente."); continue;} const t={start:civil(opening),end:civil(mark)}; if(t.end<=t.start || t.end-t.start>1440) {if(relevant(mark)||relevant(opening))issues.push("Par de marcações inválido.");} else if(sobreposicao(t,dayWindow)>0)actual.push({start:Math.max(t.start,dayWindow.start),end:Math.min(t.end,dayWindow.end)}); opening=undefined; }
    else if(relevant(mark))issues.push("Marcação manual sem tipo de entrada/saída: exige tratamento documental.");
  }
  if(opening&&civil(opening)<dayWindow.end) issues.push("Marcação ímpar: há entrada sem saída.");
  const worked=actual.reduce((n,t)=>n+t.end-t.start,0);
  const minOrdinary=dailyOrdinaryMinutes===420?480:dailyOrdinaryMinutes;
  const extra=subtrairTrechos(actual,ordinary).reduce((n,t)=>n+sobreposicao(t,authorized),0);
  const intervalGaps=actual.slice(1).map((t,i)=>Math.max(0,t.start-actual[i].end));
  if(dailyOrdinaryMinutes===420&&worked>420&&!intervalGaps.some(n=>n>=60))issues.push("Jornada ininterrupta exige intervalo mínimo de uma hora antes do reconhecimento extraordinário.");
  if (dailyOrdinaryMinutes===0 && worked>420 && !intervalGaps.some(n=>n>=60)) issues.push("Prestação superior a sete horas exige intervalo mínimo de uma hora.");
  const minutes=issues.length?0:Math.max(0,Math.min(extra,worked-minOrdinary));
  return {minutes,worked,issues,intervals:actual,marks:sorted.map(m=>({id:m.id,instant:m.dataHora.toISOString(),timeZone:m.fusoHorario,source:m.fonte,type:m.tipo}))};
}
