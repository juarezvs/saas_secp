"use client";

import { useState, useTransition } from "react";
import { PlayCircle } from "lucide-react";
import { Button, Input, toast } from "@/components/ui";
import { processarCompetenciaShadowAction } from "../../application/actions/validacao-mct.actions";
import type { ResultadoProcessamentoCompetenciaShadow } from "../../application/services/processar-competencia-shadow.service";

export function ValidacaoMctPanel() {
  const [resultado, setResultado] = useState<ResultadoProcessamentoCompetenciaShadow | null>(null);
  const [pendente, iniciar] = useTransition();
  return <section className="border bg-card">
    <form className="flex flex-wrap items-end gap-3 border-b p-3" onSubmit={(event) => { event.preventDefault(); const dados = new FormData(event.currentTarget); iniciar(async () => { try { const retorno = await processarCompetenciaShadowAction({ matricula: String(dados.get("matricula")), competencia: String(dados.get("competencia")) }); setResultado(retorno); toast.success(`${retorno.diasProcessados} dia(s) processado(s) sem efeito oficial.`, "SHADOW concluído"); } catch (error) { toast.error(error instanceof Error ? error.message : "Falha no processamento."); } }); }}>
      <label className="text-sm font-medium">Matrícula<Input name="matricula" defaultValue="AM200401" required className="mt-1 w-40" /></label>
      <label className="text-sm font-medium">Competência<Input name="competencia" type="month" defaultValue="2026-09" required className="mt-1 w-44" /></label>
      <Button type="submit" loading={pendente} leftIcon={<PlayCircle className="size-4" />}>Processar em SHADOW</Button>
      <span className="text-xs text-muted-foreground">Não altera espelho, banco de horas, folha ou homologação.</span>
    </form>
    {resultado && <div className="grid gap-px bg-border sm:grid-cols-5"><Indicador rotulo="Dias encontrados" valor={resultado.diasEncontrados} /><Indicador rotulo="Processados" valor={resultado.diasProcessados} /><Indicador rotulo="Com erro" valor={resultado.diasComErro} /><Indicador rotulo="Execuções novas" valor={resultado.execucoesCriadas} /><Indicador rotulo="Divergências" valor={resultado.divergencias} />{resultado.erros.length > 0 && <div className="bg-card p-3 sm:col-span-5"><h3 className="text-sm font-semibold text-destructive">Pendências de processamento</h3>{resultado.erros.map((erro) => <p key={erro.data} className="mt-1 text-xs"><strong>{erro.data}:</strong> {erro.mensagem}</p>)}</div>}</div>}
  </section>;
}

function Indicador({ rotulo, valor }: { rotulo: string; valor: number }) { return <div className="bg-card p-3"><span className="block text-xs text-muted-foreground">{rotulo}</span><strong className="text-xl">{valor}</strong></div>; }
