import Link from "next/link";
import { Eye } from "lucide-react";

import { Card } from "@/components/ui";
import type { ContrachequeDocumento } from "../../domain/contracheque.types";
import { formatarDataDocumentoContracheque } from "../../application/services/formatar-contracheque.service";

type ContrachequeDocumentosListaProps = {
  competencia: string;
  documentos: ContrachequeDocumento[];
};

function hrefDocumento(competencia: string, documentoId: string) {
  const query = new URLSearchParams({
    competencia,
    documento: documentoId,
  });

  return `/meu-contracheque?${query.toString()}`;
}

export function ContrachequeDocumentosLista({
  competencia,
  documentos,
}: ContrachequeDocumentosListaProps) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-bold">Documentos encontrados</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Selecione o demonstrativo que deseja visualizar.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground dark:bg-slate-950/50">
            <tr>
              <th className="px-4 py-2">Data</th>
              <th className="px-4 py-2 text-center">Seq</th>
              <th className="px-4 py-2">Descrição</th>
              <th className="px-4 py-2 text-center">Visualizar</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {documentos.map((documento) => (
              <tr key={documento.id}>
                <td className="whitespace-nowrap px-4 py-2 font-medium">
                  {formatarDataDocumentoContracheque(documento.chaveFolha)}
                </td>
                <td className="px-4 py-2 text-center">{documento.sequpa}</td>
                <td className="min-w-96 px-4 py-2">{documento.descricao}</td>
                <td className="px-4 py-2 text-center">
                  <Link
                    href={hrefDocumento(competencia, documento.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-blue-900 hover:bg-blue-50"
                    title="Visualizar contracheque"
                    aria-label="Visualizar contracheque"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
