import { NextResponse } from "next/server";

import { processarMensagemTeams } from "@/modules/integracoes/teams/application/teams-bot.service";
import { registrarTeamsLog } from "@/modules/integracoes/teams/application/teams-configuracao.service";

export const runtime = "nodejs";

function possuiBearerBotFramework(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return /^Bearer\s+[\w.-]+$/i.test(authorization);
}

export async function POST(request: Request) {
  if (!possuiBearerBotFramework(request)) {
    await registrarTeamsLog({
      tipo: "BOT",
      direcao: "ENTRADA",
      evento: "AUTH_BOT_FRAMEWORK_AUSENTE",
      sucesso: false,
      erro: "Cabeçalho Authorization Bearer ausente.",
    });

    return NextResponse.json(
      { erro: "Autenticação do Bot Framework ausente." },
      { status: 401 },
    );
  }

  const activity = await request.json().catch(() => null);

  if (!activity || typeof activity !== "object") {
    return NextResponse.json({ erro: "Payload inválido." }, { status: 400 });
  }

  const resposta = await processarMensagemTeams(activity);
  return NextResponse.json(resposta);
}
