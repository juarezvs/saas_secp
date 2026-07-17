"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Label, Select } from "@/components/ui";
import type { ContrachequeDocumento } from "../../domain/contracheque.types";
import { formatarDataDocumentoContracheque } from "../../application/services/formatar-contracheque.service";

type ContrachequeDocumentoSelectProps = {
  competencia: string;
  documentos: ContrachequeDocumento[];
  documentoSelecionadoId: string;
};

function rotuloDocumento(documento: ContrachequeDocumento) {
  return `${formatarDataDocumentoContracheque(documento.chaveFolha)} - ${
    documento.descricao
  }`;
}

export function ContrachequeDocumentoSelect({
  competencia,
  documentos,
  documentoSelecionadoId,
}: ContrachequeDocumentoSelectProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pendente, iniciarTransicao] = useTransition();

  function selecionarDocumento(documentoId: string) {
    if (!documentoId || documentoId === documentoSelecionadoId) {
      return;
    }

    const query = new URLSearchParams(searchParams.toString());

    query.set("competencia", competencia);
    query.set("documento", documentoId);

    iniciarTransicao(() => {
      router.push(`${pathname}?${query.toString()}`);
    });
  }

  return (
    <div className="min-w-0 flex-1 space-y-2" aria-busy={pendente}>
      <Label htmlFor="contracheque-documento">Contracheque</Label>
      <Select
        id="contracheque-documento"
        value={documentoSelecionadoId}
        disabled={pendente}
        onChange={(event) => selecionarDocumento(event.target.value)}
        className="min-w-0"
      >
        {documentos.map((documento) => (
          <option key={documento.id} value={documento.id}>
            {rotuloDocumento(documento)}
          </option>
        ))}
      </Select>
      {pendente && (
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-secp-blue-700" />
        </div>
      )}
    </div>
  );
}
