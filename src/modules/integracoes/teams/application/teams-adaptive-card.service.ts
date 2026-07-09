export function criarTeamsCardMenuPrincipal() {
  return {
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      {
        type: "TextBlock",
        text: "SECP",
        weight: "Bolder",
        size: "Large",
      },
      {
        type: "TextBlock",
        text: "Escolha uma opção para consultar seu ponto, banco de horas ou solicitações.",
        wrap: true,
      },
    ],
    actions: [
      {
        type: "Action.Submit",
        title: "Meu ponto",
        data: { comando: "meu ponto" },
      },
      {
        type: "Action.Submit",
        title: "Banco de horas",
        data: { comando: "banco de horas" },
      },
      {
        type: "Action.Submit",
        title: "Minhas solicitações",
        data: { comando: "minhas solicitações" },
      },
      { type: "Action.Submit", title: "Ajuda", data: { comando: "ajuda" } },
    ],
  };
}

export function criarTeamsCardConfirmacaoRegistroPonto(params: {
  dataHora: string;
  origem: string;
}) {
  return {
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      {
        type: "TextBlock",
        text: "Registro de ponto recebido",
        weight: "Bolder",
        size: "Medium",
      },
      {
        type: "FactSet",
        facts: [
          { title: "Data/hora", value: params.dataHora },
          { title: "Origem", value: params.origem },
        ],
      },
    ],
  };
}

export function criarTeamsCardResumo(titulo: string, mensagem: string) {
  return {
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      { type: "TextBlock", text: titulo, weight: "Bolder", size: "Medium" },
      { type: "TextBlock", text: mensagem, wrap: true },
    ],
  };
}
