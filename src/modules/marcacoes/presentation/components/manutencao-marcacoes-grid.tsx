"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Loader2, Save, X } from "lucide-react";

import { salvarCelulaMarcacaoManutencaoAction } from "../../application/actions/manutencao-marcacoes-grid.action";
import type {
  CelulaMarcacaoManutencao,
  LinhaMarcacaoManutencao,
} from "../../infrastructure/repositories/manutencao-marcacoes.repository";

type ManutencaoMarcacoesGridProps = {
  servidorId: string;
  linhas: LinhaMarcacaoManutencao[];
};

const rotulos = [
  "1ª Ent.",
  "1ª Sai.",
  "2ª Ent.",
  "2ª Sai.",
  "3ª Ent.",
  "3ª Sai.",
];

function celulaKey(dataReferencia: string, coluna: number) {
  return `${dataReferencia}:${coluna}`;
}

export function ManutencaoMarcacoesGrid({
  servidorId,
  linhas,
}: ManutencaoMarcacoesGridProps) {
  const [linhasAtuais, setLinhasAtuais] = useState(linhas);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [salvando, startTransition] = useTransition();
  const [celulaAtiva, setCelulaAtiva] = useState<string | null>(null);
  const [celulaSalvando, setCelulaSalvando] = useState<string | null>(null);
  const [celulasSalvas, setCelulasSalvas] = useState<Record<string, boolean>>(
    {},
  );
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const timersFeedback = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );

  useEffect(() => {
    const timers = timersFeedback.current;

    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  function valorCelula(
    linha: LinhaMarcacaoManutencao,
    celula: CelulaMarcacaoManutencao | null,
    coluna: number,
  ) {
    const chave = celulaKey(linha.dataReferencia, coluna);

    return valores[chave] ?? celula?.hora ?? "";
  }

  function atualizarLinha(
    dataReferencia: string,
    coluna: number,
    marcacao: CelulaMarcacaoManutencao | null,
  ) {
    setLinhasAtuais((atuais) =>
      atuais.map((linha) => {
        if (linha.dataReferencia !== dataReferencia) {
          return linha;
        }

        return {
          ...linha,
          marcacoes: linha.marcacoes.map((item, indice) =>
            indice === coluna ? marcacao : item,
          ),
        };
      }),
    );
  }

  function marcarCelulaSalva(chave: string) {
    setCelulasSalvas((atuais) => ({ ...atuais, [chave]: true }));
    clearTimeout(timersFeedback.current[chave]);
    timersFeedback.current[chave] = setTimeout(() => {
      setCelulasSalvas((atuais) => {
        const copia = { ...atuais };
        delete copia[chave];
        return copia;
      });
      delete timersFeedback.current[chave];
    }, 2500);
  }

  function localizarCelula(chave: string) {
    const [dataReferencia, colunaTexto] = chave.split(":");
    const coluna = Number(colunaTexto);
    const linha = linhasAtuais.find(
      (item) => item.dataReferencia === dataReferencia,
    );

    if (!linha || !Number.isInteger(coluna)) {
      return null;
    }

    return {
      linha,
      coluna,
      marcacao: linha.marcacoes[coluna] ?? null,
    };
  }

  function salvarAlteracoes() {
    const alteracoes = Object.entries(valores);

    if (alteracoes.length === 0 || salvando) {
      return;
    }

    setErro(null);
    setSucesso(null);

    startTransition(async () => {
      let salvas = 0;

      try {
        for (const [chave, hora] of alteracoes) {
          const celula = localizarCelula(chave);

          if (!celula) {
            continue;
          }

          setCelulaSalvando(chave);

          const resposta = await salvarCelulaMarcacaoManutencaoAction({
            servidorId,
            marcacaoId: celula.marcacao?.id ?? null,
            dataReferencia: celula.linha.dataReferencia,
            coluna: celula.coluna,
            hora,
          });

          atualizarLinha(
            celula.linha.dataReferencia,
            celula.coluna,
            resposta.marcacao
              ? {
                  id: resposta.marcacao.id,
                  hora: resposta.marcacao.hora,
                  tipo: resposta.marcacao.tipo,
                }
              : null,
          );
          setValores((atuais) => {
            const copia = { ...atuais };
            delete copia[chave];
            return copia;
          });
          marcarCelulaSalva(chave);
          salvas += 1;
        }

        setSucesso(
          salvas === 1 ? "1 marcação salva." : `${salvas} marcações salvas.`,
        );
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Nao foi possivel salvar as marcacoes.",
        );
      } finally {
        setCelulaSalvando(null);
      }
    });
  }

  const totalAlteracoes = Object.keys(valores).length;

  return (
    <div className="space-y-3">
      <div className="flex min-h-6 items-center justify-end text-xs font-semibold">
        {salvando && (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            Salvando
          </span>
        )}
        {!salvando && sucesso && (
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <Check className="size-3" aria-hidden="true" />
            {sucesso}
          </span>
        )}
        {!salvando && erro && (
          <span className="inline-flex items-center gap-1 text-destructive">
            <X className="size-3" aria-hidden="true" />
            {erro}
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/70 text-xs uppercase text-muted-foreground">
                <th className="w-28 px-3 py-3 text-left font-black">Dia</th>
                {rotulos.map((rotulo) => (
                  <th
                    key={rotulo}
                    className="w-28 border-l border-border px-2 py-3 text-center font-black"
                  >
                    {rotulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhasAtuais.map((linha) => (
                <tr
                  key={linha.dataReferencia}
                  className="border-b border-border last:border-b-0 hover:bg-muted/35"
                >
                  <td className="whitespace-nowrap px-3 py-2 font-semibold text-foreground">
                    {linha.dia} - {linha.diaSemana}
                  </td>
                  {linha.marcacoes.map((marcacao, coluna) => {
                    const chave = celulaKey(linha.dataReferencia, coluna);
                    const ativo = celulaAtiva === chave;
                    const alterada = valores[chave] !== undefined;
                    const bloqueada = salvando;
                    const mostrandoCheck = Boolean(celulasSalvas[chave]);
                    const mostrandoSpinner = celulaSalvando === chave;

                    return (
                      <td
                        key={chave}
                        className="border-l border-border p-1.5 align-middle"
                      >
                        <div className="relative">
                          <input
                            type="time"
                            aria-label={`${rotulos[coluna]} de ${linha.dia}`}
                            step={60}
                            placeholder="--:--"
                            value={valorCelula(linha, marcacao, coluna)}
                            disabled={bloqueada}
                            onFocus={() => setCelulaAtiva(chave)}
                            onChange={(event) =>
                              setValores((atuais) => ({
                                ...atuais,
                                [chave]: event.target.value,
                              }))
                            }
                            onKeyDown={(event) => {
                              if (event.key !== "Enter") {
                                return;
                              }

                              event.preventDefault();
                              event.currentTarget.blur();
                            }}
                            className={[
                              "h-9 w-full rounded-md border bg-background px-2 pr-8 text-center font-mono text-sm font-semibold outline-none transition",
                              ativo
                                ? "border-[var(--secp-theme-accent)] ring-2 ring-[var(--secp-theme-accent-soft)]"
                                : "border-transparent hover:border-border",
                              alterada
                                ? "border-amber-500 bg-amber-50 text-amber-950"
                                : "",
                              mostrandoCheck
                                ? "border-emerald-500 bg-emerald-50 text-emerald-950"
                                : "",
                              bloqueada ? "opacity-60" : "",
                            ].join(" ")}
                          />
                          {mostrandoSpinner && (
                            <Loader2
                              className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
                              aria-hidden="true"
                            />
                          )}
                          {!mostrandoSpinner && mostrandoCheck && (
                            <Check
                              className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-emerald-700"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalAlteracoes > 0 && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-2xl">
          <span className="text-sm font-bold text-foreground">
            {totalAlteracoes} alteração{totalAlteracoes > 1 ? "es" : ""}{" "}
            pendente{totalAlteracoes > 1 ? "s" : ""}
          </span>
          <button
            type="button"
            onClick={salvarAlteracoes}
            disabled={salvando}
            className="secp-theme-primary-action inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-black shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {salvando ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            Salvar
          </button>
        </div>
      )}
    </div>
  );
}
