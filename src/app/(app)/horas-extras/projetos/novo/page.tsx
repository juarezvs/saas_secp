import { notFound } from "next/navigation";
import { contextoCampanhaSessao } from "@/modules/horas-extras/application/actions/campanha-operacional.actions";
import { consultarCampanhas, consultarProjetoCampanha } from "@/modules/horas-extras/application/services/campanha-consulta.service";
import { CampanhaShell } from "@/modules/horas-extras/presentation/components/campanha-shell";
import { ProjetoCampanhaForm, type ProjectDraft } from "@/modules/horas-extras/presentation/components/campanha-forms";
export default async function NovoProjetoPage({searchParams}:{searchParams:Promise<{campanha?:string;retificar?:string}>}){
 const ctx=await contextoCampanhaSessao(),p=await searchParams;const campaigns=(await consultarCampanhas(ctx)).filter(c=>c.status==="ACTIVE");
 const project=p.retificar?await consultarProjetoCampanha(ctx,p.retificar):null;if(p.retificar&&!project)notFound();
 const v=project?.current;
 const initialDraft:ProjectDraft|undefined=project&&v?{projectId:project.id,campaignId:project.campaignId,accountId:project.accountId,title:project.title,seiProcess:v.seiProcess,justification:v.justification,activities:v.activities,expectedResults:v.expectedResults,ordinaryImpossibility:v.ordinaryImpossibility,urgencyReason:v.urgencyReason??"",items:v.items.map(i=>({employeeId:i.employeeId,employeeLabel:(i.employeeSnapshot as {name?:string;registration?:string})?.name??"Servidor",date:i.date.toISOString().slice(0,10),startTime:i.startTime,endTime:i.endTime,breakMinutes:i.breakMinutes,activity:i.activity,destination:i.destination as "PECUNIA"|"BANCO_DE_HORAS",estimatedAmount:i.estimatedAmount.toString()}))}:p.campanha?{campaignId:p.campanha,accountId:"",title:"",seiProcess:"",justification:"",activities:"",expectedResults:"",ordinaryImpossibility:"",items:[]}:undefined;
 return <CampanhaShell title={project?"Nova versão do projeto":"Novo projeto coletivo"}>{!campaigns.length?<p className="rounded-lg border p-5 text-sm">Cadastre e ative uma campanha antes de apresentar um projeto.</p>:<ProjetoCampanhaForm campaigns={campaigns.map(c=>({value:c.id,label:c.name}))} accounts={campaigns.flatMap(c=>c.accounts.map(a=>({value:a.id,label:a.unit.nome,campaignId:c.id,unitId:a.unitId})))} initialDraft={initialDraft}/>}</CampanhaShell>;
}
