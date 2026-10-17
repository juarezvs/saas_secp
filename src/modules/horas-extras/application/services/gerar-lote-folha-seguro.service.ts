import { createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { possuiAlgumaPermissaoNaLista } from "@/modules/auth/application/services/permissao-utils";
import { podeAcessarOrgaoHorasExtras } from "./escopo-horas-extras.service";
import type { ContextoCampanha } from "./campanha-operacional.service";
import { exigirNaoDuplicidadeOrdinaria } from "./campanha-operacional.service";

export async function gerarLoteFolhaSeguro(db:PrismaClient,ctx:ContextoCampanha,orgaoId:string,competence:string) {
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(competence)||!podeAcessarOrgaoHorasExtras(ctx.escopo,orgaoId)||!possuiAlgumaPermissaoNaLista(ctx.permissoes,["horas-extras:gerar-lote:global","horas-extras:gerar-lote:seccional"]))throw new Error("Competência inválida ou perfil sem ação e escopo para gerar o lote.");
 return db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`he-folha:${orgaoId}:${competence}`},0))`;
  if(!await tx.orgao.count({where:{id:orgaoId,ativo:true}}))throw new Error("Órgão inativo.");
  if(await tx.overtimePayrollBatch.count({where:{orgaoId,competence,status:{in:["DRAFT","CALCULATING","PENDING_REVIEW","READY_TO_CLOSE"]}}}))throw new Error("Já existe lote aberto para este órgão e competência.");
  const calculations=await tx.horaExtraCalculo.findMany({where:{competencia:competence,status:"CALCULADO",autorizacao:{orgaoId,status:"CALCULADA"}},include:{autorizacao:{include:{campaignVersion:true}},itens:{include:{servidorAutorizado:true,classificacaoIntervalo:{include:{campaignItem:true}}},orderBy:[{data:"asc"},{inicio:"asc"},{id:"asc"}]}},orderBy:{id:"asc"}});
  const lines=calculations.flatMap(calc=>calc.itens.filter(i=>!calc.autorizacao.campaignVersionId||(calc.autorizacao.campaignVersion?.status==="READY_FOR_PAYROLL"&&i.classificacaoIntervalo.campaignItem?.financialStatus==="ELIGIBLE")).map(item=>({calc,item})));
  if(!lines.length)throw new Error("Não há horas calculadas e liberadas para esta competência.");
  for(const id of [...new Set(lines.map(l=>l.item.servidorAutorizado.servidorId))].sort())await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`horas-extras-servidor:${id}`},0))`;
  for(const l of lines)if(l.item.classificacaoIntervalo.campaignItem)await exigirNaoDuplicidadeOrdinaria(tx,l.item.classificacaoIntervalo.campaignItem);
  for(const id of [...new Set(lines.map(l=>l.item.classificacaoIntervaloId))].sort())await tx.$queryRaw`SELECT id FROM horas_extras_classificacoes_intervalos WHERE id=${id}::uuid FOR UPDATE`;
  if(await tx.overtimePayrollBatchLine.count({where:{authorizationDayId:{in:lines.map(l=>l.item.classificacaoIntervaloId)},batch:{status:{not:"CANCELLED"}}}}))throw new Error("Classificação já incluída em outro lote; concilie a duplicidade.");
  if(new Set(lines.map(l=>l.item.classificacaoIntervaloId)).size!==lines.length)throw new Error("Há cálculos duplicados para a mesma classificação.");
  const employees=[...new Set(lines.map(l=>l.item.servidorAutorizado.servidorId))];
  const cents=lines.reduce((n,l)=>n+l.item.valorCentavos,0),minutes=lines.reduce((n,l)=>n+l.item.minutos,0);
  if(!Number.isSafeInteger(cents))throw new Error("Total fora da precisão suportada.");
  const checksum=createHash("sha256").update(JSON.stringify(lines.map(l=>({id:l.item.id,minutes:l.item.minutos,cents:l.item.valorCentavos})))).digest("hex");
  const batch=await tx.overtimePayrollBatch.create({data:{orgaoId,competence,status:"PENDING_REVIEW",filters:{origem:"CAMPANHA_E_LEGADO",orgaoId,competence},totalEmployees:employees.length,totalMinutes:minutes,totalAmount:new Prisma.Decimal(cents).div(100),checksum,createdByUserId:ctx.usuarioId}});
  for(const employeeId of employees) {
   const items=lines.filter(l=>l.item.servidorAutorizado.servidorId===employeeId),person=items[0].item.servidorAutorizado;
   const row=await tx.overtimePayrollBatchEmployee.create({data:{batchId:batch.id,employeeId,registration:person.matriculaSnapshot,employeeName:person.nomeSnapshot,organizationalUnitLabel:person.unidadeSnapshot,totalMinutes:items.reduce((n,l)=>n+l.item.minutos,0),totalAmount:new Prisma.Decimal(items.reduce((n,l)=>n+l.item.valorCentavos,0)).div(100)}});
   await tx.overtimePayrollBatchLine.createMany({data:items.map(({calc,item})=>({batchId:batch.id,batchEmployeeId:row.id,authorizationId:calc.autorizacaoId,authorizationDayId:item.classificacaoIntervaloId,requestId:calc.id,employeeId,date:item.data,competence,minutes:item.minutos,ratePercent:item.percentual,amount:new Prisma.Decimal(item.valorCentavos).div(100),rubricaCode:item.rubrica,metadata:{calculoId:calc.id,calculoItemId:item.id,processoSei:calc.autorizacao.processoSei,documentoAutorizacao:calc.autorizacao.documentoAutorizacao,origem:calc.autorizacao.campaignVersionId?"CAMPANHA_SECP":"SECap_LEGADO"}}))});
  }
  await tx.autorizacaoHoraExtraAdministrativa.updateMany({where:{id:{in:[...new Set(lines.map(l=>l.calc.autorizacaoId))]}},data:{status:"PRONTA_PARA_FOLHA"}});
  await tx.auditoriaEvento.create({data:{usuarioId:ctx.usuarioId,entidade:"OvertimePayrollBatch",entidadeId:batch.id,acao:"HORAS_EXTRAS_LOTE_FOLHA_GERADO",dadosDepois:{orgaoId,competence,totalEmployees:employees.length,totalMinutes:minutes,totalCentavos:cents,checksum},metadados:{perfilAtivo:ctx.perfilAtivoCodigo}}});
  return batch;
 },{maxWait:15000,timeout:60000});
}

