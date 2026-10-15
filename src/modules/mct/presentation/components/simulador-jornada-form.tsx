"use client";

import { useState, useTransition } from "react";
import { Play, ShieldCheck, Timer } from "lucide-react";
import { simularJornadaMct } from "../../application/actions/simular-jornada-mct.action";

type Jornada = {
  id: string;
  codigo: string;
  nome: string;
  escalas: { id: string; nome: string }[];
};
type Resultado = {
  simulacao: true;
  efeitoOficial: false;
  configuracao: {
    id: string | null;
    modeloCodigo: string;
    status: string;
    provisoria: boolean;
  };
  politica: { codigo: string; nome: string; versao: number };
  referencia: { entrada: string; saida: string } | null;
  resultado: {
    resultadoJornada: Record<string, number | string | null>;
    resultadoConformidade: {
      possuiPendencias: boolean;
      fatos: { codigo: string; descricao: string }[];
    };
    classificacao: {
      aplicacoes: {
        rubricaCodigo: string;
        quantidade: number;
        status: string;
        explicacao?: string;
      }[];
      regrasExecutadas: string[];
    } | null;
    memoriaCalculo: Record<string, unknown>;
  };
};

function duracao(valor: unknown) {
  const minutos = Number(valor ?? 0);
  return `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, "0")}`;
}
function hora(valor: string) {
  return /^\d{2}:\d{2}$/.test(valor)
    ? valor
    : new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(valor));
}
const campo =
  "mt-1 h-10 w-full rounded border bg-background px-3 focus:border-primary focus:outline-none";

