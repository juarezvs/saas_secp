import { contextoCampanhaSessao } from "@/modules/horas-extras/application/actions/campanha-operacional.actions";
import { orgaosCampanhaVisiveis } from "@/modules/horas-extras/application/services/campanha-consulta.service";
import { temAcaoCampanha } from "@/modules/horas-extras/application/services/campanha-operacional.service";
import { CampanhaShell } from "@/modules/horas-extras/presentation/components/campanha-shell";
import { CampanhaForm } from "@/modules/horas-extras/presentation/components/campanha-forms";
import { prismaListagem } from "@/shared/infrastructure/database/prisma-listagem";
import { notFound } from "next/navigation";
export default async function NovaCampanhaPage({searchParams}:{searchParams:Promise<{editar?:string}>}){
 const ctx=await contextoCampanhaSessao();if(!temAcaoCampanha(ctx,"configurar-politica"))return <CampanhaShell title="Nova campanha"><p>Seu perfil não permite cadastrar campanhas.</p></CampanhaShell>;
 const orgaos=await prismaListagem.orgao.findMany({where:orgaosCampanhaVisiveis(ctx),orderBy:{sigla:"asc"}});
 const units=await prismaListagem.unidadeOrganizacional.findMany({where:{orgaoId:{in:orgaos.map(o=>o.id)},ativo:true},orderBy:{nome:"asc"}});
 const {editar}=await searchParams;
 const existing=editar?await prismaListagem.overtimeCampaign.findFirst({where:{id:editar,status:"DRAFT",orgao:orgaosCampanhaVisiveis(ctx)},include:{accounts:true}}):null;if(editar&&!existing)notFound();
 const rules=existing?.rules as {description?:string;criteria?:string}|undefined;
 const initialCampaign=existing?{id:existing.id,fields:{orgaoId:existing.orgaoId,code:existing.code,name:existing.name,fiscalYear:String(existing.fiscalYear),seiProcess:existing.seiProcess,authorizationDocument:existing.authorizationDocument,validFrom:existing.validFrom?.toISOString().slice(0,10)??"",validUntil:existing.validUntil?.toISOString().slice(0,10)??"",projectDeadline:existing.projectDeadline.toISOString().slice(0,10),proofDeadline:existing.proofDeadline.toISOString().slice(0,10),description:rules?.description??"",criteria:rules?.criteria??""},accounts:existing.accounts.map(a=>({unitId:a.unitId,referenceAmount:a.referenceAmount.toString()}))}:undefined;
 return <CampanhaShell title={existing?"Editar rascunho da campanha":"Nova campanha"}><CampanhaForm initialCampaign={initialCampaign} orgaos={orgaos.map(o=>({value:o.id,label:`${o.sigla} — ${o.nome}`}))} units={units.map(u=>({value:u.id,label:u.nome,orgaoId:u.orgaoId}))}/></CampanhaShell>;
}
