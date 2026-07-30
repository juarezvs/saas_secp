import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileSignature,
  GitBranch,
  Save,
  ShieldCheck,
} from "lucide-react";

import { salvarProcedimentosFrequenciaAction } from "../../application/actions/salvar-procedimentos-frequencia.action";
import { coberturaProcedimentoFrequencia } from "../../application/services/procedimentos-frequencia.service";

type ProcedimentoFrequenciaFormItem = {
  id: string;
  codigo: string;
  nome: string;
  categoria: string;
  objetivoFinal: string;
  descricao: string | null;
  fundamentoNormativo: string | null;
  requerProcessoSei: boolean;
  requerCienciaGestor: boolean;
  requerAutoridade: boolean;
  requerAnexo: boolean;
  permiteBancoAberto: boolean;
  permiteBancoFechado: boolean;
  preservaHistoricoOriginal: boolean;
  permiteRecalculo: boolean;
  permiteLancamentoCompetenciaPosterior: boolean;
  mesesRetroatividadeLivre: number;
  permissaoExecutar: string | null;
  permissaoAutorizar: string | null;
  efeitosEsperados: unknown;
  checklist: unknown;
  ativo: boolean;
};

type ProcedimentosFrequenciaFormProps = {
  orgao: {
    id: string;
    sigla: string;
    nome: string;
  };
  procedimentos: ProcedimentoFrequenciaFormItem[];
};

const etapasResumo = [
  {
    titulo: "Objetivo",
    descricao: "Efeito final de negócio",
    Icone: GitBranch,
  },
  {
    titulo: "Exigências",
    descricao: "SEI, ciência e autoridade",
    Icone: FileSignature,
  },
  {
    titulo: "Efeitos",
    descricao: "Banco, recálculo e histórico",
    Icone: ClipboardCheck,
  },
  {
    titulo: "Permissões",
    descricao: "Quem executa e autoriza",
    Icone: ShieldCheck,
  },
];

function textoArray(valor: unknown) {
  return Array.isArray(valor)
    ? valor.filter((item): item is string => typeof item === "string")
    : [];
}

