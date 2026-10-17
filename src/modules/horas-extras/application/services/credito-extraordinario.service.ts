import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { exigirAcaoCampanha, exigirTitularCampanha, exigirUnidadeAtiva, hojeCampanha, type ContextoCampanha } from "./campanha-operacional.service";
import { parseIsoDateOnly } from "./horas-extras-datas.service";
import { resolverPrevisaoJornadaDia } from "@/modules/jornadas/application/services/resolver-previsao-jornada-dia.service";
const schema=z.object({employeeId:z.uuid(),date:z.string(),seiDocument:z.string().trim().min(3).max(160),reason:z.string().trim().min(30).max(4000),staffException:z.string().trim().max(4000).optional()});

export async function registrarFruicaoExtraordinaria(db:PrismaClient,ctx:ContextoCampanha,data:unknown) {
 const input=schema.parse(data),date=parseIsoDateOnly(input.date);
 if(input.date<hojeCampanha())throw new Error("A fruição deve ser autorizada previamente.");
 return db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`horas-extras-servidor:${input.employeeId}`},0))`;
  const employee=await tx.servidor.findUniqueOrThrow({
   where:{id:input.employeeId},
   include:{
    lotacoes:{where:{status:"ATIVO",dataInicio:{lte:date},OR:[{dataFim:null},{dataFim:{gte:date}}]}},
    usuario:{select:{nome:true}},
   },
  });
  exigirAcaoCampanha(ctx,employee.orgaoId,"deliberar");const lotacao=employee.lotacoes[0];if(!lotacao)throw new Error("Servidor sem lotação vigente.");
  await exigirUnidadeAtiva(tx,lotacao.unidadeId,employee.orgaoId);
  if(!ctx.escopo.global)await exigirTitularCampanha(tx,ctx,lotacao.unidadeId);
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`he-fruicao:${lotacao.unidadeId}:${input.date}`},0))`;
  const binding=await tx.jornadaServidor.findFirst({where:{servidorId:employee.id,ativo:true,status:"ATIVO",dataInicio:{lte:date},OR:[{dataFim:null},{dataFim:{gte:date}}]},include:{jornada:{include:{dias:{include:{faixas:true}}}},escala:{include:{dias:true}}},orderBy:{dataInicio:"desc"}});
  if(!binding)throw new Error("Jornada vigente ausente.");
  const schedule=resolverPrevisaoJornadaDia({jornada:binding.jornada,escala:binding.escala,dataReferencia:date,dataAncoragemJornada:binding.dataInicio});
  if(!schedule.trabalha||schedule.cargaPrevistaMinutos<=0)throw new Error("A data deve corresponder a um dia de trabalho do servidor.");
  const next=new Date(date);next.setUTCDate(next.getUTCDate()+1);
  const existing=await tx.solicitacao.count({where:{servidorId:employee.id,status:{in:["ENVIADA","EM_ANALISE","DEFERIDA"]},OR:[{dataReferencia:date},{dataInicio:{lt:next},dataFim:{gte:date}}]}});
  if(existing||await tx.afastamentoSarh.count({where:{servidorId:employee.id,ativo:true,dataInicio:{lte:date},OR:[{dataFim:null},{dataFim:{gte:date}}]}}))throw new Error("Há solicitação ou afastamento conflitante nesta data.");
  const staff=await tx.servidor.findMany({where:{ativo:true,lotacoes:{some:{unidadeId:lotacao.unidadeId,status:"ATIVO",dataInicio:{lte:date},OR:[{dataFim:null},{dataFim:{gte:date}}]}}},select:{id:true}});
  const away=await tx.solicitacao.findMany({where:{servidorId:{in:staff.map(s=>s.id)},status:"DEFERIDA",tipo:{in:["FOLGA_BANCO_HORAS","DISPENSA_PONTO","VIAGEM_SERVICO"]},OR:[{dataReferencia:date},{dataInicio:{lt:next},dataFim:{gte:date}}]},select:{servidorId:true}});
  const sarhAway=await tx.afastamentoSarh.findMany({where:{servidorId:{in:staff.map(s=>s.id)},ativo:true,dataInicio:{lte:date},OR:[{dataFim:null},{dataFim:{gte:date}}]},select:{servidorId:true}});
  const absent=new Set([...away.map(a=>a.servidorId),...sarhAway.map(a=>a.servidorId),employee.id]);
  if(staff.length-absent.size<Math.ceil(staff.length*2/3)&&(input.staffException?.length??0)<30)throw new Error("A fruição reduziria a permanência abaixo de dois terços da unidade. Registre a decisão fundamentada sobre a aplicabilidade dessa condição.");
  const credits=await tx.overtimeExtraordinaryCredit.findMany({where:{employeeId:employee.id,expiresOn:{gte:date}},orderBy:[{expiresOn:"asc"},{createdAt:"asc"}]});
  let remaining=schedule.cargaPrevistaMinutos;
  if(credits.reduce((n,c)=>n+c.creditedMinutes-c.usedMinutes,0)<remaining)throw new Error("Saldo extraordinário insuficiente para um dia de folga.");
  const request=await tx.solicitacao.create({data:{servidorId:employee.id,usuarioSolicitanteId:employee.usuarioId,unidadeId:lotacao.unidadeId,analisadaPorUsuarioId:ctx.usuarioId,tipo:"FOLGA_BANCO_HORAS",status:"DEFERIDA",titulo:"Fruição de crédito extraordinário",descricao:input.reason,dataReferencia:date,dataInicio:date,dataFim:next,justificativaAnalise:input.reason,analisadaEm:new Date(),dadosSolicitados:{regime:"EXTRAORDINARIO",seiDocument:input.seiDocument,minutes:remaining},dadosResultado:{regime:"EXTRAORDINARIO",staffException:input.staffException??null,seiDocument:input.seiDocument}}});
  for(const credit of credits){const used=Math.min(remaining,credit.creditedMinutes-credit.usedMinutes);if(used<=0)continue;await tx.overtimeExtraordinaryCreditUse.create({data:{creditId:credit.id,requestId:request.id,date,minutes:used,actorUserId:ctx.usuarioId,seiDocument:input.seiDocument,reason:input.reason}});await tx.overtimeExtraordinaryCredit.update({where:{id:credit.id},data:{usedMinutes:{increment:used}}});remaining-=used;}
  await tx.auditoriaEvento.create({data:{usuarioId:ctx.usuarioId,entidade:"Solicitacao",entidadeId:request.id,acao:"HORAS_EXTRAS_FRUICAO_AUTORIZADA",dadosDepois:{employeeId:employee.id,date:input.date,minutes:schedule.cargaPrevistaMinutos,regime:"EXTRAORDINARIO"},metadados:{perfilAtivo:ctx.perfilAtivoCodigo,document:input.seiDocument,reason:input.reason,staffException:input.staffException??null}}});
  return request;
 },{timeout:30000});
}
