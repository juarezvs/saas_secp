import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Breadcrumb } from "@/components/layout/breadcrumb";

export function CampanhaShell({title,children}:{title:string;children:React.ReactNode}) {
 return <div className="space-y-5"><PageHeader icon={CalendarClock} titulo={title} contexto={<Breadcrumb embedded items={[{label:"Horas extras",href:"/horas-extras"},{label:"Campanhas",href:"/horas-extras/campanhas"},{label:title}]}/>} variant="blade"/>
 <nav aria-label="Serviço extraordinário" className="flex flex-wrap gap-2 border-b pb-3 text-sm">{[["Campanhas","/horas-extras/campanhas"],["Projetos e acompanhamento","/horas-extras/projetos"],["Banco extraordinário","/horas-extras/banco"],["Remuneração e rubricas","/horas-extras/remuneracao"],["Folha","/folha/horas-extras"]].map(([label,href])=><Link key={href} href={href} className="rounded-md border px-3 py-2 hover:bg-muted">{label}</Link>)}</nav>{children}</div>;
}
export const currency=(value:string|number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(Number(value));
export const duration=(minutes:number)=>`${Math.floor(minutes/60)}h${String(minutes%60).padStart(2,"0")}`;
export const dateLabel=(date:Date|string)=>new Intl.DateTimeFormat("pt-BR",{timeZone:"UTC"}).format(new Date(date));
export const tableClass="w-full text-sm [&_th]:px-3 [&_th]:py-3 [&_th]:text-left [&_th]:font-medium [&_th]:text-muted-foreground [&_td]:px-3 [&_td]:py-3 [&_tr]:border-b";
