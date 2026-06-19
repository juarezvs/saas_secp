import Link from "next/link";
import { FileCheck2 } from "lucide-react";

import { Card } from "@/components/ui";

type FrequenciaMesResumoProps = {
  resumo: {
    mes: string;
    diasUteis: number;
    regular: number;
    pendente: number;
    falta: number;
    recesso: number;
    aguardando: number;
  };
};

function percentual(valor: number, total: number) {
  return total > 0 ? Math.round((valor / total) * 100) : 0;
}

function montarGradiente(resumo: FrequenciaMesResumoProps["resumo"]) {
  const total =
    resumo.regular +
    resumo.pendente +
    resumo.falta +
    resumo.recesso +
    resumo.aguardando;

  if (total === 0) {
    return "#d1d5db";
  }

  const segmentos = [
    ["var(--secp-green-700)", resumo.regular],
    ["var(--secp-warning)", resumo.pendente],
    ["var(--secp-danger)", resumo.falta],
    ["#d1d5db", resumo.recesso],
    ["var(--secp-info)", resumo.aguardando],
  ] as const;
  let cursor = 0;

  return `conic-gradient(${segmentos
    .filter(([, valor]) => valor > 0)
    .map(([cor, valor]) => {
      const inicio = cursor;
      cursor += (valor / total) * 100;
      return `${cor} ${inicio}% ${cursor}%`;
    })
    .join(", ")})`;
}

const mesesPorNome: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

function normalizarChaveMes(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatarMesReferenciaTitulo(mes: string) {
  return mes.replace(/\s+de\s+/i, "/").toLocaleUpperCase("pt-BR");
}

function montarHrefEspelho(mes: string) {
  const match = mes.trim().match(/^([a-zA-ZÀ-ÿ]+)(?:\s+de\s+|\/)(\d{4})$/i);

  if (!match) {
    return "/espelho-ponto";
  }

  const mesReferencia = mesesPorNome[normalizarChaveMes(match[1])];

  if (!mesReferencia) {
    return "/espelho-ponto";
  }

  return `/espelho-ponto?competencia=${match[2]}-${String(mesReferencia).padStart(2, "0")}`;
}

export function FrequenciaMesResumo({ resumo }: FrequenciaMesResumoProps) {
  const total =
    resumo.regular +
    resumo.pendente +
    resumo.falta +
    resumo.recesso +
    resumo.aguardando;
  const regularPercent = percentual(resumo.regular + resumo.aguardando, total);
  const mesReferenciaTitulo = formatarMesReferenciaTitulo(resumo.mes);
  const espelhoHref = montarHrefEspelho(resumo.mes);

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">
          Frequência mês {mesReferenciaTitulo}
        </h2>
        <Link
          href="/espelho-ponto"
          className="rounded-sm text-xs font-semibold text-secp-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Ver espelho
        </Link>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[5.25rem_1fr] sm:items-center">
        <div
          className="grid aspect-square place-items-center rounded-full p-3"
          style={{ background: montarGradiente(resumo) }}
        >
          <div className="grid size-full place-items-center rounded-full bg-card text-center">
            <div>
              <p className="text-xl font-bold leading-none">
                {resumo.diasUteis}
              </p>
              <p className="mt-0.5 text-[10px] leading-none text-muted-foreground">
                dias úteis
              </p>
            </div>
          </div>
        </div>

        <dl className="grid gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
          <Linha label="Regulares" valor={resumo.regular} cor="bg-secp-green-700" href={espelhoHref} />
          <Linha label="Pendências" valor={resumo.pendente} cor="bg-secp-warning" href="/solicitacoes" />
          <Linha label="Faltas" valor={resumo.falta} cor="bg-secp-danger" href={espelhoHref} />
          <Linha label="Sem expediente" valor={resumo.recesso} cor="bg-slate-300" href={espelhoHref} />
          <Linha label="Aguardando homologação" valor={resumo.aguardando} cor="bg-secp-info" href={espelhoHref} />
        </dl>
      </div>

      <div className="mt-3 flex gap-2 rounded-md bg-muted p-2 text-xs leading-5">
        <FileCheck2
          className="mt-0.5 size-4 shrink-0 text-secp-blue-700"
          aria-hidden="true"
        />
        <p>
          <strong>Status:</strong> {regularPercent}% dos dias apurados estão
          regulares ou aguardando homologação.
        </p>
      </div>
    </Card>
  );
}

function Linha({
  label,
  valor,
  cor,
  href,
}: {
  label: string;
  valor: number;
  cor: string;
  href?: string;
}) {
  const conteudo = (
    <>
      <span className={`size-2 rounded-full ${cor}`} aria-hidden="true" />
      <span className="font-bold text-foreground">{valor}</span>
      <span className="truncate">{label}</span>
    </>
  );

  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="min-w-0 text-muted-foreground">
        {href && valor > 0 ? (
          <Link
            href={href}
            className="flex min-w-0 items-center gap-1.5 rounded-sm hover:text-secp-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label={`Ver ${valor} ${label.toLowerCase()}`}
          >
            {conteudo}
          </Link>
        ) : (
          <span className="flex min-w-0 items-center gap-1.5">
            {conteudo}
          </span>
        )}
      </dd>
    </div>
  );
}
