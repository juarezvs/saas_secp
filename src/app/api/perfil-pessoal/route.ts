import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { perfilPessoalSchema } from "@/modules/perfil-pessoal/application/perfil-pessoal.schema";
import { atualizarPerfilPessoalSarh, obterPerfilPessoalSarh } from "@/modules/perfil-pessoal/application/perfil-pessoal.service";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ mensagem: "Não autenticado." }, { status: 401 });
  try {
    return NextResponse.json(await obterPerfilPessoalSarh(session.user.matricula), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ mensagem: error instanceof Error ? error.message : "Falha ao consultar o SARH." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ mensagem: "Não autenticado." }, { status: 401 });
  const parsed = perfilPessoalSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ mensagem: parsed.error.issues[0]?.message ?? "Dados inválidos.", erros: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  try {
    await atualizarPerfilPessoalSarh({ matricula: session.user.matricula, usuarioId: session.user.id, dados: parsed.data });
    return NextResponse.json({ sucesso: true, confirmado: true, mensagem: "Dados atualizados no SARH." });
  } catch (error) {
    return NextResponse.json({ mensagem: error instanceof Error ? error.message : "Falha ao atualizar o SARH." }, { status: 500 });
  }
}
