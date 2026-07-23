import { CompetenciaInput } from "@/components/ui";
import { salvarRegulamentacaoPontoAction } from "@/modules/regulamentacao-ponto/application/actions/salvar-regulamentacao-ponto.action";
import { REGULAMENTACAO_PONTO_PADRAO } from "@/modules/regulamentacao-ponto/application/services/regulamentacao-ponto.service";
import { RegulamentacaoPontoSubmitButton } from "./regulamentacao-ponto-submit-button";

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
  jornada7hCargoComissionadoCreditoMinimoMinutos: number;
  jornada7hIntervaloMinimoMinutos: number;
  jornada7hCreditoExigeIntervalo: boolean;
  expedientePadraoInicio: string;
  expedientePadraoFim: string;
  entradaMinimaPermitida: string;
  saidaMaximaPermitida: string;
  prazoHomologacaoDiaMesSeguinte: number;
  prazoAjustePontoDiaMesSeguinte: number;
  percentualCreditoSabado: number;
  percentualCreditoDomingoFeriado: number;
  percentualCreditoRecesso: number;
  recessoIgnoraLimiteMensal: boolean;
  exigeAutorizacaoPreviaCredito: boolean;
  horasForaExpedienteInconsistente: boolean;
};

type RegulamentacaoPontoFormProps = {
  orgao: OrgaoFormulario;
  regras?: RegrasFormulario | null;
};

