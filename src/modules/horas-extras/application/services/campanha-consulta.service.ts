import type { Prisma } from "@/generated/prisma/client";
import { prismaListagem } from "@/shared/infrastructure/database/prisma-listagem";
import { exigirTitularCampanha, temAcaoCampanha, type ContextoCampanha } from "./campanha-operacional.service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { possuiAlgumaPermissaoNaLista } from "@/modules/auth/application/services/permissao-utils";
import { campanhasHorasExtrasHabilitadas } from "./campanhas-horas-extras-feature.service";

export function orgaosCampanhaVisiveis(ctx:ContextoCampanha):Prisma.OrgaoWhereInput {
 const enabled=(process.env.HORAS_EXTRAS_CAMPANHAS_ORGAOS??"").split(",").map(s=>s.trim()).filter(Boolean);
 const canRead=possuiAlgumaPermissaoNaLista(ctx.permissoes,["horas-extras:visualizar:proprio","horas-extras:solicitar:proprio","horas-extras:analisar:chefia","horas-extras:analisar:subordinados",...['configurar-politica','responder-orcamento','deliberar','visualizar-execucao','visualizar-folha','gerar-lote','validar-remuneracao','validar-rubrica'].flatMap(p=>[`horas-extras:${p}:global`,`horas-extras:${p}:seccional`])]);
 if(!canRead)return {ativo:true,id:{in:[]}};
 return {ativo:true,id:{in:enabled.filter(id=>campanhasHorasExtrasHabilitadas(id)&&(ctx.escopo.global||ctx.escopo.orgaoIds.includes(id)))}};
}
export const podeLerFinanceiroCampanha=(ctx:ContextoCampanha)=>temAcaoCampanha(ctx,"gerar-lote")||temAcaoCampanha(ctx,"visualizar-folha")||temAcaoCampanha(ctx,"validar-remuneracao");
export function escopoProjetosCampanha(ctx:ContextoCampanha):Prisma.OvertimeProjectWhereInput {
 const orgao={is:orgaosCampanhaVisiveis(ctx)};
 const central=["configurar-politica","responder-orcamento","deliberar","visualizar-execucao","visualizar-folha","gerar-lote"].some(p=>temAcaoCampanha(ctx,p));
 const today=new Date();
 return {campaign:{orgao},...(!central?{OR:[{requesterUserId:ctx.usuarioId},{versions:{some:{items:{some:{employee:{usuarioId:ctx.usuarioId}}}}}},{account:{unit:{gestores:{some:{ativo:true,servidor:{usuarioId:ctx.usuarioId},dataInicio:{lte:today},OR:[{dataFim:null},{dataFim:{gte:today}}]}}}}}]}:{})};
}
export async function consultarCampanhas(ctx:ContextoCampanha) {
 return prismaListagem.overtimeCampaign.findMany({where:{orgao:orgaosCampanhaVisiveis(ctx)},include:{orgao:{select:{sigla:true,nome:true}},accounts:{include:{unit:{select:{nome:true,sigla:true}}}},_count:{select:{projects:{where:escopoProjetosCampanha(ctx)}}}},orderBy:[{fiscalYear:"desc"},{createdAt:"desc"}]});
}
export async function consultarProjetoCampanha(ctx:ContextoCampanha,id:string,versionId?:string) {
 const project=await prismaListagem.overtimeProject.findFirst({where:{id,...escopoProjetosCampanha(ctx)},include:{campaign:true,account:{include:{unit:true}},requester:{select:{nome:true}},versions:{orderBy:{version:"desc"},include:{items:{include:{employee:{select:{usuarioId:true}},bankCredit:true}},events:{orderBy:{createdAt:"asc"}},authorizations:{select:{id:true,mesReferencia:true,status:true}}}}}});
 if(!project)return null;
 const version=project.versions.find(v=>v.id===versionId)??project.versions[0];
 let central=["configurar-politica","responder-orcamento","deliberar","visualizar-execucao","visualizar-folha","gerar-lote"].some(p=>temAcaoCampanha(ctx,p))||project.requesterUserId===ctx.usuarioId;
 if(!central&&temAcaoCampanha(ctx,"analisar"))try{await exigirTitularCampanha(prisma,ctx,project.account.unitId);central=true;}catch{/* participante consulta apenas os próprios itens */}
 const ownItems=version.items.filter(i=>central||i.employee.usuarioId===ctx.usuarioId);
 const financial=podeLerFinanceiroCampanha(ctx);
 return {...project,versions:project.versions.map(v=>({id:v.id,version:v.version,status:v.status,createdAt:v.createdAt})),current:{...version,items:ownItems.map(i=>({...i,...(!financial?{calculationSnapshot:null}:{}),employee:undefined})),events:version.events.map(e=>({...e,before:undefined,after:undefined}))}};
}
