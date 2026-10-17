import { GitCompareArrows } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { ValidacaoMctPanel } from "@/modules/mct/presentation/components/validacao-mct-panel";
import { prismaListagem } from "@/shared/infrastructure/database/prisma-listagem";

export default async function ValidacaoMctPage() {
  const acesso = await exigirUmaDasPermissoesOuRedirecionar(["mct-configuracao:consultar:seccional", "mct-configuracao:consultar:global", "mct-configuracao:gerenciar:seccional", "mct-configuracao:gerenciar:global"]);
  const execucoes = await prismaListagem.mctExecucao.findMany({
    where: { modo: "SHADOW", ...(acesso.perfilAtivoEscopoGlobal ? {} : { orgaoId: { in: acesso.orgaoIds?.length ? acesso.orgaoIds : ["00000000-0000-0000-0000-000000000000"] } }) },
    include: { comparacaoLegado: true, politica: { select: { nome: true, versao: true } } }, orderBy: { iniciadaEm: "desc" }, take: 100,
  });
  return <div className="space-y-3"><Breadcrumb items={[{ label: "Administração" }, { label: "MCT" }, { label: "Validação" }]} /><PageHeader icon={GitCompareArrows} titulo="Validação e comparação" descricao="Execute competências em SHADOW e compare o MCT ao cálculo legado sem efeitos oficiais." /><ValidacaoMctPanel /><section className="border bg-card"><div className="border-b p-3"><h2 className="font-semibold">Execuções recentes</h2></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="p-3">Competência</th><th className="p-3">Data</th><th className="p-3">Política</th><th className="p-3">Status</th><th className="p-3">Divergências</th><th className="p-3">Crítica</th></tr></thead><tbody>{execucoes.map((item) => <tr key={item.id} className="border-b"><td className="p-3">{item.competencia}</td><td className="p-3">{item.dataReferencia.toLocaleDateString("pt-BR", { timeZone: "UTC" })}</td><td className="p-3">{item.politica.nome} v{item.politica.versao}</td><td className="p-3">{item.status.replaceAll("_", " ")}</td><td className="p-3">{item.comparacaoLegado?.totalDivergencias ?? "-"}</td><td className="p-3">{item.comparacaoLegado?.possuiDivergenciaCritica ? "Sim" : "Não"}</td></tr>)}{!execucoes.length && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma execução SHADOW encontrada.</td></tr>}</tbody></table></div></section></div>;
}
