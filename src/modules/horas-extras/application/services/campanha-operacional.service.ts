import { z } from "zod";
import { createHash, randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { possuiAlgumaPermissaoNaLista } from "@/modules/auth/application/services/permissao-utils";
import { afastamentoSarhDeveImpactarApuracao } from "@/modules/apuracao/application/services/afastamento-sarh-efeito.service";
import { resolverPrevisaoJornadaDia } from "@/modules/jornadas/application/services/resolver-previsao-jornada-dia.service";
import { apurarTrechosReais, fatorBanco, intervaloCivil, percentualDia, proximoEstadoProjeto, sobreposicao, validarAntecedencia, validarLimitesGlobais, validadeMaximaCredito } from "../../domain/fluxo-campanha";
import { campanhaOperacionalSchema, decisaoProjetoSchema, projetoCampanhaSchema, remuneracaoCampanhaSchema, rubricaCampanhaSchema } from "../schemas/campanha-operacional.schema";
import { exigirCampanhasHorasExtrasHabilitadas } from "./campanhas-horas-extras-feature.service";
import { executarOperacaoOrcamentoCampanhaEmTransacao, type ContextoOrcamentoCampanha } from "./orcamento-campanha-horas-extras.service";
import { podeAcessarOrgaoHorasExtras } from "./escopo-horas-extras.service";
import { parseIsoDateOnly } from "./horas-extras-datas.service";
import { calcularValorHorasExtras } from "./calcular-valor-horas-extras.service";

export type ContextoCampanha = ContextoOrcamentoCampanha;
type Tx=Prisma.TransactionClient;
export type CalendarioCampanha = (date:string, employeeId:string)=>Promise<{dayType:string; businessDay:boolean}>;
export const iso=(d:Date)=>d.toISOString().slice(0,10);
export const hojeCampanha=()=>new Intl.DateTimeFormat("en-CA",{timeZone:process.env.APP_TIMEZONE||"America/Manaus",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const json=(v:unknown):Prisma.InputJsonValue=>JSON.parse(JSON.stringify(v));
const terminal=["CANCELLED","REJECTED","SUPERSEDED","RETURNED"];
const includeVersion={fundings:true,items:{include:{employee:{include:{usuario:true}}},orderBy:[{date:"asc" as const},{startTime:"asc" as const}]},project:{include:{campaign:true,account:{include:{unit:true}}}},authorizations:{include:{servidores:true}},events:{orderBy:{createdAt:"asc" as const}}} satisfies Prisma.OvertimeProjectVersionInclude;
type Version=Prisma.OvertimeProjectVersionGetPayload<{include:typeof includeVersion}>;

export function temAcaoCampanha(ctx:ContextoCampanha,action:string) {
  if(action==="solicitar")return possuiAlgumaPermissaoNaLista(ctx.permissoes,["horas-extras:solicitar:subordinados","horas-extras:solicitar:chefia","horas-extras:solicitar:global","horas-extras:solicitar:seccional","horas-extras:configurar-politica:global","horas-extras:configurar-politica:seccional"]);
  return possuiAlgumaPermissaoNaLista(ctx.permissoes,[`horas-extras:${action}:global`,`horas-extras:${action}:seccional`,...(action==="analisar"?["horas-extras:analisar:chefia","horas-extras:analisar:subordinados"]:[]),...(action==="solicitar"?["horas-extras:solicitar:proprio","horas-extras:solicitar:subordinados","horas-extras:solicitar:chefia"]:[])]);
}
export function exigirAcaoCampanha(ctx:ContextoCampanha,orgaoId:string,action:string) {
 exigirCampanhasHorasExtrasHabilitadas(orgaoId);
 if(!ctx.usuarioId||!ctx.perfilAtivoCodigo||!podeAcessarOrgaoHorasExtras(ctx.escopo,orgaoId)||!temAcaoCampanha(ctx,action))throw new Error("Perfil sem ação ou escopo para esta operação.");
}
export async function exigirUnidadeAtiva(tx:Tx,unitId:string,orgaoId:string) {
 const unit=await tx.unidadeOrganizacional.findFirst({where:{id:unitId,orgaoId,ativo:true,orgao:{ativo:true}}});
 if(!unit)throw new Error("Unidade ou órgão inativo ou fora do escopo.");
 const hidden=await tx.$queryRaw<Array<{id:string}>>`WITH RECURSIVE pais AS (SELECT id,unidade_pai_id,ativo FROM unidades_organizacionais WHERE id=${unitId}::uuid UNION SELECT u.id,u.unidade_pai_id,u.ativo FROM unidades_organizacionais u JOIN pais p ON p.unidade_pai_id=u.id) SELECT id FROM pais WHERE NOT ativo`;
 if(hidden.length)throw new Error("Unidade superior inativa.");
 return unit;
}
export async function exigirTitularCampanha(tx:Tx,ctx:ContextoCampanha,unitId:string,allowAdministrator=true) {
 if(allowAdministrator&&temAcaoCampanha(ctx,"configurar-politica"))return;
 const now=parseIsoDateOnly(hojeCampanha());
 const managers=await tx.$queryRaw<Array<{id:string}>>`WITH RECURSIVE pais AS (SELECT id,unidade_pai_id FROM unidades_organizacionais WHERE id=${unitId}::uuid UNION SELECT u.id,u.unidade_pai_id FROM unidades_organizacionais u JOIN pais p ON p.unidade_pai_id=u.id) SELECT g.id FROM gestores_unidades g JOIN servidores s ON s.id=g.servidor_id WHERE s.usuario_id=${ctx.usuarioId}::uuid AND s.ativo AND s.orgao_id=(SELECT orgao_id FROM unidades_organizacionais WHERE id=${unitId}::uuid) AND g.unidade_id IN (SELECT id FROM pais) AND g.ativo AND g.data_inicio<=${now} AND (g.data_fim IS NULL OR g.data_fim>=${now})`;
 if(!managers.length)throw new Error("Somente a chefia responsável pela unidade pode apresentar este projeto.");
}
const exigirTitular=exigirTitularCampanha;
async function lockCampaign(tx:Tx,id:string) {
 await tx.$queryRaw`SELECT id FROM overtime_campaigns WHERE id=${id}::uuid FOR UPDATE`;
 return tx.overtimeCampaign.findUniqueOrThrow({where:{id}});
}
async function audit(tx:Tx,ctx:ContextoCampanha,entity:string,id:string,action:string,before:unknown,after:unknown,reason:string,document:string,correlationId=randomUUID()) {
 await tx.auditoriaEvento.create({data:{usuarioId:ctx.usuarioId,entidade:entity,entidadeId:id,acao:action,dadosAntes:json(before),dadosDepois:json(after),metadados:{perfilAtivo:ctx.perfilAtivoCodigo,justificativa:reason,seiDocument:document,correlationId}}});
}
async function event(tx:Tx,ctx:ContextoCampanha,v:Version,action:string,toStatus:string,reason:string,document:string,before:unknown,after:unknown) {
 const correlationId=randomUUID();
 await tx.overtimeProjectEvent.create({data:{versionId:v.id,actorUserId:ctx.usuarioId,activeProfile:ctx.perfilAtivoCodigo,action,fromStatus:v.status,toStatus,reason,seiDocument:document,correlationId,before:json(before),after:json(after)}});
 await audit(tx,ctx,"OvertimeProjectVersion",v.id,`HORAS_EXTRAS_PROJETO_${action}`,before,after,reason,document,correlationId);
}

export async function criarCampanhaOperacional(db:PrismaClient,ctx:ContextoCampanha,data:unknown) {
 const input=campanhaOperacionalSchema.parse(data); exigirAcaoCampanha(ctx,input.orgaoId,"configurar-politica");
 return db.$transaction(async tx=>{
  for(const a of input.accounts)await exigirUnidadeAtiva(tx,a.unitId,input.orgaoId);
  const {accounts,description,criteria,workflow,campaignId,...fields}=input;
  const previous=campaignId?await lockCampaign(tx,campaignId):null;
  if(previous&&(previous.orgaoId!==input.orgaoId||previous.status!=="DRAFT"))throw new Error("Somente rascunhos do mesmo órgão podem ser editados.");
  const values={...fields,validFrom:parseIsoDateOnly(input.validFrom),validUntil:parseIsoDateOnly(input.validUntil),projectDeadline:parseIsoDateOnly(input.projectDeadline),proofDeadline:parseIsoDateOnly(input.proofDeadline),rules:{description,criteria,workflow,minimumBusinessDays:5,weekdayDailyLimitMinutes:120,monthlyLimitMinutes:2640,annualLimitMinutes:12000},sourceManifest:{document:input.authorizationDocument,registeredBy:ctx.usuarioId}};
  if(previous&&(await tx.overtimeBudgetOperation.count({where:{campaignId:previous.id}})||await tx.overtimeProject.count({where:{campaignId:previous.id}})))throw new Error("Campanha com movimentos ou projetos exige nova versão administrativa; o histórico não pode ser substituído.");
  if(previous)await tx.overtimeCampaignAccount.deleteMany({where:{campaignId:previous.id}});
  const campaign=previous?await tx.overtimeCampaign.update({where:{id:previous.id},data:{...values,accounts:{create:accounts}}}):await tx.overtimeCampaign.create({data:{...values,accounts:{create:accounts}}});
  await audit(tx,ctx,"OvertimeCampaign",campaign.id,previous?"HORAS_EXTRAS_CAMPANHA_RASCUNHO_EDITADO":"HORAS_EXTRAS_CAMPANHA_CRIADA",previous,campaign,"Cadastro documental da campanha",input.authorizationDocument);
  return campaign;
 });
}
export async function alterarStatusCampanha(db:PrismaClient,ctx:ContextoCampanha,id:string,status:"ACTIVE"|"CLOSED"|"CANCELLED",reason:string) {
 if(reason.trim().length<10)throw new Error("Informe o motivo da alteração.");
 return db.$transaction(async tx=>{
  const campaign=await lockCampaign(tx,id); exigirAcaoCampanha(ctx,campaign.orgaoId,"configurar-politica");
  if(campaign.status!=="DRAFT"&&!(campaign.status==="ACTIVE"&&status!=="ACTIVE"))throw new Error("Transição de campanha inválida.");
  if(status==="ACTIVE"&&(!campaign.validFrom||!campaign.validUntil))throw new Error("Defina a vigência antes de ativar a campanha.");
  const accounts=await tx.overtimeCampaignAccount.findMany({where:{campaignId:id}});
  for(const a of accounts)await exigirUnidadeAtiva(tx,a.unitId,campaign.orgaoId);
  if(status!=="ACTIVE"&&await tx.overtimeProjectVersion.count({where:{project:{campaignId:id},status:{notIn:[...terminal,"COMPLETED","DRAFT"]}}}))throw new Error("Conclua ou cancele os projetos em tramitação antes de encerrar a campanha.");
  const after=await tx.overtimeCampaign.update({where:{id},data:{status}});
  await audit(tx,ctx,"OvertimeCampaign",id,"HORAS_EXTRAS_CAMPANHA_STATUS",campaign,after,reason,campaign.authorizationDocument); return after;
 });
}

async function lockEmployees(tx:Tx,ids:string[]) {
 for(const id of [...new Set(ids)].sort())await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`horas-extras-servidor:${id}`},0))`;
}
async function validarHistorico(tx:Tx,items:Array<{employeeId:string;date:Date;requestedMinutes:number;approvedMinutes?:number;startTime:string;endTime:string;dayType:string;recessCallId?:string|null}>,excludeVersion?:string) {
 const ids=[...new Set(items.map(i=>i.employeeId))]; await lockEmployees(tx,ids);
 const existing=await tx.overtimeProjectItem.findMany({where:{employeeId:{in:ids},...(excludeVersion?{versionId:{not:excludeVersion}}:{}),version:{status:{notIn:[...terminal,"DRAFT"]}}},include:{version:{select:{status:true}}}});
 const history:Array<{employeeId:string;date:string;minutes:number;dayType:string;recessoAutorizado?:boolean}>=existing.map(i=>({employeeId:i.employeeId,date:iso(i.date),minutes:["ADMIN_REVIEW","BUDGET_REVIEW","AUTHORITY_REVIEW"].includes(i.version.status)?i.requestedMinutes:i.approvedMinutes,dayType:i.dayType,recessoAutorizado:Boolean(i.recessCallId)}));
 // Autorizações antigas também participam; a ponte da campanha é excluída para não contar duas vezes.
 const legacy=await tx.autorizacaoHoraExtraServidor.findMany({where:{servidorId:{in:ids},status:{not:"CANCELADO"},autorizacao:{campaignVersionId:null,status:{notIn:["CANCELADA","RASCUNHO"]}}},include:{regras:true}});
 for(const old of legacy)for(const rule of old.regras) {
  if(!rule.data||!rule.limiteMinutos)throw new Error(`Autorização histórica sem distribuição diária para ${old.matriculaSnapshot}: concilie os limites antes de autorizar.`);
  history.push({employeeId:old.servidorId,date:iso(rule.data),minutes:rule.limiteMinutos,dayType:rule.tipoDia??"DIA_UTIL"});
 }
 const oldWorkflow=await tx.overtimeAuthorization.findMany({where:{employeeId:{in:ids},status:"ACTIVE"},include:{days:true}});
 for(const old of oldWorkflow)for(const day of old.days)history.push({employeeId:old.employeeId,date:iso(day.date),minutes:day.approvedMinutes,dayType:day.dayType});
 for(const item of items)for(const old of existing)if(old.employeeId===item.employeeId&&sobreposicao(intervaloCivil(iso(item.date),item.startTime,item.endTime),intervaloCivil(iso(old.date),old.startTime,old.endTime)))throw new Error("Horário sobreposto a outro projeto em tramitação ou autorizado.");
 validarLimitesGlobais([...history,...items.map(i=>({employeeId:i.employeeId,date:iso(i.date),minutes:i.approvedMinutes??i.requestedMinutes,dayType:i.dayType,recessoAutorizado:Boolean(i.recessCallId)}))]);
}

export async function salvarProjetoCampanha(db:PrismaClient,ctx:ContextoCampanha,data:unknown,calendar:CalendarioCampanha) {
 const input=projetoCampanhaSchema.parse(data);
 return db.$transaction(async tx=>{
  const campaign=await lockCampaign(tx,input.campaignId); exigirAcaoCampanha(ctx,campaign.orgaoId,"solicitar");
  if(campaign.status!=="ACTIVE")throw new Error("Campanha não está ativa.");
  const account=await tx.overtimeCampaignAccount.findFirstOrThrow({where:{id:input.accountId,campaignId:campaign.id}});
  await exigirUnidadeAtiva(tx,account.unitId,campaign.orgaoId); await exigirTitular(tx,ctx,account.unitId);
  await exigirTitularCampanha(tx,{...ctx,usuarioId:input.responsibleUserId},account.unitId,false);
  const responsible=await tx.usuario.findUniqueOrThrow({where:{id:input.responsibleUserId},select:{id:true,nome:true,matricula:true}});
  const today=hojeCampanha();
  const old=input.projectId?await tx.overtimeProject.findUniqueOrThrow({where:{id:input.projectId},include:{versions:{orderBy:{version:"desc"},take:1,include:includeVersion}}}):null;
  const previous=old?.versions[0];
  if(old&&old.requesterUserId!==responsible.id)throw new Error("Retificação preserva a chefia responsável original; mudança de responsável exige novo projeto e decisão documentada.");
  if(old&&(old.accountId!==account.id||old.campaignId!==campaign.id||(old.requesterUserId!==ctx.usuarioId&&!temAcaoCampanha(ctx,"configurar-politica"))))throw new Error("Projeto fora da unidade ou titular informado.");
  if(previous&&!['DRAFT','RETURNED','AUTHORIZED'].includes(previous.status))throw new Error("Esta etapa não permite retificação.");
  if(previous&&(input.amendmentReason?.trim().length??0)<10)throw new Error("Informe o motivo da nova versão.");
  if(previous?.status==="AUTHORIZED"&&previous.items.some(i=>iso(i.date)<=today))throw new Error("Retificação posterior ao início da execução é vedada; preserve a autorização original.");
  const items=[];
  const normalized=input.items.flatMap(row=>{
   if(row.endTime>row.startTime)return [row];
   const span=intervaloCivil(row.date,row.startTime,row.endTime);const first=1440-(span.start%1440);
   if(row.breakMinutes>first)throw new Error("Na virada, registre o intervalo intrajornada em itens separados por data.");
   const total=span.end-span.start-row.breakMinutes;const a=new Prisma.Decimal(row.estimatedAmount).mul(first-row.breakMinutes).div(total).toDecimalPlaces(2);
   const next=new Date(parseIsoDateOnly(row.date));next.setUTCDate(next.getUTCDate()+1);
   return [{...row,endTime:"24:00",estimatedAmount:a.toFixed(2)},{...row,date:iso(next),startTime:"00:00",breakMinutes:0,estimatedAmount:new Prisma.Decimal(row.estimatedAmount).minus(a).toFixed(2)}].filter(r=>r.startTime!==r.endTime);
  });
  for(const row of normalized) {
   const date=parseIsoDateOnly(row.date); if(!campaign.validFrom||!campaign.validUntil||date<campaign.validFrom||date>campaign.validUntil)throw new Error("Data fora da vigência da campanha.");
   const employee=await tx.servidor.findFirstOrThrow({where:{id:row.employeeId,orgaoId:campaign.orgaoId,ativo:true},include:{usuario:true,cargo:true,lotacoes:{where:{unidadeId:account.unitId,status:"ATIVO",dataInicio:{lte:date},OR:[{dataFim:null},{dataFim:{gte:date}}]}}}});
   if(!employee.lotacoes.length)throw new Error("Servidor sem lotação vigente na unidade do projeto.");
   const away=await tx.afastamentoSarh.findMany({where:{servidorId:employee.id,ativo:true,dataInicio:{lte:date},OR:[{dataFim:null},{dataFim:{gte:date}}]}});
   if(away.some(afastamentoSarhDeveImpactarApuracao))throw new Error(`Há afastamento vigente para ${employee.matricula} em ${row.date}.`);
   const type=await calendar(row.date,employee.id); const interval=intervaloCivil(row.date,row.startTime,row.endTime);
   const minutes=interval.end-interval.start-row.breakMinutes;
   if(minutes<=0)throw new Error("Intervalo não possui minutos de trabalho.");
   if(type.dayType==="SABADO"&&input.ordinaryImpossibility.length<40)throw new Error("Justifique a impossibilidade de realizar o serviço nos dias úteis.");
   if((type.dayType==="DOMINGO"||type.dayType.startsWith("FERIADO"))&&input.ordinaryImpossibility.length<60)throw new Error("Demonstre a impossibilidade de realização nos dias úteis e analise a alternativa do sábado.");
   const recessCall=type.dayType==="RECESSO"?await tx.convocadoRecesso.findFirst({where:{servidorId:employee.id,dataConvocacao:date,status:{not:"CANCELADO"},convocacao:{status:"PUBLICADA"}}}):null;
   if(type.dayType==="RECESSO"&&!recessCall)throw new Error("Serviço no recesso exige convocação publicada vinculada ao servidor e à data.");
   if(recessCall&&recessCall.minutosTrabalhados>0)throw new Error("Convocação já possui execução no módulo de recesso; concilie a origem para não processar duas vezes.");
   const binding=await jornadaDia(tx,employee.id,date,type.dayType);
   if(!binding)throw new Error(`Jornada vigente não encontrada para ${employee.matricula}.`);
   if(binding.special) {
    if(type.businessDay)throw new Error("Horário especial do art. 98: serviço extraordinário deve observar as hipóteses de finais de semana e feriados.");
    const restriction=await tx.overtimeEmployeeRestriction.findFirst({where:{employeeId:employee.id,validFrom:{lte:date},validUntil:{gte:date}},orderBy:[{createdAt:"desc"},{id:"desc"}]});
    if(!restriction)throw new Error("Horário especial exige limite da Junta Oficial em Saúde validado pela área competente.");
    if(minutes>restriction.maxDailyMinutes)throw new Error("Quantidade supera o limite documentado para o horário especial.");
   }
   if(!type.businessDay&&minutes>Math.min(600,binding.normalDailyMinutes+120))throw new Error("Serviço de fim de semana ultrapassa a jornada regular acrescida de duas horas, observado o teto geral de dez horas (arts. 45 e 47). Confira o enquadramento com a autoridade competente.");
   if(binding.ordinary.some(o=>sobreposicao(o,interval)))throw new Error(`Horário proposto sobrepõe a jornada ordinária de ${employee.matricula}.`);
   if(minutes>420&&row.breakMinutes<60)throw new Error("Serviço superior a sete horas exige intervalo mínimo de uma hora.");
   items.push({recessCallId:recessCall?.id,employeeId:employee.id,date,startTime:row.startTime,endTime:row.endTime,breakMinutes:row.breakMinutes,requestedMinutes:minutes,activity:row.activity,destination:row.destination,estimatedAmount:row.destination==="PECUNIA"?row.estimatedAmount:"0",dayType:type.dayType as Prisma.OvertimeProjectItemCreateManyInput["dayType"],employeeSnapshot:json({registration:employee.matricula,name:employee.usuario.nome,unitId:account.unitId,cargo:employee.cargo?.descricao,funcao:employee.funcaoAtualDescricao,jornada:binding.snapshot})});
  }
  validarLimitesGlobais(items.map(i=>({employeeId:i.employeeId,date:iso(i.date),minutes:i.requestedMinutes,dayType:i.dayType,recessoAutorizado:Boolean(i.recessCallId)})));
  if(previous) {
   await liberarReserva(tx,ctx,previous,"Retificação: liberação da versão anterior",campaign.authorizationDocument);
   for(const a of previous.authorizations)await tx.autorizacaoHoraExtraAdministrativa.update({where:{id:a.id},data:{status:"CANCELADA",canceladaEm:new Date()}});
   await tx.overtimeProjectVersion.update({where:{id:previous.id},data:{status:"SUPERSEDED",isCurrent:false}});
   await event(tx,ctx,previous,"AMEND","SUPERSEDED",input.amendmentReason!,campaign.authorizationDocument,{status:previous.status},{status:"SUPERSEDED"});
  }
  const project=old??await tx.overtimeProject.create({data:{campaignId:campaign.id,orgaoId:campaign.orgaoId,accountId:account.id,requesterUserId:responsible.id,title:input.title}});
  const number=(previous?.version??0)+1;
  const v=await tx.overtimeProjectVersion.create({data:{projectId:project.id,version:number,seiProcess:input.seiProcess,justification:input.justification,activities:input.activities,expectedResults:input.expectedResults,ordinaryImpossibility:input.ordinaryImpossibility,urgencyReason:input.urgencyReason,amendmentReason:input.amendmentReason,contentHash:createHash("sha256").update(JSON.stringify(input)).digest("hex"),rulesSnapshot:json(campaign.rules),contentSnapshot:json({...input,responsibleSnapshot:responsible}),items:{create:items}},include:includeVersion});
  await tx.overtimeProject.update({where:{id:project.id},data:{currentVersion:number,title:input.title}});
  await event(tx,ctx,v,"CREATE","DRAFT",input.amendmentReason||(ctx.usuarioId===responsible.id?"Projeto apresentado pelo titular":"Projeto preparado administrativamente para a chefia responsável"),campaign.authorizationDocument,null,{version:number,hash:v.contentHash,itemCount:items.length});
  return v;
 },{maxWait:10000,timeout:60000});
}

async function jornadaDia(tx:Tx,employeeId:string,date:Date,dayType:string) {
 const bindings=await tx.jornadaServidor.findMany({where:{servidorId:employeeId,ativo:true,status:"ATIVO",dataInicio:{lte:date},OR:[{dataFim:null},{dataFim:{gte:date}}]},include:{jornada:{include:{dias:{include:{faixas:true}}}},escala:{include:{dias:true}}},orderBy:{dataInicio:"desc"}});
 if(!bindings.length)return null;
 const binding=bindings[0]; const previsao=resolverPrevisaoJornadaDia({jornada:binding.jornada,escala:binding.escala,dataReferencia:date,dataAncoragemJornada:binding.dataInicio});
 const business=["DIA_UTIL","PONTO_FACULTATIVO"].includes(dayType);
 const ordinary=business?previsao.faixas.filter(f=>f.tipo==="TRABALHO").map(f=>intervaloCivil(iso(date),f.horaInicio,f.horaFim)):[];
 if(business&&!ordinary.length&&previsao.janela)ordinary.push(intervaloCivil(iso(date),previsao.janela.inicio,previsao.janela.fim));
 if(business&&!ordinary.length)throw new Error("Jornada sem janela ou faixas: regularize o cadastro antes de apurar.");
 return {special:binding.jornada.tipo==="ESPECIAL",normalDailyMinutes:binding.jornada.cargaDiariaMinutos,ordinary,dailyMinutes:business?previsao.cargaPrevistaMinutos:0,snapshot:{bindingId:binding.id,jornadaId:binding.jornadaId,name:binding.jornada.nome,version:binding.jornada.versao,previsao}};
}

async function reservasProjeto(tx:Tx,v:Version) {
 const ids=[...new Set([...(v.reservationOperationId?[v.reservationOperationId]:[]),...v.fundings.map(f=>f.operationId)])];
 const operations=await tx.overtimeBudgetOperation.findMany({where:{id:{in:ids}},include:{movements:true,consumptions:{include:{movements:true}}}});
 return operations.map(o=>({id:o.id,remaining:[...o.movements,...o.consumptions.flatMap(c=>c.movements)].reduce((n,m)=>n.plus(m.reservedDelta),new Prisma.Decimal(0))}));
}
async function restanteReserva(tx:Tx,v:Version) {
 return (await reservasProjeto(tx,v)).reduce((n,r)=>n.plus(r.remaining),new Prisma.Decimal(0));
}
async function movimento(tx:Tx,ctx:ContextoCampanha,v:Version,type:"RESERVE"|"RELEASE"|"EXECUTE",amount:Prisma.Decimal,reason:string,document:string,idempotencyKey?:string) {
 if(amount.lte(0))return null;
 const budgetCtx=type==="RESERVE"?ctx:{...ctx,permissoes:[...ctx.permissoes,"horas-extras:responder-orcamento:seccional"]};
 const base={orgaoId:v.project.orgaoId,campaignId:v.project.campaignId,sourceAccountId:v.project.accountId,type,reason,seiDocument:document,originReference:`projeto:${v.projectId}:v${v.version}`};
 if(type==="RESERVE") {
  const op=await executarOperacaoOrcamentoCampanhaEmTransacao(tx,budgetCtx,{...base,amount:amount.toFixed(2),idempotencyKey:idempotencyKey??randomUUID(),correlationId:idempotencyKey??randomUUID()});
  if(!op.replayed)await tx.overtimeProjectFunding.create({data:{versionId:v.id,operationId:op.operation.id}});return op;
 }
 const roots=await reservasProjeto(tx,v);if(roots.reduce((n,r)=>n.plus(r.remaining),new Prisma.Decimal(0)).lt(amount))throw new Error("Saldo remanescente insuficiente nas reservas do projeto.");
 let remaining=amount;let last=null;
 for(const root of roots) {
  const consume=Prisma.Decimal.min(remaining,root.remaining);if(consume.lte(0))continue;
  last=await executarOperacaoOrcamentoCampanhaEmTransacao(tx,budgetCtx,{...base,amount:consume.toFixed(2),reservationOperationId:root.id,idempotencyKey:randomUUID(),correlationId:randomUUID()});remaining=remaining.minus(consume);
 }
 return last;
}
async function liberarReserva(tx:Tx,ctx:ContextoCampanha,v:Version,reason:string,document:string) {await movimento(tx,ctx,v,"RELEASE",await restanteReserva(tx,v),reason,document);}

export async function complementarReservaProjeto(db:PrismaClient,ctx:ContextoCampanha,versionId:string,amount:string,reason:string,document:string,idempotencyKey?:string) {
 if(reason.trim().length<10||!document.trim()||!/^\d+(\.\d{1,2})?$/.test(amount))throw new Error("Informe valor, justificativa e documento válidos.");
 return db.$transaction(async tx=>{
  const probe=await tx.overtimeProjectVersion.findUniqueOrThrow({where:{id:versionId},include:{project:true}});await lockCampaign(tx,probe.project.campaignId);
  const v=await tx.overtimeProjectVersion.findUniqueOrThrow({where:{id:versionId},include:includeVersion});exigirAcaoCampanha(ctx,v.project.orgaoId,"responder-orcamento");
  if(!["AUTHORITY_REVIEW","AUTHORIZED","EXECUTING","AWAITING_PROOF","PROVEN","HOMOLOGATED","FINANCIAL_REVIEW"].includes(v.status))throw new Error("Etapa não admite complementação de reserva.");
  const before=await restanteReserva(tx,v);
  const op=await movimento(tx,ctx,v,"RESERVE",new Prisma.Decimal(amount),reason,document,idempotencyKey);
  if(!op)throw new Error("Valor deve ser positivo.");
  if(op.replayed)return op;
  if(!v.reservationOperationId)await tx.overtimeProjectVersion.update({where:{id:v.id},data:{reservationOperationId:op.operation.id}});
  await event(tx,ctx,v,"INCREASE_RESERVATION",v.status,reason,document,{reserved:before.toFixed(2)},{operationId:op.operation.id,amount});return op;
 },{timeout:30000});
}

async function evidenciarBancoHistorico(tx:Tx,employeeId:string,date:Date) {
 const month=new Date(date);month.setUTCDate(1);
 const movements=await tx.movimentoBancoHoras.findMany({where:{servidorId:employeeId,status:"VALIDADO",dataReferencia:{lt:date}},orderBy:[{dataReferencia:"asc"},{criadoEm:"asc"},{id:"asc"}]});
 const baseline=movements.filter(m=>m.dataReferencia<month&&m.saldoAposMovimento!==null).at(-1);
 if(!baseline)return {eligible:false,reason:"Histórico sem saldo de abertura comprovado do mês; análise documental necessária.",movementIds:movements.map(m=>m.id)};
 let balance=baseline.saldoAposMovimento!;
 for(const m of movements.filter(m=>m.dataReferencia>=month)) {
  if(m.saldoAposMovimento===null)return {eligible:false,reason:"Histórico possui movimento sem saldo verificável.",movementIds:movements.map(m=>m.id)};
  balance=m.saldoAposMovimento;
 }
 return {eligible:balance>=0,balanceBefore:balance,reason:balance>=0?"Saldo anterior não negativo comprovado no histórico.":"Compensação anterior à prestação não comprovada.",movementIds:movements.map(m=>m.id),baselineId:baseline.id};
}

export async function decidirProjetoCampanha(db:PrismaClient,ctx:ContextoCampanha,data:unknown,calendar:CalendarioCampanha) {
 const input=decisaoProjetoSchema.parse(data);
 return db.$transaction(async tx=>{
  const probe=await tx.overtimeProjectVersion.findUniqueOrThrow({where:{id:input.versionId},include:{project:true}});
  await lockCampaign(tx,probe.project.campaignId);
  const v=await tx.overtimeProjectVersion.findUniqueOrThrow({where:{id:input.versionId},include:includeVersion});
  const transitionPermission=({SUBMIT:"solicitar",ADMIN_APPROVE:"analisar",BUDGET_APPROVE:"responder-orcamento",AUTHORIZE:"deliberar",START:"solicitar",PROCESS:"reprocessar",DOCUMENT_EXECUTION:"deliberar",DOCUMENT_BANK:"deliberar",RECALCULATE:"gerar-lote",PROVE:"solicitar",HOMOLOGATE:"deliberar",FINANCIAL:"gerar-lote",RELEASE_PAYMENT:"gerar-lote",CONVERT:"deliberar",COMPLETE_BANK:"deliberar",COMPLETE_NO_CREDIT:"deliberar",CONFIRM_PAYROLL:"gerar-lote",RETURN:"analisar",REJECT:"deliberar",CANCEL:"deliberar"} as const)[input.action];
  exigirAcaoCampanha(ctx,v.project.orgaoId,input.action==="RETURN"?(v.status==="BUDGET_REVIEW"?"responder-orcamento":v.status==="AUTHORITY_REVIEW"?"deliberar":"analisar"):transitionPermission); await exigirUnidadeAtiva(tx,v.project.account.unitId,v.project.orgaoId);
  if(["SUBMIT","START","PROVE"].includes(input.action)) {await exigirTitular(tx,ctx,v.project.account.unitId);if(v.project.requesterUserId!==ctx.usuarioId&&!temAcaoCampanha(ctx,"configurar-politica"))throw new Error("Projeto pertence a outro titular.");}
  if(input.action==="ADMIN_APPROVE"&&!possuiAlgumaPermissaoNaLista(ctx.permissoes,["horas-extras:analisar:global","horas-extras:analisar:seccional"]))await exigirTitular(tx,ctx,v.project.account.unitId);
  let next:string=proximoEstadoProjeto(v.status,input.action);
  if(v.project.campaign.status!=="ACTIVE")throw new Error("Campanha não está ativa.");
  await lockEmployees(tx,v.items.map(i=>i.employeeId));
  const today=hojeCampanha(); const before={status:v.status,items:v.items.map(i=>({id:i.id,approved:i.approvedMinutes,performed:i.performedMinutes,proven:i.provenMinutes,homologated:i.homologatedMinutes,financialStatus:i.financialStatus}))};
  const choices=new Map(input.items?.map(i=>[i.id,i])??[]);
  if(choices.size!==(input.items?.length??0)||[...choices.keys()].some(id=>!v.items.some(i=>i.id===id)))throw new Error("Itens duplicados ou de outro projeto.");
  const workflow=(v.rulesSnapshot as {workflow?:string[]}).workflow??["ADMIN_REVIEW","BUDGET_REVIEW","AUTHORITY_REVIEW"];
  if(input.action==="SUBMIT"||input.action==="AUTHORIZE") {
   for(const i of v.items) {
    const employee=await tx.servidor.findFirst({where:{id:i.employeeId,orgaoId:v.project.orgaoId,ativo:true,lotacoes:{some:{unidadeId:v.project.account.unitId,status:"ATIVO",dataInicio:{lte:i.date},OR:[{dataFim:null},{dataFim:{gte:i.date}}]}}}});
    if(!employee)throw new Error("Servidor inativo ou lotação alterada. Crie uma nova versão do projeto.");
    const away=await tx.afastamentoSarh.findMany({where:{servidorId:i.employeeId,ativo:true,dataInicio:{lte:i.date},OR:[{dataFim:null},{dataFim:{gte:i.date}}]}});
    if(away.some(afastamentoSarhDeveImpactarApuracao))throw new Error("Há afastamento aplicável à data proposta. Regularize o projeto antes de prosseguir.");
    if((await calendar(iso(i.date),i.employeeId)).dayType!==i.dayType)throw new Error("Calendário alterado após a proposta. Crie nova versão para análise do enquadramento.");
    if(i.recessCallId){const call=await tx.convocadoRecesso.findUniqueOrThrow({where:{id:i.recessCallId}});if(call.escolha!=="PENDENTE"||call.status!=="CONVOCADO")throw new Error("Convocação já possui decisão no módulo de recesso. Concilie o vínculo antes de prosseguir.");}
    const binding=await jornadaDia(tx,i.employeeId,i.date,i.dayType);const saved=i.employeeSnapshot as {jornada?:{bindingId?:string;version?:number}};
    if(!binding||binding.snapshot.bindingId!==saved.jornada?.bindingId||binding.snapshot.version!==saved.jornada?.version)throw new Error("Jornada alterada após a proposta. Registre nova versão para análise.");
   }
  }
  if(input.action==="SUBMIT") {
   const first=iso(v.items.map(i=>i.date).sort((a,b)=>+a-+b)[0]);
   const holidays=new Set<string>();
   for(const employeeId of new Set(v.items.map(i=>i.employeeId)))for(let d=parseIsoDateOnly(today);iso(d)<first;d.setUTCDate(d.getUTCDate()+1))if(!(await calendar(iso(d),employeeId)).businessDay)holidays.add(iso(d));
   validarAntecedencia(today,first,holidays,v.urgencyReason);
   if(today>iso(v.project.campaign.projectDeadline)&&!v.urgencyReason)throw new Error("Prazo de apresentação encerrado; registre a justificativa de urgência para análise.");
   await validarHistorico(tx,v.items,v.id); next=workflow[0];
   await tx.overtimeProjectVersion.update({where:{id:v.id},data:{submittedAt:new Date()}});
  }
  if(input.action==="ADMIN_APPROVE"||input.action==="BUDGET_APPROVE")next=workflow[workflow.indexOf(v.status)+1];
  if(input.action==="BUDGET_APPROVE") {
   const total=v.items.reduce((n,i)=>n.plus(i.destination==="PECUNIA"?i.estimatedAmount:0),new Prisma.Decimal(0));
   if(v.items.some(i=>i.destination==="PECUNIA"&&i.estimatedAmount.lte(0)))throw new Error("Informe o custo estimado de todos os itens em pecúnia.");
   const op=await movimento(tx,ctx,v,"RESERVE",total,input.reason,input.seiDocument);
   if(op)await tx.overtimeProjectVersion.update({where:{id:v.id},data:{reservationOperationId:op.operation.id}});
  }
  if(input.action==="AUTHORIZE") {
   if(v.items.some(i=>iso(i.date)<=today))throw new Error("A autorização deve ser anterior à execução.");
   if(choices.size!==v.items.length)throw new Error("Decida explicitamente todos os itens, inclusive os indeferidos com zero minutos.");
   const rows=v.items.map(i=>({...i,approvedMinutes:choices.get(i.id)!.minutes}));
   if(rows.some(i=>i.approvedMinutes>i.requestedMinutes))throw new Error("Autorizado superior ao solicitado.");
   if(!rows.some(i=>i.approvedMinutes>0))throw new Error("Use indeferimento quando nenhum item for autorizado.");
   await validarHistorico(tx,rows,v.id);
   const required=rows.reduce((n,i)=>n.plus(i.destination==="PECUNIA"?i.estimatedAmount.mul(i.approvedMinutes).div(i.requestedMinutes).toDecimalPlaces(2):0),new Prisma.Decimal(0));
   const reserved=await restanteReserva(tx,v); if(required.gt(reserved))throw new Error("Reserva insuficiente para os itens deferidos.");
   await movimento(tx,ctx,v,"RELEASE",reserved.minus(required),"Decisão parcial: liberação do valor não autorizado",input.seiDocument);
   for(const row of rows)await tx.overtimeProjectItem.update({where:{id:row.id},data:{approvedMinutes:row.approvedMinutes,decisionReason:choices.get(row.id)!.reason,financialStatus:row.approvedMinutes?"PENDING":"REJECTED"}});
   for(const competence of new Set(rows.filter(i=>i.approvedMinutes>0).map(i=>iso(i.date).slice(0,7)))) {
    const monthly=rows.filter(i=>i.approvedMinutes>0&&iso(i.date).startsWith(competence));
    await tx.autorizacaoHoraExtraAdministrativa.create({data:{campaignVersionId:v.id,orgaoId:v.project.orgaoId,unidadeId:v.project.account.unitId,processoSei:v.seiProcess,documentoAutorizacao:`${input.seiDocument} / ${v.projectId.slice(0,8)} / ${competence}`,mesReferencia:competence,dataAutorizacao:parseIsoDateOnly(today),autoridadeAutorizadora:ctx.perfilAtivoCodigo,modalidade:"DATAS_ESPECIFICAS",status:"VIGENTE",versao:v.version,registradaPorUsuarioId:ctx.usuarioId,registradaEm:new Date(),origemDocumento:"CAMPANHA_SECP",conteudoOriginalAutorizado:json({projectId:v.projectId,version:v.version,contentHash:v.contentHash,items:monthly}),servidores:{create:[...new Set(monthly.map(i=>i.employeeId))].map(employeeId=>{
     const employeeItems=monthly.filter(i=>i.employeeId===employeeId); const e=employeeItems[0].employee;
     return {servidorId:employeeId,unidadeId:v.project.account.unitId,matriculaSnapshot:e.matricula,nomeSnapshot:e.usuario.nome,unidadeSnapshot:v.project.account.unit.nome,periodoInicio:employeeItems[0].date,periodoFim:employeeItems.at(-1)!.date,quantidadeMaximaMinutos:employeeItems.reduce((n,i)=>n+i.approvedMinutes,0),regras:{create:employeeItems.map(i=>({data:i.date,tipoDia:i.dayType,limiteMinutos:i.approvedMinutes,faixaInicio:i.startTime,faixaFim:i.endTime,metadados:{campaignItemId:i.id}}))}};
    })}}});
   }
   await tx.overtimeProjectVersion.update({where:{id:v.id},data:{authorizedAt:new Date()}});
  }
  if(input.action==="PROCESS") {
   for(const item of v.items.filter(i=>i.approvedMinutes>0)) {
    const actualType=await calendar(iso(item.date),item.employeeId);
    const jornada=await jornadaDia(tx,item.employeeId,item.date,actualType.dayType); if(!jornada)throw new Error("Jornada histórica ausente.");
    const nextDay=new Date(item.date);nextDay.setUTCDate(nextDay.getUTCDate()+1);const prior=new Date(item.date);prior.setUTCDate(prior.getUTCDate()-1);
    const marks=await tx.marcacao.findMany({where:{servidorId:item.employeeId,status:"VALIDA",dataReferencia:{gte:prior,lte:nextDay}},orderBy:{dataHora:"asc"}});
    const relevant=marks;
    const result=apurarTrechosReais(relevant,intervaloCivil(iso(item.date),item.startTime,item.endTime),jornada.ordinary,jornada.dailyMinutes);
    if(actualType.dayType!==item.dayType){result.issues.push("Calendário alterado após a autorização: exige reconhecimento documental do enquadramento pela autoridade.");result.minutes=0;}
    const historicalBank=await evidenciarBancoHistorico(tx,item.employeeId,item.date);
    await tx.overtimeProjectItem.update({where:{id:item.id},data:{performedMinutes:Math.min(item.approvedMinutes,result.minutes),executionSnapshot:json({...result,actualDayType:actualType.dayType,jornada:jornada.snapshot,historicalBank,processedAt:new Date()})}});
   }
  }
  if(input.action==="DOCUMENT_BANK") {
   if(!input.bankRegularizedOn||!input.documents||(input.results?.length??0)<30)throw new Error("Informe a data da compensação prévia, demonstrativo documental e decisão da autoridade.");
   for(const item of v.items.filter(i=>i.homologatedMinutes>0)) {
    if(input.bankRegularizedOn>=iso(item.date))throw new Error("A compensação deve preceder o serviço extraordinário.");
    const original=(item.executionSnapshot??{}) as Record<string,Prisma.JsonValue>;
    await tx.overtimeProjectItem.update({where:{id:item.id},data:{executionSnapshot:json({...original,documentaryBankProof:{eligible:true,reason:input.results,regularizedOn:input.bankRegularizedOn,documents:input.documents,authority:ctx.usuarioId,seiDocument:input.seiDocument}})}});
   }
  }
  if(input.action==="PROVE") {
   if((input.results?.length??0)<30||!input.documents?.trim())throw new Error("Descreva os resultados e informe os documentos comprobatórios.");
   if(v.items.some(i=>iso(i.date)>=today))throw new Error("Aguarde a conclusão dos dias autorizados antes de comprovar.");
   for(const item of v.items.filter(i=>i.approvedMinutes>0)) {
    const cursor=new Date(Date.UTC(item.date.getUTCFullYear(),item.date.getUTCMonth()+1,1));let business=0;
    while(business<2){if((await calendar(iso(cursor),item.employeeId)).businessDay)business++;if(business<2)cursor.setUTCDate(cursor.getUTCDate()+1);}
    if(today>iso(cursor)&&!input.deadlineDecision)throw new Error("Prazo do segundo dia útil do mês seguinte ultrapassado; registre a decisão administrativa sobre a pendência, sem presumir dispensa normativa.");
   }
   if(today>iso(v.project.campaign.proofDeadline)&&!input.deadlineDecision)throw new Error("Comprovação fora do prazo da campanha exige decisão documental.");
   for(const item of v.items.filter(i=>i.approvedMinutes>0)) {
    if(!item.executionSnapshot)throw new Error("Processe a frequência antes de comprovar.");
    const minutes=choices.get(item.id)?.minutes??item.performedMinutes;
    if(minutes>item.performedMinutes)throw new Error("Comprovação superior à frequência apurada.");
    await tx.overtimeProjectItem.update({where:{id:item.id},data:{provenMinutes:minutes,proofSnapshot:json({results:input.results,documents:input.documents,deadlineDecision:input.deadlineDecision,at:new Date(),actor:ctx.usuarioId})}});
   }
  }
  if(input.action==="DOCUMENT_EXECUTION") {
   if(!input.documents||(input.results?.length??0)<30||!choices.size)throw new Error("Tratamento excepcional exige decisão, documentos, descrição da evidência e itens individualizados.");
   for(const item of v.items.filter(i=>choices.has(i.id))) {
    const choice=choices.get(item.id)!;
    if(choice.minutes>item.approvedMinutes||iso(item.date)>=today)throw new Error("Reconhecimento documental deve se limitar ao serviço autorizado e já prestado.");
    const original=(item.executionSnapshot??{}) as Record<string,Prisma.JsonValue>;
    if(input.bankRegularizedOn&&input.bankRegularizedOn>=iso(item.date))throw new Error("Compensação documental deve ser anterior à prestação extraordinária.");
    await tx.overtimeProjectItem.update({where:{id:item.id},data:{performedMinutes:choice.minutes,executionSnapshot:json({...original,documentaryExecution:{documents:input.documents,results:input.results,minutes:choice.minutes,reason:choice.reason,decisionDocument:input.seiDocument,authority:ctx.usuarioId},...(input.bankRegularizedOn?{historicalBank:{eligible:true,reason:`Compensação prévia comprovada por decisão ${input.seiDocument}`,regularizedOn:input.bankRegularizedOn,documents:input.documents,authority:ctx.usuarioId}}:{})})}});
   }
  }
  if(input.action==="HOMOLOGATE") {
   if(choices.size!==v.items.length)throw new Error("Informe os minutos homologados e o motivo de cada item.");
   for(const item of v.items) {
    const choice=choices.get(item.id)!;
    if(choice.minutes>item.provenMinutes)throw new Error("Homologação superior à comprovação.");
    if(choice.minutes>0)await exigirNaoDuplicidadeOrdinaria(tx,item,v.items.filter(r=>r.employeeId===item.employeeId&&+r.date===+item.date).reduce((n,r)=>n+(choices.get(r.id)?.minutes??0),0),v.id);
    await tx.overtimeProjectItem.update({where:{id:item.id},data:{homologatedMinutes:choice.minutes,decisionReason:choice.reason}});
    if(choice.minutes<=0||item.destination!=="PECUNIA")continue;
    const auth=v.authorizations.find(a=>a.mesReferencia===iso(item.date).slice(0,7))!; const employee=auth.servidores.find(s=>s.servidorId===item.employeeId)!;
    const classification=await tx.horaExtraClassificacaoIntervalo.create({data:{servidorAutorizadoId:employee.id,data:item.date,inicio:item.startTime,fim:item.endTime,minutos:choice.minutes,categoria:"HORA_EXTRA_RECONHECIDA",motivo:choice.reason,decisaoGestorUsuarioId:ctx.usuarioId,decididaEm:new Date(),metadados:{tipoDia:tipoDiaEfetivo(item),campaignItemId:item.id,projectVersionId:v.id,evidence:item.executionSnapshot}}});
    await tx.overtimeProjectItem.update({where:{id:item.id},data:{classificationId:classification.id}});
   }
   for(const auth of v.authorizations) {
    await tx.horaExtraAtesto.create({data:{autorizacaoId:auth.id,gestorUsuarioId:ctx.usuarioId,texto:input.reason,snapshot:json({versionId:v.id,choices:input.items,seiDocument:input.seiDocument})}});
    await tx.autorizacaoHoraExtraAdministrativa.update({where:{id:auth.id},data:{status:"ATESTADA"}});
   }
  }
  if(input.action==="FINANCIAL"||input.action==="RECALCULATE")await calcularProjeto(tx,ctx,v,input.seiDocument,input.action==="RECALCULATE");
  if(input.action==="RELEASE_PAYMENT") {
   if(v.items.some(i=>i.homologatedMinutes>0&&i.destination==="BANCO_DE_HORAS"&&i.financialStatus!=="BANK"))throw new Error("Converta os itens destinados ao banco antes de liberar os demais.");
   const payable=v.items.filter(i=>i.homologatedMinutes>0&&i.destination==="PECUNIA");
   if(!payable.length)throw new Error("Não há itens remuneráveis; use conversão em banco.");
   if(payable.some(i=>i.financialStatus!=="CALCULATED"))throw new Error("Há itens sem cálculo financeiro validado.");
   for(const i of payable)await exigirNaoDuplicidadeOrdinaria(tx,i);
   const total=payable.reduce((n,i)=>n.plus((i.calculationSnapshot as {amount:string}).amount),new Prisma.Decimal(0));
   const rest=await restanteReserva(tx,v);if(total.gt(rest))throw new Error("Cálculo excede a reserva. Regularize a cobertura orçamentária antes de liberar.");
   await movimento(tx,ctx,v,"EXECUTE",total,input.reason,input.seiDocument);
   await liberarReserva(tx,ctx,v,"Liberação do saldo não utilizado após homologação",input.seiDocument);
   await tx.overtimeProjectItem.updateMany({where:{id:{in:payable.map(i=>i.id)}},data:{financialStatus:"ELIGIBLE"}});
   for(const a of v.authorizations)await tx.autorizacaoHoraExtraAdministrativa.update({where:{id:a.id},data:{status:"CALCULADA"}});
  }
  if(input.action==="CONVERT") {
   if(!input.expiresOn)throw new Error("Informe a validade fundamentada na decisão de conversão.");
   if(choices.size!==v.items.length)throw new Error("Selecione explicitamente os itens a converter; use zero para manter o destino de pagamento.");
   const eligible=v.items.filter(i=>i.homologatedMinutes>0&&i.financialStatus!=="BANK"&&(choices.get(i.id)?.minutes??0)>0);
   if(!eligible.length)throw new Error("Não há horas homologadas para converter.");
   if(eligible.some(i=>i.financialStatus==="ELIGIBLE"))throw new Error("Item já liberado para pagamento não pode ser convertido.");
   for(const i of eligible) {
    if(choices.get(i.id)!.minutes!==i.homologatedMinutes)throw new Error("A conversão deve abranger todo o item homologado; retifique a homologação documental para separar as parcelas.");
    const expiry=parseIsoDateOnly(input.expiresOn);if(expiry<=i.date||input.expiresOn>validadeMaximaCredito(iso(i.date)))throw new Error("Validade fora do prazo do art. 50-A aplicável à data da prestação.");
    const outstanding=await tx.overtimeExtraordinaryCredit.findMany({where:{employeeId:i.employeeId,expiresOn:{gte:parseIsoDateOnly(today)}}});
    const binding=await jornadaDia(tx,i.employeeId,i.date,i.dayType);const daily=(binding?.snapshot.previsao.cargaPrevistaMinutos||480);
    if(outstanding.reduce((n,c)=>n+c.creditedMinutes-c.usedMinutes,0)+Math.floor(i.homologatedMinutes*fatorBanco(tipoDiaEfetivo(i)))>30*daily)throw new Error("Crédito extraordinário ultrapassa o limite de trinta dias de jornada.");
    await tx.overtimeExtraordinaryCredit.create({data:{itemId:i.id,employeeId:i.employeeId,originalMinutes:i.homologatedMinutes,creditedMinutes:Math.floor(i.homologatedMinutes*fatorBanco(tipoDiaEfetivo(i))),factor:fatorBanco(tipoDiaEfetivo(i)),expiresOn:expiry,seiDocument:input.seiDocument}});
    await tx.overtimeProjectItem.update({where:{id:i.id},data:{financialStatus:"BANK",destination:"BANCO_DE_HORAS"}});
    if(i.classificationId)await tx.horaExtraClassificacaoIntervalo.update({where:{id:i.classificationId},data:{categoria:"NAO_AUTORIZADA",justificativa:`Convertida em crédito extraordinário por ${input.seiDocument}; excluída do pagamento.`}});
   }
   const remainingPayable=v.items.filter(i=>i.homologatedMinutes>0&&i.destination==="PECUNIA"&&!eligible.some(c=>c.id===i.id));
   if(remainingPayable.length) {
    next="HOMOLOGATED";
    const need=remainingPayable.reduce((n,i)=>n.plus(i.estimatedAmount.mul(i.homologatedMinutes).div(i.requestedMinutes).toDecimalPlaces(2)),new Prisma.Decimal(0));
    const free=(await restanteReserva(tx,v)).minus(need);if(free.gt(0))await movimento(tx,ctx,v,"RELEASE",free,input.reason,input.seiDocument);
   } else await liberarReserva(tx,ctx,v,input.reason,input.seiDocument);
  }
  if(input.action==="COMPLETE_NO_CREDIT") {
   if(v.items.some(i=>i.homologatedMinutes>0))throw new Error("Há horas homologadas que exigem definição financeira ou conversão.");
   await liberarReserva(tx,ctx,v,input.reason,input.seiDocument);
   await tx.overtimeProjectItem.updateMany({where:{versionId:v.id},data:{financialStatus:"REJECTED"}});
  }
  if(input.action==="CONFIRM_PAYROLL") {
   for(const item of v.items.filter(i=>i.financialStatus==="ELIGIBLE")) {
    const line=await tx.overtimePayrollBatchLine.findFirst({where:{authorizationDayId:item.classificationId!,batch:{status:"CLOSED"}}});
    if(!line)throw new Error("Inclua todos os itens em lote conferido e fechado antes de registrar o encaminhamento.");
    await tx.overtimeProjectItem.update({where:{id:item.id},data:{financialStatus:"SENT_TO_PAYROLL"}});
   }
   for(const a of v.authorizations)await tx.autorizacaoHoraExtraAdministrativa.update({where:{id:a.id},data:{status:"ENVIADA_PARA_FOLHA"}});
  }
  if(["RETURN","REJECT","CANCEL"].includes(input.action)) {
   if(input.action==="CANCEL"&&v.items.some(i=>iso(i.date)<=today&&i.approvedMinutes>0))throw new Error("Serviço já iniciado exige decisão própria de apuração, sem cancelamento retroativo.");
   await liberarReserva(tx,ctx,v,input.reason,input.seiDocument);
   for(const a of v.authorizations)await tx.autorizacaoHoraExtraAdministrativa.update({where:{id:a.id},data:{status:"CANCELADA",canceladaEm:new Date()}});
  }
  const updated=await tx.overtimeProjectVersion.update({where:{id:v.id},data:{status:next},include:includeVersion});
  await tx.overtimeProject.update({where:{id:v.projectId},data:{updatedAt:new Date()}});
  await event(tx,ctx,v,input.action,next,input.reason,input.seiDocument,before,{status:next,items:updated.items.map(i=>({id:i.id,approved:i.approvedMinutes,performed:i.performedMinutes,proven:i.provenMinutes,homologated:i.homologatedMinutes,financialStatus:i.financialStatus}))});
  return updated;
 },{maxWait:15000,timeout:120000});
}

function tipoDiaEfetivo(item:{dayType:Prisma.OvertimeProjectItemCreateManyInput["dayType"];executionSnapshot:Prisma.JsonValue}) {
 return (item.executionSnapshot as {actualDayType?:Prisma.OvertimeProjectItemCreateManyInput["dayType"]}|null)?.actualDayType??item.dayType;
}

export async function exigirNaoDuplicidadeOrdinaria(tx:Tx,item:{employeeId:string;date:Date;executionSnapshot:Prisma.JsonValue},newVersionTotal?:number,versionId?:string) {
 const ordinary=await tx.movimentoBancoHoras.findMany({where:{servidorId:item.employeeId,dataReferencia:item.date,tipo:{in:["CREDITO","COMPENSACAO_DEBITO"]},status:"VALIDADO"}});
 const credited=ordinary.reduce((n,m)=>n+m.minutos,0);if(!credited)return;
 const others=await tx.overtimeProjectItem.findMany({where:{employeeId:item.employeeId,date:item.date,...(versionId?{versionId:{not:versionId}}:{}),version:{status:{notIn:["CANCELLED","REJECTED","SUPERSEDED"]}}}});
 const extra=others.reduce((n,i)=>n+i.homologatedMinutes,0)+(newVersionTotal??0);
 const evidence=item.executionSnapshot as {worked?:number;jornada?:{previsao?:{cargaPrevistaMinutos?:number}}}|null;
 const load=evidence?.jornada?.previsao?.cargaPrevistaMinutos;
 if(evidence?.worked===undefined||load===undefined||credited>Math.max(0,evidence.worked-load-extra))throw new Error("Crédito ordinário validado consome minutos necessários ao serviço extraordinário. Concilie os destinos documentados para impedir dupla contagem.");
}

async function calcularProjeto(tx:Tx,ctx:ContextoCampanha,v:Version,document:string,recalculate=false) {
 const payable=v.items.filter(i=>i.homologatedMinutes>0&&i.destination==="PECUNIA");
 for(const a of v.authorizations) {
  const current=payable.filter(i=>iso(i.date).startsWith(a.mesReferencia));if(!current.length)continue;
  const previous=await tx.horaExtraCalculo.findMany({where:{autorizacaoId:a.id},orderBy:{versao:"desc"}});
  if(previous.some(c=>c.status==="CALCULADO")&&!recalculate)throw new Error("Cálculo existente: use procedimento formal de retificação financeira.");
  if(recalculate) {
   if(await tx.overtimePayrollBatchLine.count({where:{authorizationId:a.id,batch:{status:{not:"CANCELLED"}}}}))throw new Error("Cálculo já incluído em lote: procedimento financeiro de retificação deve preservar o encaminhamento anterior.");
   await tx.horaExtraCalculo.updateMany({where:{autorizacaoId:a.id,status:"CALCULADO"},data:{status:"CANCELADO"}});
  }
  const salarySnapshots=[]; const calculated=[];
  for(const i of current) {
   const evidence=i.executionSnapshot as {historicalBank?:{eligible:boolean;reason:string};documentaryBankProof?:{eligible:boolean;reason:string}};
   const bank=evidence?.documentaryBankProof??evidence?.historicalBank;
   if(!bank?.eligible)throw new Error(`Banco histórico de ${i.employee.matricula}: ${bank?.reason??"evidência ausente"}`);
   const salaries=await tx.overtimeSalaryHistory.findMany({where:{employeeId:i.employeeId,validFrom:{lte:i.date},validUntil:{gte:i.date},replacement:null}});
   if(salaries.length!==1)throw new Error(`Remuneração histórica ausente ou ambígua para ${i.employee.matricula} em ${iso(i.date)}.`);
   await exigirNaoDuplicidadeOrdinaria(tx,i);
   const s=salaries[0]; const effectiveType=tipoDiaEfetivo(i);const percent=percentualDia(effectiveType);
   const r=calcularValorHorasExtras({horasReconhecidas:[{data:iso(i.date),minutos:i.homologatedMinutes,tipoDia:effectiveType}],vigenciasRemuneratorias:[{id:s.id,inicio:iso(s.validFrom),fim:iso(s.validUntil),remuneracaoBaseCentavos:s.baseCentavos,origem:"MANUAL"}],regrasFinanceiras:[{tipoDia:effectiveType,percentual:percent,rubrica:percent===100?"HE_100":"HE_50"}],divisorMinutos:12000});
   calculated.push({item:i,salary:s,result:r.itens[0]});salarySnapshots.push(s);
  }
  const total=calculated.reduce((n,c)=>n+c.result.valorCentavos,0);
  const calc=await tx.horaExtraCalculo.create({data:{autorizacaoId:a.id,calculadoPorUsuarioId:ctx.usuarioId,competencia:a.mesReferencia,versao:(previous[0]?.versao??0)+1,totalServidores:new Set(current.map(i=>i.employeeId)).size,totalMinutos:current.reduce((n,i)=>n+i.homologatedMinutes,0),totalValorCentavos:total,divisorMinutos:12000,memoriaCalculo:json({campaignVersionId:v.id,document,salaryHistoryIds:salarySnapshots.map(s=>s.id),source:"HISTORICO_VALIDADO_RH"})}});
  for(const c of calculated) {
   const authorizedEmployee=a.servidores.find(s=>s.servidorId===c.item.employeeId)!;
   await tx.horaExtraCalculoItem.create({data:{calculoId:calc.id,servidorAutorizadoId:authorizedEmployee.id,classificacaoIntervaloId:c.item.classificationId!,data:c.item.date,inicio:c.item.startTime,fim:c.item.endTime,minutos:c.item.homologatedMinutes,tipoDia:tipoDiaEfetivo(c.item),vigenciaRemuneratoriaId:c.salary.id,remuneracaoBaseCentavos:c.salary.baseCentavos,divisorMinutos:12000,percentual:c.result.percentual,rubrica:c.result.rubrica,valorCentavos:c.result.valorCentavos,memoriaCalculo:json(c.result)}});
   await tx.horaExtraRemuneracaoSnapshot.upsert({where:{calculoId_servidorAutorizadoId_vigenciaId:{calculoId:calc.id,servidorAutorizadoId:authorizedEmployee.id,vigenciaId:c.salary.id}},create:{calculoId:calc.id,servidorAutorizadoId:authorizedEmployee.id,vigenciaId:c.salary.id,inicio:c.salary.validFrom,fim:c.salary.validUntil,remuneracaoBaseCentavos:c.salary.baseCentavos,origem:c.salary.source,fonteDocumento:c.salary.seiDocument,payload:json(c.salary.components)},update:{}});
   await tx.overtimeProjectItem.update({where:{id:c.item.id},data:{financialStatus:"CALCULATED",calculationSnapshot:json({amount:new Prisma.Decimal(c.result.valorCentavos).div(100).toFixed(2),calculationId:calc.id,salaryId:c.salary.id,salaryFrom:iso(c.salary.validFrom),salaryUntil:iso(c.salary.validUntil),salaryDocument:c.salary.seiDocument,components:c.salary.components,...c.result})}});
  }
 }
}

export async function cadastrarRubricaCampanha(db:PrismaClient,ctx:ContextoCampanha,data:unknown) {
 const input=rubricaCampanhaSchema.parse(data);exigirAcaoCampanha(ctx,input.orgaoId,"validar-rubrica");
 return db.$transaction(async tx=>{
  if(input.validUntil&&input.validUntil<input.validFrom)throw new Error("Vigência invertida.");
  const overlaps=await tx.overtimeSalaryRubric.count({where:{orgaoId:input.orgaoId,code:input.code,validFrom:{lte:parseIsoDateOnly(input.validUntil||"9999-12-31")},OR:[{validUntil:null},{validUntil:{gte:parseIsoDateOnly(input.validFrom)}}]}});
  if(overlaps)throw new Error("Rubrica já possui vigência sobreposta.");
  const row=await tx.overtimeSalaryRubric.create({data:{...input,validFrom:parseIsoDateOnly(input.validFrom),validUntil:input.validUntil?parseIsoDateOnly(input.validUntil):null,validatedByUserId:ctx.usuarioId}});
  await audit(tx,ctx,"OvertimeSalaryRubric",row.id,"HORAS_EXTRAS_RUBRICA_VALIDADA",null,row,input.normativeBasis,input.normativeBasis.slice(0,160));return row;
 });
}
export async function cadastrarRemuneracaoCampanha(db:PrismaClient,ctx:ContextoCampanha,data:unknown) {
 const input=remuneracaoCampanhaSchema.parse(data);
 return db.$transaction(async tx=>{
  const employee=await tx.servidor.findUniqueOrThrow({where:{id:input.employeeId}});exigirAcaoCampanha(ctx,employee.orgaoId,"validar-remuneracao");await lockEmployees(tx,[employee.id]);
  const start=parseIsoDateOnly(input.validFrom),end=parseIsoDateOnly(input.validUntil);
  if(new Set(input.components.map(c=>c.code)).size!==input.components.length)throw new Error("Rubricas repetidas.");
  let base=0;const components:Array<{code:string;amountCentavos:number;includesInBase:boolean;description:string;rubricVersionId:string}>=[];
  for(const c of input.components) {
   const rubrics=await tx.overtimeSalaryRubric.findMany({where:{orgaoId:employee.orgaoId,code:c.code,validFrom:{lte:start},OR:[{validUntil:null},{validUntil:{gte:end}}]}});
   if(rubrics.length!==1)throw new Error(`Rubrica ${c.code} sem validação inequívoca por toda a vigência.`);
   if(rubrics[0].includesInBase)base+=c.amountCentavos;
   components.push({...c,includesInBase:rubrics[0].includesInBase,description:rubrics[0].description,rubricVersionId:rubrics[0].id});
  }
  if(!Number.isSafeInteger(base)||base<=0||base>2147483647)throw new Error("Base remuneratória inválida.");
  const overlap=await tx.overtimeSalaryHistory.findMany({where:{employeeId:employee.id,replacement:null,validFrom:{lte:end},validUntil:{gte:start}}});
  if(overlap.some(s=>s.id!==input.replacesId))throw new Error("Vigência salarial sobreposta: divida o período corretamente.");
  if(input.replacesId&&!overlap.some(s=>s.id===input.replacesId))throw new Error("Remuneração substituída não pertence ao período/servidor.");
  const row=await tx.overtimeSalaryHistory.create({data:{employeeId:employee.id,validFrom:start,validUntil:end,baseCentavos:base,components:json(components),source:"MANUAL",seiDocument:input.seiDocument,validatedByUserId:ctx.usuarioId,replacesId:input.replacesId}});
  await audit(tx,ctx,"OvertimeSalaryHistory",row.id,"HORAS_EXTRAS_REMUNERACAO_VALIDADA",input.replacesId?{replacesId:input.replacesId}:null,{employeeId:row.employeeId,validFrom:input.validFrom,validUntil:input.validUntil,seiDocument:input.seiDocument},"Registro histórico remuneratório documentado",input.seiDocument);return row;
 });
}


export async function cadastrarRestricaoCampanha(db:PrismaClient,ctx:ContextoCampanha,data:unknown) {
 const input=z.object({employeeId:z.uuid(),validFrom:z.string(),validUntil:z.string(),maxDailyMinutes:z.coerce.number().int().min(0).max(600),seiDocument:z.string().trim().min(3).max(160)}).parse(data);
 const start=parseIsoDateOnly(input.validFrom),end=parseIsoDateOnly(input.validUntil);if(start>end)throw new Error("Vigência invertida.");
 return db.$transaction(async tx=>{
  const employee=await tx.servidor.findUniqueOrThrow({where:{id:input.employeeId}});exigirAcaoCampanha(ctx,employee.orgaoId,"configurar-politica");await lockEmployees(tx,[employee.id]);
  const row=await tx.overtimeEmployeeRestriction.create({data:{employeeId:employee.id,validFrom:start,validUntil:end,maxDailyMinutes:input.maxDailyMinutes,seiDocument:input.seiDocument,validatedByUserId:ctx.usuarioId}});
  await audit(tx,ctx,"OvertimeEmployeeRestriction",row.id,"HORAS_EXTRAS_LIMITE_ESPECIAL_VALIDADO",null,{employeeId:employee.id,validFrom:input.validFrom,validUntil:input.validUntil,maxDailyMinutes:input.maxDailyMinutes},"Limite documentado da Junta Oficial em Saúde",input.seiDocument);return row;
 });
}
