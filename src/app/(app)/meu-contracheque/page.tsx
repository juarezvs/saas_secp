import { redirect } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { obterIdentidadeContracheque } from "@/modules/contracheque/application/services/identidade-contracheque.service";
import { buscarContrachequeSarh, listarCompetenciasContrachequeSarh, listarDocumentosContrachequeSarh, listarHistoricoContrachequeSarh } from "@/modules/contracheque/infrastructure/oracle/contracheque-oracle.repository";
import { normalizarCompetenciaContracheque, rotuloCompetenciaContracheque } from "@/modules/contracheque/application/services/formatar-contracheque.service";
import { ContrachequePainel } from "@/modules/contracheque/presentation/components/contracheque-painel";
import { ContrachequePrevia } from "@/modules/contracheque/presentation/components/contracheque-previa";
import type { ContrachequeDados, ContrachequeDocumento, ContrachequeHistorico } from "@/modules/contracheque/domain/contracheque.types";

export const dynamic = "force-dynamic";

export default async function MeuContrachequePage({ searchParams }: {
  searchParams: Promise<{ competencia?: string; documento?: string }>;
}) {
  const permissao = await exigirPermissaoOuRedirecionar("contracheque:consultar:proprio");
  if (permissao.perfilAtivoCodigo?.toUpperCase() !== "SERVIDOR")
    redirect(`/acesso-negado?permissao=${encodeURIComponent("contracheque:consultar:proprio")}`);
  const identidade = permissao.usuarioId ? await obterIdentidadeContracheque(permissao.usuarioId) : null;
  if (!identidade) return <div className="rounded-xl border bg-card p-8"><h1 className="text-xl font-bold">Meu Contracheque</h1><p className="mt-3 text-sm text-muted-foreground">Não foi encontrado um vínculo ativo de servidor, órgão e unidade para esta consulta.</p></div>;

  const params = await searchParams;
  const contexto = { matricula: identidade.matricula, orgaoId: identidade.orgaoId };
  let competencias: string[] = [], erro: string | null = null;
  try { competencias = (await listarCompetenciasContrachequeSarh(contexto)).map(c => c.competencia); }
  catch { erro = "Não foi possível atualizar a lista de competências no momento."; }
  const competencia = params.competencia ? normalizarCompetenciaContracheque(params.competencia) : competencias[0] ?? normalizarCompetenciaContracheque();
  let historico: ContrachequeHistorico[] = [], documentos: ContrachequeDocumento[] = [], historicoDisponivel = false;
  let contracheque: ContrachequeDados | null = null;
  try {
    historico = await listarHistoricoContrachequeSarh({ ...contexto, competencia });
    historicoDisponivel = true;
    documentos = historico.filter(d => d.competencia === competencia);
  } catch {
    erro = "Não foi possível carregar o histórico do SARH. Você ainda pode tentar consultar a competência selecionada.";
    try { documentos = await listarDocumentosContrachequeSarh({ ...contexto, competencia }); } catch { /* No invented rows on source failure. */ }
  }
  const selecionado = documentos.find(d => d.id === params.documento) ?? documentos[0] ?? null;
  if (selecionado) {
    try { contracheque = await buscarContrachequeSarh({ ...contexto, competencia, documentoId: selecionado.id }); }
    catch { erro = "Não foi possível carregar o demonstrativo selecionado no SARH. Tente novamente em instantes."; }
  }
  const temRubricas = Boolean(contracheque?.rubricas.length);
  return <div className="space-y-3"><Breadcrumb items={[{ label: "Meu contracheque" }]} />
    <ContrachequePainel competencia={competencia} competencias={competencias} identidade={{ ...identidade,
      nome: contracheque?.cabecalho.nome || identidade.nome, lotacao: contracheque?.cabecalho.lotacao || identidade.lotacao }}
      documentos={(historicoDisponivel ? historico : documentos.map(d => ({ ...d, totais: null }))).map(d => ({
        id: d.id, competencia: d.competencia, descricao: d.descricao, data: d.chaveFolha.toISOString(), totais: d.totais,
      }))} selecionadoId={selecionado?.id ?? null} totais={temRubricas ? contracheque!.totais : null}
      margem={contracheque?.margemConsignavel ?? null} historicoDisponivel={historicoDisponivel} erro={erro}>
      {contracheque && temRubricas ? <ContrachequePrevia contracheque={contracheque} /> : <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-indigo-200 p-8 text-center text-sm text-muted-foreground">{contracheque ? "O documento foi localizado, mas não foram retornadas rubricas para conferência." : `Nenhum demonstrativo disponível para visualização em ${rotuloCompetenciaContracheque(competencia)}. Selecione outra competência ou documento no histórico.`}</div>}
    </ContrachequePainel>
  </div>;
}
