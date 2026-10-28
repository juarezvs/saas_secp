import Link from "next/link";
import { contextoCampanhaSessao } from "@/modules/horas-extras/application/actions/campanha-operacional.actions";
import { consultarCampanhas } from "@/modules/horas-extras/application/services/campanha-consulta.service";
import { temAcaoCampanha } from "@/modules/horas-extras/application/services/campanha-operacional.service";
import { CampanhaShell, currency, dateLabel, tableClass } from "@/modules/horas-extras/presentation/components/campanha-shell";

export default async function CampanhasPage(){
 const ctx=await contextoCampanhaSessao();const campaigns=await consultarCampanhas(ctx);
 const labels:Record<string,string>={DRAFT:"Rascunho",ACTIVE:"Ativa",CLOSED:"Encerrada",CANCELLED:"Cancelada"};
 return <CampanhaShell title="Campanhas de serviço extraordinário"><div className="flex flex-wrap items-start justify-between gap-3"><p className="max-w-3xl text-sm text-muted-foreground">Planeje os projetos, acompanhe as decisões e confira a cobertura financeira de cada unidade. Referências administrativas e recursos efetivamente recebidos são apresentados separadamente.</p>{temAcaoCampanha(ctx,"configurar-politica")?<Link className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" href="/horas-extras/campanhas/nova">Nova campanha</Link>:null}</div>
 {!campaigns.length?<div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">Nenhuma campanha disponível para o seu perfil e órgão.</div>:<div className="overflow-x-auto rounded-lg border"><table className={tableClass}><thead><tr><th>Campanha</th><th>Órgão / exercício</th><th>Situação</th><th>Projetos</th><th>Comprovação</th><th>Recursos descentralizados</th></tr></thead><tbody>{campaigns.map(c=><tr key={c.id}><td><Link href={`/horas-extras/campanhas/${c.id}`} className="font-semibold underline-offset-4 hover:underline">{c.name}</Link><p className="text-xs text-muted-foreground">{c.code}</p></td><td>{c.orgao.sigla} · {c.fiscalYear}</td><td>{labels[c.status]}</td><td>{c._count.projects}</td><td>{dateLabel(c.proofDeadline)}</td><td>{currency(c.accounts.reduce((n,a)=>n+Number(a.decentralizedAmount),0))}</td></tr>)}</tbody></table></div>}</CampanhaShell>;
}