export async function fecharLoteFolhaSeguro(db:PrismaClient,ctx:ContextoCampanha,id:string) {
 return db.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM overtime_payroll_batches WHERE id=${id}::uuid FOR UPDATE`;
  const batch=await tx.overtimePayrollBatch.findUniqueOrThrow({where:{id},include:{lines:true}});
  if(!podeAcessarOrgaoHorasExtras(ctx.escopo,batch.orgaoId)||!possuiAlgumaPermissaoNaLista(ctx.permissoes,["horas-extras:fechar-lote:global","horas-extras:fechar-lote:seccional"]))throw new Error("Perfil sem ação ou escopo para fechar o lote.");
  if(!["PENDING_REVIEW","READY_TO_CLOSE"].includes(batch.status)||!batch.lines.length)throw new Error("Lote não está aberto ou não possui itens.");
  const after=await tx.overtimePayrollBatch.update({where:{id},data:{status:"CLOSED",closedByUserId:ctx.usuarioId,closedAt:new Date()}});
  await tx.auditoriaEvento.create({data:{usuarioId:ctx.usuarioId,entidade:"OvertimePayrollBatch",entidadeId:id,acao:"HORAS_EXTRAS_LOTE_FOLHA_FECHADO",dadosAntes:{status:batch.status},dadosDepois:{status:after.status,checksum:after.checksum},metadados:{perfilAtivo:ctx.perfilAtivoCodigo}}});return after;
 });
}
