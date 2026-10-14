"use server";

import { revalidatePath } from "next/cache";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { processarCompetenciaShadow } from "../services/processar-competencia-shadow.service";

const PATH = "/administracao/mct/validacao";

export async function processarCompetenciaShadowAction(input: { matricula: string; competencia: string }) {
  const acesso = await exigirUmaDasPermissoesOuRedirecionar(["mct-configuracao:gerenciar:seccional", "mct-configuracao:gerenciar:global"]);
  if (process.env.NODE_ENV === "production") throw new Error("O processamento em lote pela interface está bloqueado em produção durante o piloto.");
  const resultado = await processarCompetenciaShadow({ matricula: input.matricula, competencia: input.competencia, orgaoIdsPermitidos: acesso.perfilAtivoEscopoGlobal ? null : acesso.orgaoIds ?? [] });
  revalidatePath(PATH);
  return resultado;
}
