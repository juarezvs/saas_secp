import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";
import { contextoCampanhaSessao } from "@/modules/horas-extras/application/actions/campanha-operacional.actions";
import { consultarProjetoCampanha, podeLerFinanceiroCampanha } from "@/modules/horas-extras/application/services/campanha-consulta.service";
import { csvCampanha, xlsxCampanha } from "@/modules/horas-extras/application/services/campanha-exportacao.service";
import { ProjetoCampanhaPdfDocument } from "@/modules/horas-extras/presentation/pdf/projeto-campanha-pdf.document";
import { prisma } from "@/shared/infrastructure/database/prisma";
export const runtime="nodejs";
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
 try {
  const ctx=await contextoCampanhaSessao(),{id}=await params,format=request.nextUrl.searchParams.get("format")??"csv";
  if(!["csv","xlsx","pdf"].includes(format))return NextResponse.json({error:"Formato inválido."},{status:400});
  const p=await consultarProjetoCampanha(ctx,id,request.nextUrl.searchParams.get("version")??undefined);if(!p)return NextResponse.json({error:"Projeto não disponível."},{status:404});
  const financial=podeLerFinanceiroCampanha(ctx),v=p.current;
  const rows:Array<Array<string|number>>=[["Matrícula","Nome","Data","Início","Fim","Solicitado (min)","Autorizado (min)","Apurado (min)","Comprovado (min)","Homologado (min)","Destino",...(financial?["Valor (R$)"]:[])],...v.items.map(i=>{const e=i.employeeSnapshot as {registration:string;name:string};return [e.registration,e.name,i.date.toISOString().slice(0,10),i.startTime,i.endTime,i.requestedMinutes,i.approvedMinutes,i.performedMinutes,i.provenMinutes,i.homologatedMinutes,i.destination,...(financial?[String((i.calculationSnapshot as {amount?:string})?.amount??"")]:[])];})];
  let body:Uint8Array|string;let contentType:string;
  if(format==="pdf"){body=new Uint8Array(await renderToBuffer(createElement(ProjetoCampanhaPdfDocument,{title:p.title,subtitle:`${p.campaign.name} · ${p.account.unit.nome} · SEI ${v.seiProcess} · versão ${v.version}`,justification:v.justification,rows,hash:v.contentHash})));contentType="application/pdf";}
  else if(format==="xlsx"){body=xlsxCampanha(rows);contentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";}
  else {body=csvCampanha(rows);contentType="text/csv; charset=utf-8";}
  await prisma.auditoriaEvento.create({data:{usuarioId:ctx.usuarioId,entidade:"OvertimeProjectVersion",entidadeId:v.id,acao:"HORAS_EXTRAS_PROJETO_EXPORTADO",dadosDepois:{format,version:v.version,items:v.items.length,financial},metadados:{perfilAtivo:ctx.perfilAtivoCodigo,orgaoId:p.orgaoId}}});
  return new NextResponse(typeof body==="string"?body:Buffer.from(body),{headers:{"Content-Type":contentType,"Content-Disposition":`attachment; filename="projeto-${p.id}-v${v.version}.${format}"`,"Cache-Control":"private, no-store"}});
 }catch{return NextResponse.json({error:"Não foi possível exportar o projeto para esta sessão."},{status:403});}
}
