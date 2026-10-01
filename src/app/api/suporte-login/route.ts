import { NextRequest, NextResponse } from "next/server";

import { obterUrlSuporteLogin } from "@/modules/suporte/application/services/suporte-login-config.service";

export async function GET(request: NextRequest) {
  const matricula = request.nextUrl.searchParams.get("matricula");
  const url = await obterUrlSuporteLogin({ matricula });

  return NextResponse.redirect(url);
}
