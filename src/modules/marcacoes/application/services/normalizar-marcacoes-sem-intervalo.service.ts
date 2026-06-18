import type { Prisma } from "@/generated/prisma/client";

type MarcacaoSemIntervalo = {
  id: string;
  dataHora: Date;
  tipo: string;
  fonte: string;
};

type MarcacaoClient = Pick<Prisma.TransactionClient, "marcacao">;

const FONTES_IMPORTADAS = [
  "EQUIPAMENTO_BIOMETRICO",
  "AFD",
  "IMPORTACAO",
];

export async function normalizarMarcacoesSemIntervaloService(
  client: MarcacaoClient,
  marcacoes: MarcacaoSemIntervalo[],
) {
  const importadas = marcacoes
    .filter((marcacao) => FONTES_IMPORTADAS.includes(marcacao.fonte))
    .sort((a, b) => a.dataHora.getTime() - b.dataHora.getTime());

  if (importadas.length === 0) {
    return marcacoes;
  }

  const primeira = importadas[0];
  const segunda = importadas[1];
  const terceira = importadas[2];
  const ultima = importadas.at(-1);
  const tipos = new Map<
    string,
    "ENTRADA" | "SAIDA_INTERVALO" | "RETORNO_INTERVALO" | "SAIDA" | "MANUAL"
  >();

  for (const marcacao of importadas) {
    if (
      importadas.length >= 4 &&
      segunda &&
      terceira &&
      marcacao.id === segunda.id
    ) {
      tipos.set(marcacao.id, "SAIDA_INTERVALO");
      continue;
    }

    if (importadas.length >= 4 && terceira && marcacao.id === terceira.id) {
      tipos.set(marcacao.id, "RETORNO_INTERVALO");
      continue;
    }

    tipos.set(
      marcacao.id,
      marcacao.id === primeira.id
        ? "ENTRADA"
        : marcacao.id === ultima?.id
          ? "SAIDA"
          : "MANUAL",
    );
  }

  const alteradas = importadas.filter(
    (marcacao) => tipos.get(marcacao.id) !== marcacao.tipo,
  );

  if (alteradas.length > 0) {
    await Promise.all(
      alteradas.map((marcacao) =>
        client.marcacao.update({
          where: { id: marcacao.id },
          data: { tipo: tipos.get(marcacao.id) },
        }),
      ),
    );
  }

  return marcacoes.map((marcacao) => ({
    ...marcacao,
    tipo: tipos.get(marcacao.id) ?? marcacao.tipo,
  }));
}
