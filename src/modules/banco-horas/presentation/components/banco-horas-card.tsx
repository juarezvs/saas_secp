import { Banknote, Clock3, TrendingDown, TrendingUp } from "lucide-react";
import { minutosParaHoraBanco } from "../../application/services/formatar-banco-horas.service";

type BancoHorasCardProps = {
  saldo: {
    saldoMinutos: number;
    creditosValidadosMinutos: number;
    debitosValidadosMinutos: number;
    creditosPendentesMinutos: number;
    debitosPendentesMinutos: number;
    horasAcimaLimiteMinutos: number;
    horasNaoAutorizadasMinutos: number;
  } | null;
};

export function BancoHorasCard({ saldo }: BancoHorasCardProps) {
  const dados = saldo ?? {
    saldoMinutos: 0,
    creditosValidadosMinutos: 0,
    debitosValidadosMinutos: 0,
    creditosPendentesMinutos: 0,
    debitosPendentesMinutos: 0,
    horasAcimaLimiteMinutos: 0,
    horasNaoAutorizadasMinutos: 0,
  };

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card
        titulo="Saldo atual"
        valor={minutosParaHoraBanco(dados.saldoMinutos)}
        descricao="Créditos validados menos débitos validados."
        icon={Banknote}
      />

      <Card
        titulo="Créditos validados"
        valor={minutosParaHoraBanco(dados.creditosValidadosMinutos)}
        descricao="Horas efetivamente incorporadas ao banco."
        icon={TrendingUp}
      />

      <Card
        titulo="Débitos validados"
        valor={minutosParaHoraBanco(dados.debitosValidadosMinutos)}
        descricao="Horas negativas confirmadas."
        icon={TrendingDown}
      />

      <Card
        titulo="Pendências"
        valor={`${minutosParaHoraBanco(
          dados.creditosPendentesMinutos
        )} / ${minutosParaHoraBanco(dados.debitosPendentesMinutos)}`}
        descricao="Créditos e débitos pendentes de validação."
        icon={Clock3}
      />
    </section>
  );
}

function Card({
  titulo,
  valor,
  descricao,
  icon: Icon,
}: {
  titulo: string;
  valor: string;
  descricao: string;
  icon: typeof Banknote;
}) {
  return (
    <article className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--muted-foreground)]">
            {titulo}
          </p>
          <h3 className="mt-2 text-2xl font-bold">{valor}</h3>
        </div>

        <div className="rounded-lg bg-blue-50 p-3 text-blue-900 dark:bg-blue-950 dark:text-blue-200">
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
        {descricao}
      </p>
    </article>
  );
}