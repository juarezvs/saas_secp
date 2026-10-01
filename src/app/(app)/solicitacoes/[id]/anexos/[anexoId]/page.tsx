import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { SolicitacaoAnexoPdfPageViewer } from "@/modules/solicitacoes/presentation/components/solicitacao-anexo-pdf-page-viewer";

type SolicitacaoAnexoPageProps = {
  params: Promise<{
    id: string;
    anexoId: string;
  }>;
};

export default async function SolicitacaoAnexoPage({
  params,
}: SolicitacaoAnexoPageProps) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "solicitacoes:consultar:proprio",
    "solicitacoes:visualizar:proprio",
    "solicitacoes:analisar:chefia",
    "solicitacoes:consultar:global",
  ]);

  const { id, anexoId } = await params;

  return (
    <SolicitacaoAnexoPdfPageViewer
      apiUrl={`/api/solicitacoes/${id}/anexos/${anexoId}`}
    />
  );
}