function competenciaAtual() {
  const hoje = new Date();

  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

function formatarMinutosComoHora(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  return `${String(horas).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

export function RegulamentacaoPontoForm({
  orgao,
  regras,
}: RegulamentacaoPontoFormProps) {
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
            As alterações afetam somente servidores vinculados a este órgão.
          </p>
        </div>

        <label className="inline-flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="ativo"
            defaultChecked={configuracaoAtiva}
            className="size-4 rounded border-slate-300"
          />
          Usar estas regras para este órgão
        </label>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-semibold">Referência normativa</span>
          <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
            Informe a portaria, ato, resolução ou norma que fundamenta estas
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
            Limite mensal de crédito no banco de horas
          </span>
          <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
            Quantidade máxima de minutos que o servidor pode acumular como
            crédito em uma competência.
          </span>
          <input
            name="limiteCreditoMensalMinutos"
            type="text"
            inputMode="numeric"
            pattern="\d{2,3}:[0-5]\d"
            minLength={5}
            maxLength={6}
            placeholder="hh:mm"
            title="Informe no formato hh:mm."
            defaultValue={formatarMinutosComoHora(
              valores.limiteCreditoMensalMinutos,
            )}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 font-mono text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold">
            Prazo para compensação do crédito
          </span>
          <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
            Número de meses em que o crédito autorizado permanece disponível
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
            Tolerância mínima para gerar crédito
          </span>
          <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
            Minutos excedentes abaixo deste valor são ignorados e não entram no
            banco de horas.
          </span>
          <input
            name="toleranciaCreditoMinutos"
            type="text"
            inputMode="numeric"
            pattern="\d{2,3}:[0-5]\d"
            minLength={5}
            maxLength={6}
            placeholder="hh:mm"
            title="Informe no formato hh:mm."
            defaultValue={formatarMinutosComoHora(
              valores.toleranciaCreditoMinutos,
            )}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 font-mono text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold">
            Tolerância mínima para registrar débito
          </span>
          <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
            Faltas de minutos abaixo deste valor são desconsideradas na
            apuração.
          </span>
          <input
            name="toleranciaDebitoMinutos"
            type="text"
            inputMode="numeric"
            pattern="\d{2,3}:[0-5]\d"
            minLength={5}
            maxLength={6}
            placeholder="hh:mm"
            title="Informe no formato hh:mm."
            defaultValue={formatarMinutosComoHora(
              valores.toleranciaDebitoMinutos,
            )}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 font-mono text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold">
            Mínimo trabalhado para gerar crédito em jornada de 7h
          </span>
          <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
            Total de minutos trabalhados no dia para que excedente de jornada de
            7h seja considerado crédito.
          </span>
          <input
            name="jornada7hCreditoMinimoMinutos"
            type="text"
            inputMode="numeric"
            pattern="\d{2,3}:[0-5]\d"
            minLength={5}
            maxLength={6}
            placeholder="hh:mm"
            title="Informe no formato hh:mm."
            defaultValue={formatarMinutosComoHora(
              valores.jornada7hCreditoMinimoMinutos,
            )}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 font-mono text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold">
            Intervalo mínimo exigido na jornada de 7h
          </span>
          <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
            Intervalo intrajornada, em minutos, exigido para validar o crédito
            quando a jornada-base for de 7h.
          </span>
          <input
            name="jornada7hIntervaloMinimoMinutos"
            type="text"
            inputMode="numeric"
            pattern="\d{2,3}:[0-5]\d"
            minLength={5}
            maxLength={6}
            placeholder="hh:mm"
            title="Informe no formato hh:mm."
            defaultValue={formatarMinutosComoHora(
              valores.jornada7hIntervaloMinimoMinutos,
            )}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 font-mono text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold">
            Mínimo para FC/CJ em jornada de 7h
          </span>
          <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
            Tempo a partir do qual ocupantes de FC/CJ geram crédito quando
            cumprem jornada de 7h.
          </span>
          <input
            name="jornada7hCargoComissionadoCreditoMinimoMinutos"
            type="text"
            inputMode="numeric"
            pattern="\d{2,3}:[0-5]\d"
            minLength={5}
            maxLength={6}
            placeholder="hh:mm"
            title="Informe no formato hh:mm."
            defaultValue={formatarMinutosComoHora(
              valores.jornada7hCargoComissionadoCreditoMinimoMinutos,
            )}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 font-mono text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold">Expediente padrão</span>
          <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
            Janela ordinária usada para apurar tempo dentro do expediente.
          </span>
          <div className="grid grid-cols-2 gap-2">
            <input
              name="expedientePadraoInicio"
              type="time"
              defaultValue={valores.expedientePadraoInicio}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 font-mono text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
            <input
              name="expedientePadraoFim"
              type="time"
              defaultValue={valores.expedientePadraoFim}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 font-mono text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
          </div>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold">
            Janela permitida para flexibilização
          </span>
          <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
            Limites mínimo e máximo para horário diferenciado ou compensação.
          </span>
          <div className="grid grid-cols-2 gap-2">
            <input
              name="entradaMinimaPermitida"
              type="time"
              defaultValue={valores.entradaMinimaPermitida}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 font-mono text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
            <input
              name="saidaMaximaPermitida"
              type="time"
              defaultValue={valores.saidaMaximaPermitida}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 font-mono text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
          </div>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold">Prazo de homologação</span>
          <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
            Dia do mês subsequente para encerramento da homologação.
          </span>
          <input
            name="prazoHomologacaoDiaMesSeguinte"
            type="number"
            min={1}
            max={31}
            defaultValue={valores.prazoHomologacaoDiaMesSeguinte}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold">
            Prazo para ajuste de ponto
          </span>
          <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
            Dia do mês subsequente até o qual a correção de marcação fica
            permitida.
          </span>
          <input
            name="prazoAjustePontoDiaMesSeguinte"
            type="number"
            min={1}
            max={31}
            defaultValue={valores.prazoAjustePontoDiaMesSeguinte}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold">
            Acréscimo para sábado (%)
          </span>
          <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
            Percentual somado ao tempo trabalhado em sábados autorizados.
          </span>
          <input
            name="percentualCreditoSabado"
            type="number"
            min={0}
            max={300}
            defaultValue={valores.percentualCreditoSabado}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold">
            Acréscimo para domingo/feriado (%)
          </span>
          <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
            Percentual somado ao tempo trabalhado em domingos e feriados.
          </span>
          <input
            name="percentualCreditoDomingoFeriado"
            type="number"
            min={0}
            max={300}
            defaultValue={valores.percentualCreditoDomingoFeriado}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold">
            Acréscimo para recesso (%)
          </span>
          <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
            Percentual somado ao tempo trabalhado em recesso forense.
          </span>
          <input
            name="percentualCreditoRecesso"
            type="number"
            min={0}
            max={300}
            defaultValue={valores.percentualCreditoRecesso}
            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
          />
        </label>

        <label className="flex items-center gap-3 rounded-md border bg-[var(--muted)] p-4 text-sm">
          <input
            type="checkbox"
            name="jornada7hCreditoExigeIntervalo"
            defaultChecked={valores.jornada7hCreditoExigeIntervalo}
            className="size-4 rounded border-slate-300"
          />
          <span>
            <span className="block font-semibold">
              Exigir intervalo para crédito na jornada de 7h
            </span>
            <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
              Quando desmarcado, o excedente da jornada de 7h pode gerar
              crédito sem intervalo.
            </span>
          </span>
        </label>

        <label className="flex items-center gap-3 rounded-md border bg-[var(--muted)] p-4 text-sm">
          <input
            type="checkbox"
            name="recessoIgnoraLimiteMensal"
            defaultChecked={valores.recessoIgnoraLimiteMensal}
            className="size-4 rounded border-slate-300"
          />
          <span>
            <span className="block font-semibold">
              Recesso não se submete ao teto mensal
            </span>
            <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
              Mantém separada a regra especial de recesso forense.
            </span>
          </span>
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
              Exigir autorização prévia para crédito
            </span>
            <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
              O excedente só entra no banco de horas quando houver autorização
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
              Sinalizar marcação fora do expediente
            </span>
            <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
              Marca como inconsistente quando o horário registrado estiver fora
              da regra de expediente aplicável.
            </span>
          </span>
        </label>

        <label className="space-y-2 md:col-span-2 xl:col-span-4">
          <span className="text-sm font-semibold">
            Observações sobre a regra do órgão
          </span>
          <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
            Use este campo para resumir exceções, fundamentos ou orientações de
            aplicação.
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
        <div className="grid gap-3 sm:grid-cols-[minmax(14rem,18rem)_auto] sm:items-end">
          <CompetenciaInput
            name="competencia"
            label="Competência a recalcular"
            defaultValue={competenciaAtual()}
          />

          <label className="flex items-center gap-3 rounded-md border bg-[var(--muted)] px-4 py-3 text-sm">
            <input
              type="checkbox"
              name="recalcularCompetencia"
              className="size-4 rounded border-slate-300"
            />
            <span>
              <span className="block font-semibold">
                Recalcular esta competência ao salvar
              </span>
              <span className="block text-xs leading-5 text-[var(--muted-foreground)]">
                Reprocessa espelho e banco de horas apenas dos servidores deste
                órgão. O processamento continua em segundo plano mesmo se você
                sair desta tela.
              </span>
            </span>
          </label>
        </div>

        <RegulamentacaoPontoSubmitButton />
      </div>
    </form>
  );
}
