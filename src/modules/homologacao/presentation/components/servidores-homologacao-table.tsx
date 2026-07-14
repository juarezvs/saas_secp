import { validarMovimentosBancoHorasHomologacaoAction } from "../../application/actions/validar-movimentos-banco-horas.action";
import {
  classeStatusHomologacao,
  minutosParaHoraHomologacao,
  rotuloStatusHomologacaoServidor,
} from "../../application/services/formatar-homologacao.service";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import { HomologarServidorForm } from "./homologar-servidor-form";
import { PendenciasHomologacaoCard } from "./pendencias-homologacao-card";

type ServidorHomologacaoItem = {
  id: string;
  servidorId: string;
  status: string;
  cargaPrevistaMinutos: number;
  minutosTrabalhados: number;
  minutosCredito: number;
  minutosDebito: number;
  faltas: number;
  saldoBancoAntesMinutos: number;
  saldoBancoDepoisMinutos: number | null;
  pendencias: unknown;
  homologadoEm: Date | null;
  homologadoPor: {
    nome: string;
  } | null;
  servidor: {
    matricula: string;
    nomeFuncional?: string | null;
    usuario: {
      nome: string;
    };
    lotacoes: {
      unidade: {
        sigla: string;
      };
    }[];
  };
};

export function ServidoresHomologacaoTable({
  fechamentoId,
  anoReferencia,
  mesReferencia,
  servidores,
  podeRegistrarDecisao,
  servidorIdsPermitidosDecisao,
  assinatura,
}: {
  fechamentoId: string;
  anoReferencia: number;
  mesReferencia: number;
  servidores: ServidorHomologacaoItem[];
  podeRegistrarDecisao: boolean;
  servidorIdsPermitidosDecisao?: string[];
  assinatura?: {
    orgao?: string | null;
    assinante?: string | null;
    cargoFuncoes?: string[];
  };
}) {
  const servidoresPermitidos = servidorIdsPermitidosDecisao
    ? new Set(servidorIdsPermitidosDecisao)
    : null;

  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="border-b p-5">
        <h2 className="text-lg font-bold">Servidores para homologação</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Valide pendências, banco de horas e registre a decisão da chefia.
        </p>
      </div>

      <div className="divide-y">
        {servidores.map((item) => {
          const estaHomologado = [
            "HOMOLOGADO",
            "HOMOLOGADO_COM_RESSALVA",
          ].includes(item.status);
          const podeRegistrarDecisaoServidor =
            podeRegistrarDecisao &&
            !estaHomologado &&
            (!servidoresPermitidos ||
              servidoresPermitidos.has(item.servidorId));
          const pendencias = Array.isArray(item.pendencias)
            ? (item.pendencias as {
                tipo: string;
                descricao: string;
                quantidade?: number;
                minutos?: number;
              }[])
            : [];

          return (
            <article key={item.id} className="space-y-4 p-5">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div>
                  <p className="font-semibold">{nomeServidor(item.servidor)}</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Matrícula: {item.servidor.matricula} • Lotação:{" "}
                    {item.servidor.lotacoes[0]?.unidade.sigla ?? "-"}
                  </p>
                </div>

                <span
                  className={`w-fit rounded-full px-2 py-1 text-xs font-semibold ${classeStatusHomologacao(
                    item.status,
                  )}`}
                >
                  {rotuloStatusHomologacaoServidor(item.status)}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-6">
                <Resumo
                  label="Previsto"
                  value={minutosParaHoraHomologacao(item.cargaPrevistaMinutos)}
                />
                <Resumo
                  label="Trabalhado"
                  value={minutosParaHoraHomologacao(item.minutosTrabalhados)}
                />
                <Resumo
                  label="Crédito"
                  value={minutosParaHoraHomologacao(item.minutosCredito)}
                />
                <Resumo
                  label="Débito"
                  value={minutosParaHoraHomologacao(item.minutosDebito)}
                />
                <Resumo label="Faltas" value={String(item.faltas)} />
                <Resumo
                  label="Banco"
                  value={minutosParaHoraHomologacao(
                    item.saldoBancoDepoisMinutos ?? item.saldoBancoAntesMinutos,
                  )}
                />
              </div>

              <PendenciasHomologacaoCard pendencias={pendencias} />

              <div className="grid gap-4 lg:grid-cols-2">
                <form action={validarMovimentosBancoHorasHomologacaoAction}>
                  <input
                    type="hidden"
                    name="servidorId"
                    value={item.servidorId}
                  />
                  <input
                    type="hidden"
                    name="fechamentoId"
                    value={fechamentoId}
                  />
                  <input
                    type="hidden"
                    name="anoReferencia"
                    value={anoReferencia}
                  />
                  <input
                    type="hidden"
                    name="mesReferencia"
                    value={mesReferencia}
                  />

                  <button
                    type="submit"
                    className="w-full rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-[var(--muted)]"
                  >
                    Validar movimentos pendentes do banco
                  </button>
                </form>

                {estaHomologado ? (
                  <div className="rounded-lg border bg-green-50 p-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-100">
                    <p className="font-semibold">Espelho já homologado.</p>
                    <p className="mt-1">
                      {item.homologadoPor?.nome
                        ? `Homologado por ${item.homologadoPor.nome}.`
                        : "Responsável pela homologação não informado."}
                    </p>
                  </div>
                ) : podeRegistrarDecisaoServidor ? (
                  <HomologarServidorForm
                    homologacaoServidorId={item.id}
                    assinatura={assinatura}
                  />
                ) : (
                  <div className="rounded-lg border bg-[var(--muted)] p-4 text-sm text-[var(--muted-foreground)]">
                    Seu perfil ativo permite consultar esta homologação, mas não
                    registrar decisão da chefia.
                  </div>
                )}
              </div>
            </article>
          );
        })}

        {servidores.length === 0 && (
          <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
            Nenhum servidor encontrado para esta unidade no mês.
          </div>
        )}
      </div>
    </section>
  );
}

function Resumo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-[var(--muted)] p-3">
      <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}
