import { Settings2 } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { MODELOS_CONFIGURACAO_APURACAO } from "@/modules/mct/domain/modelos-configuracao-apuracao";
import { salvarConfiguracaoApuracao } from "@/modules/mct/application/actions/configuracao-apuracao.actions";

const etapas = ["Jornada", "Escala", "Modelo", "Política", "Vigência", "Validação", "Revisão"];

export default async function ConfiguracaoApuracaoPage() {
  await exigirUmaDasPermissoesOuRedirecionar(["mct-configuracao:consultar:seccional", "mct-configuracao:consultar:global", "mct-configuracao:gerenciar:seccional", "mct-configuracao:gerenciar:global"]);
  const [jornadas, politicas, configuracoes] = await Promise.all([
    prisma.jornada.findMany({ where: { ativo: true }, include: { escalas: { where: { ativo: true } } }, orderBy: { nome: "asc" } }),
    prisma.mctPoliticaVersao.findMany({ where: { estado: "PUBLICADA" }, orderBy: [{ nome: "asc" }, { versao: "desc" }] }),
    prisma.mctConfiguracaoApuracao.findMany({ include: { jornada: true, escala: true, politica: true }, orderBy: { criadoEm: "desc" } }),
  ]);
  return <div className="space-y-3">
    <Breadcrumb items={[{ label: "MCT" }, { label: "Configuração da Apuração" }]} />
    <PageHeader icon={Settings2} titulo="Configuração da Apuração" descricao="Conecte jornadas e escalas existentes ao MCT sem duplicar horários." />
    <div className="grid gap-4 xl:grid-cols-[minmax(360px,0.42fr)_minmax(0,0.58fr)]">
      <form action={salvarConfiguracaoApuracao} className="rounded border bg-card p-4">
        <ol className="mb-5 flex flex-wrap gap-2">{etapas.map((etapa, i) => <li key={etapa} className="flex items-center gap-1 text-xs text-muted-foreground"><span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">{i + 1}</span>{etapa}</li>)}</ol>
        <div className="space-y-4">
          <label className="block text-sm font-medium">1. Jornada existente<select name="jornadaId" required className="mt-1 h-10 w-full rounded border bg-background px-3"><option value="">Selecione</option>{jornadas.map((item) => <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>)}</select><span className="mt-1 block text-xs text-muted-foreground">Carga, dias e faixas são lidos deste cadastro.</span></label>
          <label className="block text-sm font-medium">2. Escala específica<select name="escalaId" className="mt-1 h-10 w-full rounded border bg-background px-3"><option value="">Usar a escala vinculada ao servidor</option>{jornadas.flatMap((j) => j.escalas.map((e) => <option key={e.id} value={e.id}>{j.codigo} - {e.nome}</option>))}</select></label>
          <label className="block text-sm font-medium">3. Modelo orientativo<select name="modeloCodigo" required className="mt-1 h-10 w-full rounded border bg-background px-3">{MODELOS_CONFIGURACAO_APURACAO.map((item) => <option key={item.codigo} value={item.codigo}>{item.nome}</option>)}</select><span className="mt-1 block text-xs text-muted-foreground">O modelo não cria parâmetros normativos automaticamente.</span></label>
          <label className="block text-sm font-medium">4. Política publicada<select name="politicaVersaoId" className="mt-1 h-10 w-full rounded border bg-background px-3"><option value="">Configurar depois</option>{politicas.map((item) => <option key={item.id} value={item.id}>{item.nome} v{item.versao}</option>)}</select></label>
          <label className="block text-sm font-medium">5. Início da vigência<input name="vigenciaInicio" type="date" required className="mt-1 h-10 w-full rounded border bg-background px-3" /></label>
          <div className="rounded border border-dashed p-3 text-xs text-muted-foreground"><strong className="block text-foreground">6. Validação</strong>Ao salvar, a configuração fica pronta para simulação somente se houver política publicada. Nenhuma ativação ocorre nesta etapa.</div>
          <button className="h-9 rounded bg-primary px-4 text-sm font-semibold text-primary-foreground">7. Salvar para revisão</button>
        </div>
      </form>
      <section className="rounded border bg-card p-4"><h2 className="text-base font-semibold">Implantações</h2><div className="mt-3 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="p-2">Jornada</th><th className="p-2">Modelo</th><th className="p-2">Política</th><th className="p-2">Status</th></tr></thead><tbody>{configuracoes.map((item) => <tr key={item.id} className="border-b"><td className="p-2 font-medium">{item.jornada.nome}</td><td className="p-2">{item.modeloCodigo}</td><td className="p-2">{item.politica ? `${item.politica.nome} v${item.politica.versao}` : "Pendente"}</td><td className="p-2">{item.status}</td></tr>)}{configuracoes.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Nenhuma configuração criada.</td></tr>}</tbody></table></div></section>
    </div>
  </div>;
}
