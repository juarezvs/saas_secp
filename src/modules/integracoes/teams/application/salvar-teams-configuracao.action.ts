"use server";

import { revalidatePath } from "next/cache";

import { exigirPermissao } from "@/modules/auth/application/services/permissao.service";

import { TEAMS_PERMISSOES } from "../domain/teams-permissoes";
import { atualizarTeamsConfiguracao } from "./teams-configuracao.service";

export type TeamsConfiguracaoFormState = {
  sucesso: boolean;
  mensagem: string | null;
};

export async function salvarTeamsConfiguracaoAction(
  _estadoAnterior: TeamsConfiguracaoFormState,
  formData: FormData,
): Promise<TeamsConfiguracaoFormState> {
  const permissao = await exigirPermissao(TEAMS_PERMISSOES.configurar);

  await atualizarTeamsConfiguracao(
    {
      ativo: formData.get("ativo") === "on",
      ambiente: String(formData.get("ambiente") ?? "desenvolvimento") as never,
      microsoftAppId: String(formData.get("microsoftAppId") ?? ""),
      microsoftAppSecret: String(formData.get("microsoftAppSecret") ?? ""),
      tenantId: String(formData.get("tenantId") ?? ""),
      botEndpoint: String(formData.get("botEndpoint") ?? ""),
      messagingEndpoint: String(formData.get("messagingEndpoint") ?? ""),
      urlPublicaSecp: String(formData.get("urlPublicaSecp") ?? ""),
      politicaEnvioNotificacoes: String(
        formData.get("politicaEnvioNotificacoes") ?? "somente_vinculados",
      ) as never,
      botConversacionalAtivo: formData.get("botConversacionalAtivo") === "on",
      notificacoesAtivas: formData.get("notificacoesAtivas") === "on",
      adaptiveCardsAtivos: formData.get("adaptiveCardsAtivos") === "on",
      abasTeamsAtivas: formData.get("abasTeamsAtivas") === "on",
      registroPontoAtivo: formData.get("registroPontoAtivo") === "on",
      consultaBancoHorasAtiva: formData.get("consultaBancoHorasAtiva") === "on",
      aprovacoesAtivas: formData.get("aprovacoesAtivas") === "on",
      homologacoesAtivas: formData.get("homologacoesAtivas") === "on",
    },
    permissao.usuarioId,
  );

  revalidatePath("/administracao/integracoes/teams");

  return {
    sucesso: true,
    mensagem: "Integração Microsoft Teams atualizada com sucesso.",
  };
}