function rotuloCategoria(categoria: string) {
  return categoria
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function BadgeCobertura({ categoria }: { categoria: string }) {
  const cobertura = coberturaProcedimentoFrequencia(categoria);
  const classe =
    cobertura.nivel === "atendido"
      ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
      : cobertura.nivel === "parcial"
        ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
        : "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200";

  return (
    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${classe}`}>
      {cobertura.nivel === "atendido"
        ? "Atendido"
        : cobertura.nivel === "parcial"
          ? "Parcial"
          : "Parametrizável"}
    </span>
  );
}

function CheckboxParametro({
  id,
  name,
  label,
  defaultChecked,
}: {
  id: string;
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex min-h-11 items-center gap-2 rounded-md border bg-[var(--muted)] px-3 py-2 text-xs font-semibold">
      <input
        type="checkbox"
        name={`${name}-${id}`}
        defaultChecked={defaultChecked}
        className="size-4 rounded border-slate-300"
      />
      {label}
    </label>
  );
}

function ResumoConfiguracao() {
  return (
    <aside className="rounded-lg border bg-[var(--card)] p-4 shadow-sm lg:sticky lg:top-24">
      <p className="text-sm font-bold">Fluxo de configuração</p>
      <ol className="mt-4 space-y-4">
        {etapasResumo.map((etapa, index) => {
          const Icone = etapa.Icone;

          return (
            <li key={etapa.titulo} className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-blue-900 text-white">
                <Icone className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">
                  {index + 1}. {etapa.titulo}
                </span>
                <span className="block text-xs text-[var(--muted-foreground)]">
                  {etapa.descricao}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

export function ProcedimentosFrequenciaForm({
  orgao,
  procedimentos,
}: ProcedimentosFrequenciaFormProps) {
  return (
    <form action={salvarProcedimentosFrequenciaAction} className="space-y-5">
      <input type="hidden" name="orgaoId" value={orgao.id} />

      <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <ResumoConfiguracao />

        <section className="rounded-lg border bg-[var(--card)] shadow-sm">
          <div className="border-b p-5">
            <h2 className="text-lg font-bold">
              Procedimentos administrativos - {orgao.sigla}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Parametrize o efeito final de cada procedimento. A configuração
              vale somente para este órgão.
            </p>
          </div>

          <ol className="divide-y">
            {procedimentos.map((procedimento, index) => {
              const cobertura = coberturaProcedimentoFrequencia(
                procedimento.categoria,
              );
              const efeitos = textoArray(procedimento.efeitosEsperados);
              const checklist = textoArray(procedimento.checklist);
              const ultimo = index === procedimentos.length - 1;

              return (
                <li key={procedimento.id} className="relative grid gap-4 p-5 md:grid-cols-[3rem_minmax(0,1fr)]">
                  <div className="relative hidden justify-center md:flex">
                    {!ultimo ? (
                      <span
                        className="absolute left-1/2 top-12 h-[calc(100%+1.25rem)] w-px -translate-x-1/2 bg-border"
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="relative z-[1] flex size-10 items-center justify-center rounded-full border-4 border-[var(--card)] bg-blue-900 text-sm font-black text-white shadow-sm">
                      {index + 1}
                    </span>
                  </div>

                  <article>
                    <input
                      type="hidden"
                      name="procedimentoId"
                      value={procedimento.id}
                    />

                    <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-slate-950/40">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex md:hidden size-8 items-center justify-center rounded-full bg-blue-900 text-xs font-black text-white">
                              {index + 1}
                            </span>
                            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {procedimento.codigo}
                            </span>
                            <BadgeCobertura categoria={procedimento.categoria} />
                            {procedimento.ativo ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                                Ativo
                              </span>
                            ) : null}
                          </div>

                          <label className="mt-3 block space-y-2">
                            <span className="text-sm font-semibold">
                              Nome apresentado ao usuário
                            </span>
                            <input
                              name={`nome-${procedimento.id}`}
                              defaultValue={procedimento.nome}
                              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                            />
                          </label>
                        </div>

                        <label className="flex items-center gap-2 rounded-md border bg-[var(--muted)] px-3 py-2 text-sm font-semibold">
                          <input
                            type="checkbox"
                            name={`ativo-${procedimento.id}`}
                            defaultChecked={procedimento.ativo}
                            className="size-4 rounded border-slate-300"
                          />
                          Ativo
                        </label>
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                        <div className="space-y-4">
                          <label className="block space-y-2">
                            <span className="text-sm font-semibold">
                              Objetivo final de negócio
                            </span>
                            <textarea
                              name={`objetivoFinal-${procedimento.id}`}
                              defaultValue={procedimento.objetivoFinal}
                              rows={3}
                              className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                            />
                          </label>

                          <label className="block space-y-2">
                            <span className="text-sm font-semibold">
                              Orientação operacional
                            </span>
                            <textarea
                              name={`descricao-${procedimento.id}`}
                              defaultValue={procedimento.descricao ?? ""}
                              rows={3}
                              className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                            />
                          </label>

                          <label className="block space-y-2">
                            <span className="text-sm font-semibold">
                              Fundamento normativo da seccional
                            </span>
                            <input
                              name={`fundamentoNormativo-${procedimento.id}`}
                              defaultValue={procedimento.fundamentoNormativo ?? ""}
                              placeholder="Portaria, resolução, despacho ou ato aplicável"
                              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                            />
                          </label>
                        </div>

                        <aside className="rounded-lg border bg-[var(--muted)] p-4">
                          <p className="text-sm font-bold">
                            Cobertura atual: {rotuloCategoria(procedimento.categoria)}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                            {cobertura.descricao}
                          </p>

                          <div className="mt-4 space-y-3">
                            <div>
                              <p className="text-xs font-bold uppercase text-[var(--muted-foreground)]">
                                Efeitos esperados
                              </p>
                              <ul className="mt-2 space-y-1 text-sm">
                                {efeitos.map((efeito) => (
                                  <li key={efeito} className="flex gap-2">
                                    <ArrowRight
                                      className="mt-0.5 size-4 shrink-0 text-blue-800"
                                      aria-hidden="true"
                                    />
                                    <span>{efeito}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <p className="text-xs font-bold uppercase text-[var(--muted-foreground)]">
                                Checklist
                              </p>
                              <ul className="mt-2 space-y-1 text-sm">
                                {checklist.map((item) => (
                                  <li key={item} className="flex gap-2">
                                    <ClipboardCheck
                                      className="mt-0.5 size-4 shrink-0 text-green-700"
                                      aria-hidden="true"
                                    />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </aside>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <CheckboxParametro
                          id={procedimento.id}
                          name="requerProcessoSei"
                          label="Exige processo SEI"
                          defaultChecked={procedimento.requerProcessoSei}
                        />
                        <CheckboxParametro
                          id={procedimento.id}
                          name="requerCienciaGestor"
                          label="Exige ciência do gestor"
                          defaultChecked={procedimento.requerCienciaGestor}
                        />
                        <CheckboxParametro
                          id={procedimento.id}
                          name="requerAutoridade"
                          label="Exige autoridade"
                          defaultChecked={procedimento.requerAutoridade}
                        />
                        <CheckboxParametro
                          id={procedimento.id}
                          name="requerAnexo"
                          label="Exige anexo/documento"
                          defaultChecked={procedimento.requerAnexo}
                        />
                        <CheckboxParametro
                          id={procedimento.id}
                          name="permiteBancoAberto"
                          label="Permite banco aberto"
                          defaultChecked={procedimento.permiteBancoAberto}
                        />
                        <CheckboxParametro
                          id={procedimento.id}
                          name="permiteBancoFechado"
                          label="Permite banco fechado"
                          defaultChecked={procedimento.permiteBancoFechado}
                        />
                        <CheckboxParametro
                          id={procedimento.id}
                          name="preservaHistoricoOriginal"
                          label="Preserva histórico"
                          defaultChecked={procedimento.preservaHistoricoOriginal}
                        />
                        <CheckboxParametro
                          id={procedimento.id}
                          name="permiteRecalculo"
                          label="Permite recálculo"
                          defaultChecked={procedimento.permiteRecalculo}
                        />
                        <CheckboxParametro
                          id={procedimento.id}
                          name="permiteLancamentoCompetenciaPosterior"
                          label="Lança em competência posterior"
                          defaultChecked={
                            procedimento.permiteLancamentoCompetenciaPosterior
                          }
                        />

                        <label className="space-y-2">
                          <span className="text-sm font-semibold">
                            Retroatividade livre
                          </span>
                          <span className="block text-xs text-[var(--muted-foreground)]">
                            Meses antes de exigir autoridade reforçada.
                          </span>
                          <input
                            name={`mesesRetroatividadeLivre-${procedimento.id}`}
                            type="number"
                            min={0}
                            max={120}
                            defaultValue={procedimento.mesesRetroatividadeLivre}
                            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-sm font-semibold">
                            Permissão para executar
                          </span>
                          <span className="block text-xs text-[var(--muted-foreground)]">
                            Código de permissão exigido na rotina.
                          </span>
                          <input
                            name={`permissaoExecutar-${procedimento.id}`}
                            defaultValue={procedimento.permissaoExecutar ?? ""}
                            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 font-mono text-xs outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-sm font-semibold">
                            Permissão para autorizar
                          </span>
                          <span className="block text-xs text-[var(--muted-foreground)]">
                            Código de permissão para decisão administrativa.
                          </span>
                          <input
                            name={`permissaoAutorizar-${procedimento.id}`}
                            defaultValue={procedimento.permissaoAutorizar ?? ""}
                            className="h-11 w-full rounded-md border bg-[var(--card)] px-3 font-mono text-xs outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
                          />
                        </label>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <button
          type="submit"
          className="inline-flex h-11 items-center gap-2 rounded-md bg-blue-900 px-5 text-sm font-bold text-white shadow-lg transition hover:bg-blue-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900"
        >
          <Save className="size-4" aria-hidden="true" />
          Salvar procedimentos
        </button>
      </div>
    </form>
  );
}