export function SimuladorJornadaForm({ jornadas }: { jornadas: Jornada[] }) {
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState("");
  const [jornadaId, setJornadaId] = useState("");
  const [pendente, iniciar] = useTransition();
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(340px,0.38fr)_minmax(0,0.62fr)]">
      <form
        className="rounded border bg-card p-4"
        onSubmit={(event) => {
          event.preventDefault();
          setErro("");
          const dados = new FormData(event.currentTarget);
          iniciar(async () => {
            try {
              const resposta = await simularJornadaMct({
                jornadaId: String(dados.get("jornadaId")),
                escalaId: String(dados.get("escalaId") ?? "") || undefined,
                data: String(dados.get("data")),
                marcacoes: String(dados.get("marcacoes")),
                ocorrencias: String(dados.get("ocorrencias") ?? ""),
                autorizacoes: String(dados.get("autorizacoes") ?? ""),
              });
              if (!resposta.sucesso) {
                setResultado(null);
                setErro(resposta.mensagem);
                return;
              }
              setResultado(resposta.dados as Resultado);
            } catch {
              setResultado(null);
              setErro("Não foi possível simular. Tente novamente.");
            }
          });
        }}
      >
        <h2 className="text-base font-semibold">Cenário</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Usa o núcleo real do MCT e nunca altera apuração, saldo ou
          homologação.
        </p>
        <div className="mt-4 space-y-4">
          <label className="block text-sm font-medium">
            Horário de trabalho
            <select
              name="jornadaId"
              required
              value={jornadaId}
              onChange={(event) => setJornadaId(event.target.value)}
              className={campo}
            >
              <option value="">Selecione um horário cadastrado</option>
              {jornadas.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.codigo} - {item.nome}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-muted-foreground">
              Carregado diretamente do cadastro Horário de Trabalho.
            </span>
          </label>
          <label className="block text-sm font-medium">
            Escala
            <select name="escalaId" className={campo}>
              <option value="">Resolver pelo horário de trabalho</option>
              {jornadas
                .find((item) => item.id === jornadaId)
                ?.escalas.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Data
            <input name="data" type="date" required className={campo} />
          </label>
          <label className="block text-sm font-medium">
            Marcações
            <input
              name="marcacoes"
              placeholder="08:00 12:00 13:00 17:00"
              required
              className={campo}
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Horários em sequência, separados por espaço.
            </span>
          </label>
          <label className="block text-sm font-medium">
            Ocorrências simuladas
            <input
              name="ocorrencias"
              placeholder="FERIADO, AFASTAMENTO"
              className={campo}
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Códigos separados por vírgula.
            </span>
          </label>
          <label className="block text-sm font-medium">
            Autorizações simuladas
            <input
              name="autorizacoes"
              placeholder="HORA_EXTRA_AUTORIZADA"
              className={campo}
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Não cria autorização oficial.
            </span>
          </label>
        </div>
        {erro && <p className="mt-3 text-sm text-destructive">{erro}</p>}
        <button
          disabled={pendente}
          className="mt-5 inline-flex h-9 items-center gap-2 rounded bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Play className="size-4" />
          {pendente ? "Simulando..." : "Simular apuração"}
        </button>
      </form>
      <section className="rounded border bg-card p-4">
        <h2 className="text-base font-semibold">Resultado da simulação</h2>
        {!resultado ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Preencha o cenário para visualizar os relógios, rubricas e memória
            de cálculo.
          </p>
        ) : (
          <>
            <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
              <strong>Simulação sem efeito oficial.</strong> Política{" "}
              {resultado.politica.nome} v{resultado.politica.versao}.
              {resultado.configuracao.provisoria
                ? " Política padrão provisória usada porque o horário ainda não possui configuração MCT específica."
                : ""}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-2 rounded border p-3 text-sm">
              <strong>Horário previsto de referência</strong>
              {resultado.referencia ? (
                <>
                  <span>
                    Entrada prevista{" "}
                    <b className="font-mono">
                      {hora(resultado.referencia.entrada)}
                    </b>
                  </span>
                  <span>
                    Saída prevista{" "}
                    <b className="font-mono">
                      {hora(resultado.referencia.saida)}
                    </b>
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">
                  Sem janela fixa para o dia selecionado.
                </span>
              )}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <article className="rounded border p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <Timer className="size-4 text-primary" />
                  Relógio de Jornada
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  {[
                    ["Exigível", "jornadaExigivelMinutos"],
                    ["Computável", "tempoComputavelMinutos"],
                    ["Faltante", "tempoFaltanteMinutos"],
                    ["Excedente bruto", "excedenteBrutoMinutos"],
                    ["Crédito reconhecido", "creditoReconhecidoMinutos"],
                    ["Débito reconhecido", "debitoReconhecidoMinutos"],
                  ].map(([rotulo, chave]) => (
                    <div className="contents" key={chave}>
                      <dt>{rotulo}</dt>
                      <dd className="text-right font-semibold">
                        {duracao(resultado.resultado.resultadoJornada[chave])}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
              <article className="rounded border p-4">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldCheck className="size-4 text-primary" />
                  Relógio de Conformidade
                </div>
                <p className="mt-3 text-sm font-semibold">
                  {resultado.resultado.resultadoConformidade.possuiPendencias
                    ? "Com pendências"
                    : "Sem pendências"}
                </p>
                {resultado.resultado.resultadoConformidade.fatos.map((fato) => (
                  <p
                    key={fato.codigo}
                    className="mt-2 text-xs text-muted-foreground"
                  >
                    {fato.descricao}
                  </p>
                ))}
              </article>
            </div>
            <section className="mt-4 rounded border p-3">
              <h3 className="text-sm font-semibold">Rubricas aplicadas</h3>
              {resultado.resultado.classificacao?.aplicacoes.length ? (
                resultado.resultado.classificacao.aplicacoes.map(
                  (item, indice) => (
                    <div
                      key={`${item.rubricaCodigo}-${indice}`}
                      className="mt-2 flex justify-between gap-3 border-t pt-2 text-xs"
                    >
                      <span>
                        <strong>{item.rubricaCodigo}</strong>
                        <span className="block text-muted-foreground">
                          {item.explicacao ?? item.status}
                        </span>
                      </span>
                      <span>{duracao(item.quantidade)}</span>
                    </div>
                  ),
                )
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Nenhuma rubrica aplicada.
                </p>
              )}
            </section>
            <details className="mt-4 rounded border p-3">
              <summary className="cursor-pointer text-sm font-semibold">
                Memória de cálculo e regras
              </summary>
              <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs">
                {JSON.stringify(resultado.resultado.memoriaCalculo, null, 2)}
              </pre>
            </details>
          </>
        )}
      </section>
    </div>
  );
}
