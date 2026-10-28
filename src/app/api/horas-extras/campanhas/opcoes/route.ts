import { NextRequest, NextResponse } from "next/server";
import { contextoCampanhaSessao } from "@/modules/horas-extras/application/actions/campanha-operacional.actions";
import { exigirAcaoCampanha, exigirUnidadeAtiva, exigirTitularCampanha } from "@/modules/horas-extras/application/services/campanha-operacional.service";
import { prismaListagem } from "@/shared/infrastructure/database/prisma-listagem";
import { prisma } from "@/shared/infrastructure/database/prisma";
export async function GET(request:NextRequest){
 try {
 const ctx=await contextoCampanhaSessao(),p=request.nextUrl.searchParams,campaignId=p.get("campaignId")??"",unitId=p.get("unitId")??"",q=(p.get("q")??"").trim(),employeeId=p.get("employeeId");
 const campaign=await prismaListagem.overtimeCampaign.findUniqueOrThrow({where:{id:campaignId}});exigirAcaoCampanha(ctx,campaign.orgaoId,"solicitar");
 await exigirUnidadeAtiva(prisma,unitId,campaign.orgaoId);
 await exigirTitularCampanha(prisma,ctx,unitId);
 if(!await prismaListagem.overtimeCampaignAccount.count({where:{campaignId,unitId}}))throw new Error("Unidade fora da campanha.");
 if(p.get("kind")==="responsible"){
 const options=await prisma.$queryRaw<Array<{value:string;label:string}>>`WITH RECURSIVE pais AS (SELECT id,unidade_pai_id FROM unidades_organizacionais WHERE id=${unitId}::uuid UNION SELECT u.id,u.unidade_pai_id FROM unidades_organizacionais u JOIN pais p ON p.unidade_pai_id=u.id) SELECT DISTINCT u.id AS value,u.nome AS label FROM gestores_unidades g JOIN servidores s ON s.id=g.servidor_id JOIN usuarios u ON u.id=s.usuario_id WHERE g.unidade_id IN (SELECT id FROM pais) AND g.ativo AND s.ativo AND u.ativo AND s.orgao_id=${campaign.orgaoId}::uuid AND g.data_inicio<=CURRENT_DATE AND (g.data_fim IS NULL OR g.data_fim>=CURRENT_DATE) AND (u.nome ILIKE ${`%${q}%`} OR s.matricula ILIKE ${`%${q}%`}) ORDER BY label LIMIT 30`;
 return NextResponse.json({options},{headers:{"Cache-Control":"no-store"}});
 }
 const employees=await prismaListagem.servidor.findMany({where:{orgaoId:campaign.orgaoId,ativo:true,...(employeeId?{id:employeeId}:{OR:[{matricula:{contains:q,mode:"insensitive"}},{usuario:{nome:{contains:q,mode:"insensitive"}}}]}),lotacoes:{some:{unidadeId:unitId,status:"ATIVO",dataInicio:{lte:new Date()},OR:[{dataFim:null},{dataFim:{gte:new Date()}}]}}},select:{id:true,matricula:true,usuario:{select:{nome:true}}},orderBy:{matricula:"asc"},take:30});
 return NextResponse.json({options:employees.map(e=>({value:e.id,label:`${e.matricula} — ${e.usuario.nome}`}))},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({error:"Pesquisa indisponível para esta sessão e unidade."},{status:403});}
}
