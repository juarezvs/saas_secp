"use client";

import { useState, useTransition } from "react";
import { Play, ShieldCheck, Timer } from "lucide-react";
import { simularJornadaMct } from "../../application/actions/simular-jornada-mct.action";

type Jornada = { id: string; codigo: string; nome: string; escalas: { id: string; nome: string }[] };
type Resultado = { resultadoJornada: Record<string, number | string | null>; resultadoConformidade: { possuiPendencias: boolean; fatos: { codigo: string; descricao: string }[] }; memoriaCalculo: Record<string, unknown> };

function duracao(valor: unknown) {
  const minutos = Number(valor ?? 0);
  return `${Math.floor(minutos / 60)}h${String(minutos % 60).padStart(2, "0")}`;
}

export function SimuladorJornadaForm({ jornadas }: { jornadas: Jornada[] }) {
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState("");
  const [pendente, iniciar] = useTransition();
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.38fr)_minmax(0,0.62fr)]">
      <form className="rounded border bg-card p-4" onSubmit={(event) => {
        event.preventDefault(); setErro("");
        const dados = new FormData(event.currentTarget);
        iniciar(async () => {
          try {
            const retorno = await simularJornadaMct({ jornadaId: String(dados.get("jornadaId")), data: String(dados.get("data")), marcacoes: String(dados.get("marcacoes")) });
            setResultado(retorno as Resultado);
          } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível simular."); }
        });
      }}>
        <h2 className="text-base font-semibold">Cenário</h2>
        <p className="mt-1 text-xs text-muted-foreground">A simulação não altera apuração, saldo ou homologação.</p>
        <div className="mt-4 space-y-4">
          <label className="block text-sm font-medium">Jornada<select name="jornadaId" required className="mt-1 h-10 w-full rounded border bg-background px-3"><option value="">Selecione</option>{jornadas.map((item) => <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>)}</select></label>
          <label className="block text-sm font-medium">Data<input name="data" type="date" required className="mt-1 h-10 w-full rounded border bg-background px-3" /></label>
          <label className="block text-sm font-medium">Marcações<input name="marcacoes" placeholder="08:00 12:00 13:00 17:00" required className="mt-1 h-10 w-full rounded border bg-background px-3" /><span className="mt-1 block text-xs text-muted-foreground">Informe os horários em sequência, separados por espaço.</span></label>
        </div>
        {erro && <p className="mt-3 text-sm text-destructive">{erro}</p>}
        <button disabled={pendente} className="mt-5 inline-flex h-9 items-center gap-2 rounded bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Play className="size-4" />{pendente ? "Simulando..." : "Simular jornada"}</button>
      </form>
      <section className="rounded border bg-card p-4">
        <h2 className="text-base font-semibold">Resultado da simulação</h2>
        {!resultado ? <p className="mt-8 text-center text-sm text-muted-foreground">Preencha o cenário para visualizar os relógios e a memória de cálculo.</p> : <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <article className="rounded border p-4"><div className="flex items-center gap-2 font-semibold"><Timer className="size-4 text-primary" />Relógio de Jornada</div><dl className="mt-3 grid grid-cols-2 gap-2 text-sm"><dt>Exigível</dt><dd className="text-right font-semibold">{duracao(resultado.resultadoJornada.jornadaExigivelMinutos)}</dd><dt>Computável</dt><dd className="text-right font-semibold">{duracao(resultado.resultadoJornada.tempoComputavelMinutos)}</dd><dt>Faltante</dt><dd className="text-right font-semibold">{duracao(resultado.resultadoJornada.tempoFaltanteMinutos)}</dd><dt>Excedente</dt><dd className="text-right font-semibold">{duracao(resultado.resultadoJornada.excedenteBrutoMinutos)}</dd></dl></article>
            <article className="rounded border p-4"><div className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-4 text-primary" />Relógio de Conformidade</div><p className="mt-3 text-sm font-semibold">{resultado.resultadoConformidade.possuiPendencias ? "Com pendências" : "Sem pendências"}</p>{resultado.resultadoConformidade.fatos.map((fato) => <p key={fato.codigo} className="mt-2 text-xs text-muted-foreground">{fato.descricao}</p>)}</article>
          </div>
          <details className="mt-4 rounded border p-3"><summary className="cursor-pointer text-sm font-semibold">Memória de cálculo</summary><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(resultado.memoriaCalculo, null, 2)}</pre></details>
        </>}
      </section>
    </div>
  );
}
