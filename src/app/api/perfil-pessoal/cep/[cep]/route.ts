import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";

const respostaViaCepSchema = z.object({
  erro: z.boolean().optional(),
  logradouro: z.string().default(""),
  complemento: z.string().default(""),
  bairro: z.string().default(""),
  localidade: z.string().default(""),
  uf: z.string().default(""),
});

export async function GET(_request: Request, context: { params: Promise<{ cep: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ mensagem: "Não autorizado." }, { status: 401 });
  const { cep: parametro } = await context.params;
  const cep = parametro.replace(/\D/g, "");
  if (!/^\d{8}$/.test(cep)) return NextResponse.json({ mensagem: "CEP inválido." }, { status: 400 });

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`ViaCEP respondeu ${response.status}.`);
    const dados = respostaViaCepSchema.parse(await response.json());
    if (dados.erro) return NextResponse.json({ mensagem: "CEP não encontrado." }, { status: 404 });
    return NextResponse.json({
      endereco: dados.logradouro,
      complemento: dados.complemento,
      bairro: dados.bairro,
      cidade: dados.localidade,
      uf: dados.uf,
    });
  } catch {
    return NextResponse.json({ mensagem: "Não foi possível consultar o CEP agora." }, { status: 502 });
  }
}
