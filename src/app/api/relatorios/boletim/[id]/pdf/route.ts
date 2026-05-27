import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { buscarDadosBoletimPdf } from "@/modules/relatorios/infrastructure/repositories/relatorios.repository";
import { BoletimFrequenciaPdfDocument } from "@/modules/relatorios/presentation/pdf/boletim-frequencia-pdf.document";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();

  const permissoes = session?.user.perfilAtivo?.permissoes ?? [];

  const podeExportar =
    permissoes.includes("relatorios:exportar:global") ||
    permissoes.includes("boletim-frequencia:consultar:global") ||
    permissoes.includes("boletim-frequencia:gerar:chefia");

  if (!podeExportar) {
    return new Response("Acesso negado.", {
      status: 403,
    });
  }

  const { id } = await context.params;
  const boletim = await buscarDadosBoletimPdf(id);

  if (!boletim) {
    return new Response("Boletim não encontrado.", {
      status: 404,
    });
  }

  const buffer = await renderToBuffer(
    <BoletimFrequenciaPdfDocument boletim={boletim} />,
  );

  const nomeArquivo = `boletim-frequencia-${boletim.unidade.sigla}-${String(
    boletim.mesReferencia,
  ).padStart(2, "0")}-${boletim.anoReferencia}.pdf`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Cache-Control": "no-store",
    },
  });
}