import Image from "next/image";
import { Clock, IdCard, MapPin } from "lucide-react";

import type {
  ServidorMinhaEquipe,
  StatusPresencaEquipe,
} from "../../infrastructure/repositories/minha-equipe.repository";

type MinhaEquipeGridProps = {
  servidores: ServidorMinhaEquipe[];
};

const statusConfig: Record<
  StatusPresencaEquipe,
  { label: string; titulo: string; card: string; badge: string; column: string }
> = {
  PRESENTE: {
    label: "Presente",
    titulo: "Presentes",
    card: "border-green-500 ring-2 ring-green-100 dark:ring-green-950",
    badge: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    column:
      "border-green-200 bg-green-50/45 dark:border-green-900 dark:bg-green-950/20",
  },
  AUSENTE: {
    label: "Ausente",
    titulo: "Ausentes",
    card: "border-red-500 ring-2 ring-red-100 dark:ring-red-950",
    badge: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
    column:
      "border-red-200 bg-red-50/45 dark:border-red-900 dark:bg-red-950/20",
  },
  AFASTADO: {
    label: "Licença/afastamento",
    titulo: "Licenças",
    card: "border-orange-500 ring-2 ring-orange-100 dark:ring-orange-950",
    badge:
      "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    column:
      "border-orange-200 bg-orange-50/45 dark:border-orange-900 dark:bg-orange-950/20",
  },
};
const colunas: StatusPresencaEquipe[] = ["PRESENTE", "AUSENTE", "AFASTADO"];

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join("");
}

function fotoUrl(cpf: string | null) {
  const normalizado = cpf?.replace(/\D/g, "").padStart(11, "0").slice(-11);

  return normalizado && normalizado.length === 11
    ? `/api/servidores/foto/${normalizado}`
    : null;
}

export function MinhaEquipeGrid({ servidores }: MinhaEquipeGridProps) {
  if (servidores.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
        Nenhum servidor subordinado encontrado para os filtros informados.
      </div>
    );
  }

  const servidoresPorStatus = new Map(
    colunas.map((status) => [
      status,
      servidores
        .filter((servidor) => servidor.status === status)
        .sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }),
        ),
    ]),
  );

  function renderizarCard(servidor: ServidorMinhaEquipe) {
    const config = statusConfig[servidor.status];
    const foto = fotoUrl(servidor.cpf);

    return (
      <article
        key={servidor.id}
        className={`rounded-md border bg-card p-4 shadow-card ${config.card}`}
      >
        <div className="flex gap-4">
          <div className="secp-theme-icon relative size-16 shrink-0 overflow-hidden rounded-full ring-1 ring-border">
            {foto ? (
              <Image
                src={foto}
                alt={`Foto de ${servidor.nome}`}
                width={64}
                height={64}
                unoptimized
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-base font-black">
                {iniciais(servidor.nome)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="min-w-0 text-base font-bold leading-6">
                {servidor.nome}
              </h2>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${config.badge}`}
              >
                {config.label}
              </span>
            </div>

            <div className="mt-2 grid gap-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <IdCard className="size-3.5" aria-hidden="true" />
                {servidor.matricula}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="size-3.5" aria-hidden="true" />
                {servidor.unidadeSigla} · {servidor.unidadeNome}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="size-3.5" aria-hidden="true" />
                {servidor.detalheStatus}
              </span>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {colunas.map((status) => {
        const config = statusConfig[status];
        const itens = servidoresPorStatus.get(status) ?? [];

        return (
          <section
            key={status}
            className={`rounded-md border p-4 shadow-card ${config.column}`}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">{config.titulo}</h2>
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${config.badge}`}
              >
                {itens.length}
              </span>
            </div>

            <div className="grid gap-4">
              {itens.map(renderizarCard)}
              {itens.length === 0 && (
                <div className="rounded-md border border-dashed border-border bg-card/70 p-6 text-center text-sm text-muted-foreground">
                  Nenhum servidor nesta situação.
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
