import { salvarRegulamentacaoPontoAction } from "@/modules/regulamentacao-ponto/application/actions/salvar-regulamentacao-ponto.action";
import { REGULAMENTACAO_PONTO_PADRAO } from "@/modules/regulamentacao-ponto/application/services/regulamentacao-ponto.service";

type OrgaoFormulario = {
  id: string;
  sigla: string;
  nome: string;
};

type RegrasFormulario = {
  ativo?: boolean;
  orgaoId?: string | null;
  numeroPortaria?: string | null;
  descricao?: string | null;
  limiteCreditoMensalMinutos: number;
  mesesExpiracaoCompensacao: number;
  toleranciaCreditoMinutos: number;
  toleranciaDebitoMinutos: number;
  jornada7hCreditoMinimoMinutos: number;
  jornada7hIntervaloMinimoMinutos: number;
  exigeAutorizacaoPreviaCredito: boolean;
  horasForaExpedienteInconsistente: boolean;
};

type RegulamentacaoPontoFormProps = {
  orgao: OrgaoFormulario;
  regras?: RegrasFormulario | null;
};

export function RegulamentacaoPontoForm({
  orgao,
  regras,
}: RegulamentacaoPontoFormProps) {
  const hoje = new Date();
  const valores = regras ?? REGULAMENTACAO_PONTO_PADRAO;
  const configuracaoAtiva =
    "ativo" in valores && typeof valores.ativo === "boolean"
      ? valores.ativo
      : true;

  return (
    <form
      action={salvarRegulamentacaoPontoAction}
      className="rounded-lg border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm"
    >
      <input type="hidden" name="orgaoId" value={orgao.id} />

      <div className="flex flex-col gap-2 border-b pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-bold">
            {orgao.sigla} - {orgao.nome}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            As alteracoes afetam somente servidores vinculados a este orgao.
          </p>
        </div>

        <label className="inline-flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="ativo"
            defaultChecked={configuracaoAtiva}
            className="size-4 rounded border-slate-300"
          />
          Usar estas regras para este orgao
        </label>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold">
            Referência normativa
          </span>
          <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
            Informe a portaria, ato, resolucao ou norma que fundamenta estas
            regras.
          </span>
          <input
            name="numeroPortaria"
            defaultValue={valores.numeroPortaria ?? ""}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold">
            Limite mensal de credito no banco de horas
          </span>
          <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
            Quantidade maxima de minutos que o servidor pode acumular como
            credito em uma competencia.
          </span>
          <input
            name="limiteCreditoMensalMinutos"
            type="number"
            min={0}
            max={6000}
            defaultValue={valores.limiteCreditoMensalMinutos}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold">
            Prazo para compensacao do credito
          </span>
          <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
            Numero de meses em que o credito autorizado permanece disponivel
            para uso.
          </span>
          <input
            name="mesesExpiracaoCompensacao"
            type="number"
            min={1}
            max={24}
            defaultValue={valores.mesesExpiracaoCompensacao}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold">
            Tolerancia minima para gerar credito
          </span>
          <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
            Minutos excedentes abaixo deste valor sao ignorados e nao entram no
            banco de horas.
          </span>
          <input
            name="toleranciaCreditoMinutos"
            type="number"
            min={0}
            max={120}
            defaultValue={valores.toleranciaCreditoMinutos}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold">
            Tolerancia minima para registrar debito
          </span>
          <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
            Faltas de minutos abaixo deste valor sao desconsideradas na
            apuracao.
          </span>
          <input
            name="toleranciaDebitoMinutos"
            type="number"
            min={0}
            max={120}
            defaultValue={valores.toleranciaDebitoMinutos}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold">
            Minimo trabalhado para gerar credito em jornada de 7h
          </span>
          <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
            Total de minutos trabalhados no dia para que excedente de jornada
            de 7h seja considerado credito.
          </span>
          <input
            name="jornada7hCreditoMinimoMinutos"
            type="number"
            min={420}
            max={720}
            defaultValue={valores.jornada7hCreditoMinimoMinutos}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold">
            Intervalo minimo exigido na jornada de 7h
          </span>
          <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
            Intervalo intrajornada, em minutos, exigido para validar o credito
            quando a jornada base for de 7h.
          </span>
          <input
            name="jornada7hIntervaloMinimoMinutos"
            type="number"
            min={0}
            max={180}
            defaultValue={valores.jornada7hIntervaloMinimoMinutos}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          />
        </label>

        <label className="flex items-center gap-3 rounded-md border bg-[var(--muted)] p-4 text-sm">
          <input
            type="checkbox"
            name="exigeAutorizacaoPreviaCredito"
            defaultChecked={valores.exigeAutorizacaoPreviaCredito}
            className="size-4 rounded border-slate-300"
          />
          <span>
            <span className="block font-semibold">
              Exigir autorizacao previa para credito
            </span>
            <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
              O excedente so entra no banco de horas quando houver autorizacao
              deferida.
            </span>
          </span>
        </label>

        <label className="flex items-center gap-3 rounded-md border bg-[var(--muted)] p-4 text-sm">
          <input
            type="checkbox"
            name="horasForaExpedienteInconsistente"
            defaultChecked={valores.horasForaExpedienteInconsistente}
            className="size-4 rounded border-slate-300"
          />
          <span>
            <span className="block font-semibold">
              Sinalizar marcacao fora do expediente
            </span>
            <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
              Marca como inconsistente quando o horario registrado estiver fora
              da regra de expediente aplicavel.
            </span>
          </span>
        </label>

        <label className="space-y-2 md:col-span-2 xl:col-span-4">
          <span className="text-sm font-semibold">
            Observacoes sobre a regra do orgao
          </span>
          <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
            Use este campo para resumir excecoes, fundamentos ou orientacoes de
            aplicacao.
          </span>
          <textarea
            name="descricao"
            defaultValue={valores.descricao ?? ""}
            rows={3}
            className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-4 border-t pt-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-3 sm:grid-cols-[9rem_9rem_auto]">
          <label className="space-y-2">
            <span className="text-xs font-semibold">
              Ano da competencia a recalcular
            </span>
            <input
              name="anoReferencia"
              type="number"
              min={2020}
              max={2100}
              defaultValue={hoje.getFullYear()}
              className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold">
              Mes da competencia a recalcular
            </span>
            <input
              name="mesReferencia"
              type="number"
              min={1}
              max={12}
              defaultValue={hoje.getMonth() + 1}
              className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
            />
          </label>

          <label className="flex items-center gap-3 rounded-md border bg-[var(--muted)] px-4 py-3 text-sm">
            <input
              type="checkbox"
              name="recalcularCompetencia"
              className="size-4 rounded border-slate-300"
            />
            <span>
              <span className="block font-semibold">
                Recalcular esta competencia ao salvar
              </span>
              <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
                Reprocessa espelho e banco de horas apenas dos servidores deste
                orgao.
              </span>
            </span>
          </label>
        </div>

        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-md bg-blue-900 px-5 text-sm font-semibold text-white transition hover:bg-blue-950"
        >
          Salvar regras do orgao
        </button>
      </div>
    </form>
  );
}
