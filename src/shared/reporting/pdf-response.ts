import React, { type FunctionComponent, type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";

type PdfResponseParams = {
  document: ReactElement<DocumentProps>;
  filename: string;
};

export async function criarPdfResponse({
  document,
  filename,
}: PdfResponseParams) {
  const buffer = await renderToBuffer(document);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function criarElementoPdf<TProps extends object>(
  component: FunctionComponent<TProps>,
  props: TProps,
) {
  return React.createElement(component, props) as ReactElement<DocumentProps>;
}
