import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { contextoCampanhaSessao } from "@/modules/horas-extras/application/actions/campanha-operacional.actions";
import { consultarCampanhas, escopoProjetosCampanha } from "@/modules/horas-extras/application/services/campanha-consulta.service";
import { temAcaoCampanha } from "@/modules/horas-extras/application/services/campanha-operacional.service";
import { estadosProjeto } from "@/modules/horas-extras/domain/fluxo-campanha";
import { CampanhaShell, dateLabel, duration, tableClass } from "@/modules/horas-extras/presentation/components/campanha-shell";
import { SearchableSelect } from "@/components/ui";
import { prismaListagem } from "@/shared/infrastructure/database/prisma-listagem";
import { parseIsoDateOnly } from "@/modules/horas-extras/application/services/horas-extras-datas.service";

type Params={q?:string;status?:string;campanha?:string;orgao?:string;unidade?:string;matricula?:string;servidor?:string;ano?:string;inicio?:string;fim?:string;modalidade?:string;financeiro?:string;tipoDia?:string;sei?:string;pagina?:string};
const asDate=(value?:string)=>{try{return value?parseIsoDateOnly(value):undefined;}catch{return undefined;}};
export default async function ProjetosPage({searchParams}:{searchParams:Promise<Params>}) {
 const ctx=await contextoCampanhaSessao(),p=await searchParams,campaigns=await consultarCampanhas(ctx);
 const initial=asDate(p.inicio),end=asDate(p.fim);
 const item:Prisma.OvertimeProjectItemWhereInput={
  ...(p.matricula||p.servidor?{employee:{...(p.matricula?{matricula:{contains:p.matricula,mode:"insensitive"}}:{}),...(p.servidor?{usuario:{nome:{contains:p.servidor,mode:"insensitive"}}}:{})}}:{}),
  ...(initial||end?{date:{...(initial?{gte:initial}:{}),...(end?{lte:end}:{})}}:{}),
  ...(p.modalidade?{destination:p.modalidade}:{}),...(p.financeiro?{financialStatus:p.financeiro}:{}),
  ...(p.tipoDia?{dayType:p.tipoDia as Prisma.EnumOvertimeDayTypeFilter["equals"]}:{}),
 };
 const filters:Prisma.OvertimeProjectWhereInput={AND:[await escopoProjetosCampanha(ctx),{
  ...(p.orgao?{orgaoId:p.orgao}:{}),...(p.unidade?{account:{unitId:p.unidade}}:{}),...(p.campanha?{campaignId:p.campanha}:{}),
  ...(p.ano&&/^\d{4}$/.test(p.ano)?{campaign:{fiscalYear:Number(p.ano)}}:{}),
  versions:{some:{isCurrent:true,...(p.status?{status:p.status}:{}),...(p.sei?{seiProcess:{contains:p.sei,mode:"insensitive"}}:{}),...(Object.keys(item).length?{items:{some:item}}:{})}},
  ...(p.q?{OR:[{title:{contains:p.q,mode:"insensitive"}},{campaign:{name:{contains:p.q,mode:"insensitive"}}}]}:{}),
 }]};
 const total=await prismaListagem.overtimeProject.count({where:filters});const pages=Math.max(1,Math.ceil(total/20));const page=Math.min(pages,Math.max(1,Number(p.pagina)||1));
 const projects=await prismaListagem.overtimeProject.findMany({where:filters,include:{campaign:{select:{name:true}},account:{include:{unit:{select:{nome:true}}}},versions:{where:{isCurrent:true},include:{items:{select:{requestedMinutes:true,approvedMinutes:true,homologatedMinutes:true}}}}},orderBy:{updatedAt:"desc"},skip:(page-1)*20,take:20});
 const selects=[
  {name:"orgao",label:"Órgão",options:[...new Map(campaigns.map(c=>[c.orgaoId,{value:c.orgaoId,label:c.orgao.sigla}])).values()]},
  {name:"campanha",label:"Campanha",options:campaigns.map(c=>({value:c.id,label:c.name}))},
  {name:"unidade",label:"Unidade",options:[...new Map(campaigns.flatMap(c=>c.accounts.map(a=>[a.unitId,{value:a.unitId,label:a.unit.nome}] as const))).values()]},
  {name:"ano",label:"Exercício",options:[...new Set(campaigns.map(c=>c.fiscalYear))].map(y=>({value:String(y),label:String(y)}))},
  {name:"status",label:"Etapa",options:Object.entries(estadosProjeto).map(([value,label])=>({value,label}))},
  {name:"modalidade",label:"Modalidade",options:[{value:"PECUNIA",label:"Pagamento"},{value:"BANCO_DE_HORAS",label:"Banco extraordinário"}]},
  {name:"financeiro",label:"Situação financeira",options:[{value:"PENDING",label:"Pendente"},{value:"CALCULATED",label:"Calculada"},{value:"ELIGIBLE",label:"Elegível para folha"},{value:"SENT_TO_PAYROLL",label:"Encaminhada à folha"},{value:"BANK",label:"Convertida em banco"},{value:"REJECTED",label:"Indeferida"}]},
  {name:"tipoDia",label:"Tipo de dia",options:[{value:"DIA_UTIL",label:"Dia útil"},{value:"SABADO",label:"Sábado"},{value:"DOMINGO",label:"Domingo"},{value:"FERIADO_NACIONAL",label:"Feriado nacional"},{value:"FERIADO_ESTADUAL",label:"Feriado estadual"},{value:"FERIADO_MUNICIPAL",label:"Feriado municipal"},{value:"PONTO_FACULTATIVO",label:"Ponto facultativo"},{value:"RECESSO",label:"Recesso"}]},
 ];
 const pagination=(n:number)=>`/horas-extras/projetos?${new URLSearchParams({...Object.fromEntries(Object.entries(p).filter(([,v])=>v!==undefined)) as Record<string,string>,pagina:String(n)})}`;
 return <CampanhaShell title="Projetos e acompanhamento"><div className="flex flex-wrap justify-between gap-3"><p className="text-sm text-muted-foreground">{total} projetos no seu escopo. Abra o registro para atuar na etapa correspondente ao seu perfil.</p>{temAcaoCampanha(ctx,"solicitar")?<Link className="text-sm font-semibold underline" href="/horas-extras/projetos/novo">Novo projeto coletivo</Link>:null}</div>
 <form className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 xl:grid-cols-4">{selects.map(s=><label className="grid gap-1 text-xs font-medium" key={s.name}>{s.label}<SearchableSelect id={`filter-${s.name}`} name={s.name} defaultValue={p[s.name as keyof Params]} options={[{value:"",label:"Todos"},...s.options]}/></label>)}{[["q","Título ou campanha","text"],["servidor","Nome do servidor","search"],["matricula","Matrícula do servidor","search"],["sei","Processo SEI","search"],["inicio","A partir de","date"],["fim","Até","date"]].map(([name,label,type])=><label className="grid gap-1 text-xs font-medium" key={name}>{label}<input name={name} type={type} defaultValue={p[name as keyof Params]} className="h-10 rounded-md border bg-background px-3"/></label>)}<div className="flex items-end gap-3"><button className="h-10 rounded-md border px-4 text-sm font-semibold" type="submit">Aplicar filtros</button><Link className="text-sm underline" href="/horas-extras/projetos">Limpar</Link></div></form>
 <div className="overflow-x-auto rounded-lg border"><table className={tableClass}><thead><tr><th>Projeto</th><th>Campanha / unidade</th><th>Etapa</th><th>Solicitadas</th><th>Autorizadas</th><th>Homologadas</th><th>Atualização</th></tr></thead><tbody>{projects.map(pr=>{const v=pr.versions[0];return <tr key={pr.id}><td><Link className="font-semibold underline" href={`/horas-extras/projetos/${pr.id}`}>{pr.title}</Link><p className="text-xs text-muted-foreground">Versão {pr.currentVersion} · SEI {v?.seiProcess}</p></td><td>{pr.campaign.name}<p className="text-xs text-muted-foreground">{pr.account.unit.nome}</p></td><td>{estadosProjeto[v?.status as keyof typeof estadosProjeto]??v?.status}</td><td>{duration(v?.items.reduce((n,i)=>n+i.requestedMinutes,0)??0)}</td><td>{duration(v?.items.reduce((n,i)=>n+i.approvedMinutes,0)??0)}</td><td>{duration(v?.items.reduce((n,i)=>n+i.homologatedMinutes,0)??0)}</td><td>{dateLabel(pr.updatedAt)}</td></tr>;})}</tbody></table>{!projects.length?<p className="p-6 text-sm text-muted-foreground">Nenhum projeto encontrado.</p>:null}</div>
 <nav aria-label="Paginação dos projetos" className="flex justify-between text-sm"><Link href={pagination(Math.max(1,page-1))}>Anterior</Link><span>Página {page} de {pages}</span><Link href={pagination(Math.min(pages,page+1))}>Próxima</Link></nav></CampanhaShell>;
}
