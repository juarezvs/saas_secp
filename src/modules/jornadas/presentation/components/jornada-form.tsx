"use client";

import { useActionState } from "react";
import { Loader2, Save } from "lucide-react";
import {
  tiposJornada,
  type JornadaFormState,
} from "../../application/schemas/jornada.schema";

type JornadaFormProps = {
  action: (
    state: JornadaFormState,
    formData: FormData
  ) => Promise<JornadaFormState>;
  valoresIniciais?: {
    codigo?: string;
    nome?: string;
    descricao?: string | null;
    tipo?: string;
    cargaDiariaMinutos?: number;
    exigeIntervalo?: boolean;
    intervaloMinimoMinutos?: number | null;
    intervaloMaximoMinutos?: number | null;
    horarioEntradaPadrao?: string | null;
    horarioSaidaPadrao?: string | null;
    horarioDiferenciadoPermitido?: boolean;
    entradaMinimaDiferenciada?: string | null;
    saidaMaximaDiferenciada?: string | null;
    ativo?: boolean;
  };
  modo: "criar" | "editar";
};

const estadoInicial: JornadaFormState = {
  sucesso: false,
  mensagem: null,
};

const rotulosTipo: Record<string, string> = {
  SETE_HORAS: "7 horas",
  OITO_HORAS: "8 horas",
  ESPECIAL: "Especial",
};

function erro(estado: JornadaFormState, campo: string) {
  return estado.erros?.[campo]?.[0];
}

export function JornadaForm({
  action,
  valoresIniciais,
  modo,
}: JornadaFormProps) {
  const [estado, formAction, pendente] = useActionState(action, estadoInicial);
  const campos = estado.campos ?? valoresIniciais;

  return (
    <form action={formAction} className="space-y-6">
      {estado.mensagem && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {estado.mensagem}
        </div>
      )}

      <section className="rounded-xl border bg-[var(--card)] p-6 text-[var(--card-foreground)] shadow-sm">
        <h2 className="text-lg font-bold">Dados da jornada</h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="codigo" className="text-sm font-semibold">
              Código
            </label>
            <input
              id="codigo"
              name="codigo"
              defaultValue={campos?.codigo ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm uppercase outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              placeholder="JORNADA_7H"
              required
            />
            {erro(estado, "codigo") && (
              <p className="text-sm text-red-600">{erro(estado, "codigo")}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="nome" className="text-sm font-semibold">
              Nome
            </label>
            <input
              id="nome"
              name="nome"
              defaultValue={campos?.nome ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            />
            {erro(estado, "nome") && (
              <p className="text-sm text-red-600">{erro(estado, "nome")}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="tipo" className="text-sm font-semibold">
              Tipo
            </label>
            <select
              id="tipo"
              name="tipo"
              defaultValue={campos?.tipo ?? "SETE_HORAS"}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            >
              {tiposJornada.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {rotulosTipo[tipo] ?? tipo}
                </option>
              ))}
            </select>
            {erro(estado, "tipo") && (
              <p className="text-sm text-red-600">{erro(estado, "tipo")}</p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="cargaDiariaMinutos" className="text-sm font-semibold">
              Carga diária em minutos
            </label>
            <input
              id="cargaDiariaMinutos"
              name="cargaDiariaMinutos"
              type="number"
              min={60}
              max={720}
              defaultValue={campos?.cargaDiariaMinutos ?? 420}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              required
            />
            {erro(estado, "cargaDiariaMinutos") && (
              <p className="text-sm text-red-600">
                {erro(estado, "cargaDiariaMinutos")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="horarioEntradaPadrao" className="text-sm font-semibold">
              Entrada padrão
            </label>
            <input
              id="horarioEntradaPadrao"
              name="horarioEntradaPadrao"
              type="time"
              defaultValue={campos?.horarioEntradaPadrao ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="horarioSaidaPadrao" className="text-sm font-semibold">
              Saída padrão
            </label>
            <input
              id="horarioSaidaPadrao"
              name="horarioSaidaPadrao"
              type="time"
              defaultValue={campos?.horarioSaidaPadrao ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
          </div>

          <label className="flex items-center gap-3 rounded-lg border bg-[var(--muted)] p-4 text-sm">
            <input
              type="checkbox"
              name="exigeIntervalo"
              defaultChecked={campos?.exigeIntervalo ?? false}
              className="size-4 rounded border-slate-300"
            />
            <span>
              <span className="block font-semibold">Exige intervalo</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                Obrigatório para jornada de 8 horas.
              </span>
            </span>
          </label>

          <label className="flex items-center gap-3 rounded-lg border bg-[var(--muted)] p-4 text-sm">
            <input
              type="checkbox"
              name="horarioDiferenciadoPermitido"
              defaultChecked={campos?.horarioDiferenciadoPermitido ?? false}
              className="size-4 rounded border-slate-300"
            />
            <span>
              <span className="block font-semibold">Permite horário diferenciado</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                Usado em hipóteses excepcionais autorizadas.
              </span>
            </span>
          </label>

          <div className="space-y-2">
            <label htmlFor="intervaloMinimoMinutos" className="text-sm font-semibold">
              Intervalo mínimo
            </label>
            <input
              id="intervaloMinimoMinutos"
              name="intervaloMinimoMinutos"
              type="number"
              defaultValue={campos?.intervaloMinimoMinutos ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              placeholder="60"
            />
            {erro(estado, "intervaloMinimoMinutos") && (
              <p className="text-sm text-red-600">
                {erro(estado, "intervaloMinimoMinutos")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="intervaloMaximoMinutos" className="text-sm font-semibold">
              Intervalo máximo
            </label>
            <input
              id="intervaloMaximoMinutos"
              name="intervaloMaximoMinutos"
              type="number"
              defaultValue={campos?.intervaloMaximoMinutos ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
              placeholder="180"
            />
            {erro(estado, "intervaloMaximoMinutos") && (
              <p className="text-sm text-red-600">
                {erro(estado, "intervaloMaximoMinutos")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="entradaMinimaDiferenciada" className="text-sm font-semibold">
              Entrada mínima diferenciada
            </label>
            <input
              id="entradaMinimaDiferenciada"
              name="entradaMinimaDiferenciada"
              type="time"
              defaultValue={campos?.entradaMinimaDiferenciada ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="saidaMaximaDiferenciada" className="text-sm font-semibold">
              Saída máxima diferenciada
            </label>
            <input
              id="saidaMaximaDiferenciada"
              name="saidaMaximaDiferenciada"
              type="time"
              defaultValue={campos?.saidaMaximaDiferenciada ?? ""}
              className="h-11 w-full rounded-md border bg-[var(--card)] px-3 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="descricao" className="text-sm font-semibold">
              Descrição
            </label>
            <textarea
              id="descricao"
              name="descricao"
              defaultValue={campos?.descricao ?? ""}
              rows={4}
              className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-800/20"
            />
          </div>

          <label className="flex items-center gap-3 rounded-lg border bg-[var(--muted)] p-4 text-sm">
            <input
              type="checkbox"
              name="ativo"
              defaultChecked={campos?.ativo ?? true}
              className="size-4 rounded border-slate-300"
            />
            <span>
              <span className="block font-semibold">Jornada ativa</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                Jornadas inativas não devem ser atribuídas a novos servidores.
              </span>
            </span>
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pendente}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pendente ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {modo === "criar" ? "Criar jornada" : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}