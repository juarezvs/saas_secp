import { NextResponse, type NextRequest } from "next/server";
import {
  buscarFotoServidorSarh,
  normalizarCpfFoto,
} from "@/modules/servidores/application/services/foto-servidor.service";

type FotoServidorRouteParams = {
  params: Promise<{
    cpf: string;
  }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: FotoServidorRouteParams,
) {
  const { cpf } = await params;
  const cpfNormalizado = normalizarCpfFoto(cpf);

  if (!cpfNormalizado) {
    return new NextResponse(null, { status: 400 });
  }

  const foto = await buscarFotoServidorSarh(cpfNormalizado);

  if (!foto) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="#e2e8f0"/><circle cx="48" cy="36" r="16" fill="#64748b"/><path d="M22 82c4-16 17-26 26-26s22 10 26 26" fill="#64748b"/></svg>`;

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "private, max-age=86400",
      },
    });
  }

  return new NextResponse(new Uint8Array(foto.buffer), {
    headers: {
      "Content-Type": foto.contentType,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
