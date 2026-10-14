"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, Power, PowerOff, Save, ShieldCheck } from "lucide-react";
import { Button, Input, Select, toast } from "@/components/ui";
import { ativarConfiguracaoApuracao, inativarConfiguracaoApuracao, salvarConfiguracaoApuracao, validarConfiguracaoApuracao } from "../../application/actions/configuracao-apuracao.actions";

type Jornada = { id: string; codigo: string; nome: string; tipo: string; cargaDiariaMinutos: number; escalas: { id: string; nome: string }[] };
type Politica = { id: string; nome: string; versao: number; orgaoId: string };
type Modelo = { codigo: string; nome: string; descricao: string; tiposJornada: string[]; camposComplementares: string[] };
type Configuracao = { id: string; versao: number; jornada: string; escala: string | null; modelo: string; politica: string | null; status: string; vigencia: string };

const etapas = ["Jornada", "Modelo", "Marcações", "Diferenças", "Vigência", "Revisão", "Publicação"];

export function ConfiguracaoApuracaoAssistente({ jornadas, politicas, modelos, configuracoes, podeGerenciar }: { jornadas: Jornada[]; politicas: Politica[]; modelos: Modelo[]; configuracoes: Configuracao[]; podeGerenciar: boolean }) {
  const [etapa, setEtapa] = useState(0);
  const [jornadaId, setJornadaId] = useState("");
  const [modeloCodigo, setModeloCodigo] = useState("");
  const [politicaId, setPoliticaId] = useState("");
  const [valores, setValores] = useState<Record<string, string>>({});
  const [pendente, iniciar] = useTransition();
  const jornada = jornadas.find((item) => item.id === jornadaId);
  const modelosDisponiveis = useMemo(() => modelos.filter((item) => !jornada || item.tiposJornada.length === 0 || item.tiposJornada.includes(jornada.tipo)), [jornada, modelos]);
  const modelo = modelos.find((item) => item.codigo === modeloCodigo);

  function salvar(form: HTMLFormElement) {
    iniciar(async () => {
      try {
        const resultado = await salvarConfiguracaoApuracao(new FormData(form));
        toast.success(resultado.mensagem, "Configuração salva");
        if (resultado.pendencias.length) toast.warning(resultado.pendencias.join(" "), "Pendências para ativação");
        form.reset(); setEtapa(0); setJornadaId(""); setModeloCodigo(""); setPoliticaId(""); setValores({});
      } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar."); }
    });
  }

  function ativar(id: string) {
    iniciar(async () => {
      try { const resultado = await ativarConfiguracaoApuracao(id); toast.success(resultado.mensagem, "Configuração ativada"); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível ativar."); }
    });
  }

  function executarAcao(id: string, acao: "validar" | "inativar") {
    iniciar(async () => {
      try {
        const resultado = acao === "validar" ? await validarConfiguracaoApuracao(id) : await inativarConfiguracaoApuracao(id);
        toast.success(resultado.mensagem, acao === "validar" ? "Validação concluída" : "Configuração inativada");
      } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível concluir."); }
    });
  }

  return <div className="grid gap-4 xl:grid-cols-[minmax(380px,0.44fr)_minmax(0,0.56fr)]">
    <form className="rounded-md border bg-card" onChange={(event) => {
      const campo = event.target as unknown as HTMLInputElement | HTMLSelectElement;
      if (campo.name) setValores((atuais) => ({ ...atuais, [campo.name]: campo.value }));
    }} onSubmit={(event) => { event.preventDefault(); salvar(event.currentTarget); }}>
      {Object.entries(valores).map(([nome, valor]) => <input key={nome} type="hidden" name={nome} value={valor} />)}
      <div className="border-b p-4"><h2 className="font-semibold">Assistente de configuração</h2><p className="mt-1 text-xs text-muted-foreground">O assistente referencia os horários já cadastrados. Nenhuma regra legal é criada automaticamente.</p></div>
      <ol className="flex overflow-x-auto border-b px-3">{etapas.map((nome, indice) => <li key={nome} className={`flex min-w-max items-center gap-1.5 border-b-2 px-2 py-3 text-xs ${indice === etapa ? "border-primary font-semibold text-primary" : indice < etapa ? "border-transparent text-foreground" : "border-transparent text-muted-foreground"}`}><span className={`flex size-5 items-center justify-center rounded-full ${indice <= etapa ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{indice < etapa ? <Check className="size-3" /> : indice + 1}</span>{nome}</li>)}</ol>
      <div className="min-h-72 p-5">
        {etapa === 0 && <div className="space-y-4"><h3 className="font-semibold">Qual jornada será analisada?</h3><label className="block text-sm">Jornada existente<Select name="jornadaId" required value={jornadaId} onChange={(e) => { setJornadaId(e.target.value); setModeloCodigo(""); }} className="mt-1"><option value="">Selecione</option>{jornadas.map((item) => <option key={item.id} value={item.id}>{item.codigo} - {item.nome}</option>)}</Select></label>{jornada && <p className="rounded border bg-muted/40 p-3 text-sm">{jornada.tipo} · carga diária {Math.floor(jornada.cargaDiariaMinutos / 60)}h{String(jornada.cargaDiariaMinutos % 60).padStart(2, "0")}</p>}<label className="block text-sm">Escala específica<Select name="escalaId" className="mt-1"><option value="">Usar a escala vinculada ao servidor</option>{jornada?.escalas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</Select></label></div>}
        {etapa === 1 && <div className="space-y-4"><h3 className="font-semibold">Como essa jornada se organiza?</h3><div className="grid gap-2">{modelosDisponiveis.map((item) => <label key={item.codigo} className={`cursor-pointer rounded border p-3 ${modeloCodigo === item.codigo ? "border-primary bg-primary/5" : ""}`}><input type="radio" name="modeloCodigo" value={item.codigo} checked={modeloCodigo === item.codigo} onChange={() => setModeloCodigo(item.codigo)} className="mr-2" /><strong className="text-sm">{item.nome}</strong><span className="mt-1 block pl-5 text-xs text-muted-foreground">{item.descricao}</span></label>)}</div></div>}
        {etapa === 2 && <div className="space-y-4"><h3 className="font-semibold">Tratamento das marcações</h3><p className="text-sm text-muted-foreground">Pareamento, intervalos e janelas vêm da jornada e da escala selecionadas. Informe somente os complementos exigidos pelo modelo.</p>{modelo?.camposComplementares.map((campo) => <label key={campo} className="block text-sm">{campo}<Input name={campo} type={campo.toLowerCase().includes("minutos") ? "number" : campo.toLowerCase().includes("janela") ? "time" : "text"} required className="mt-1" /></label>)}{!modelo?.camposComplementares.length && <p className="rounded border border-dashed p-4 text-sm">Este modelo não exige informação complementar.</p>}</div>}
        {etapa === 3 && <div className="space-y-4"><h3 className="font-semibold">Como classificar as diferenças?</h3><label className="block text-sm">Política publicada<Select name="politicaVersaoId" value={politicaId} onChange={(e) => setPoliticaId(e.target.value)} className="mt-1"><option value="">Selecionar depois</option>{politicas.map((item) => <option key={item.id} value={item.id}>{item.nome} v{item.versao}</option>)}</Select></label><p className="text-xs text-muted-foreground">Sem política, o cadastro será salvo como incompleto e não poderá ser ativado.</p></div>}
        {etapa === 4 && <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Início da vigência<Input name="vigenciaInicio" type="date" required className="mt-1" /></label><label className="text-sm">Fim da vigência<Input name="vigenciaFim" type="date" className="mt-1" /></label><p className="sm:col-span-2 text-xs text-muted-foreground">Deixe o término vazio quando a vigência não tiver data final definida.</p></div>}
        {etapa === 5 && <div className="space-y-3"><h3 className="font-semibold">Revise a configuração</h3><dl className="grid grid-cols-[8rem_1fr] gap-2 text-sm"><dt className="text-muted-foreground">Jornada</dt><dd>{jornada?.nome || "Não selecionada"}</dd><dt className="text-muted-foreground">Modelo</dt><dd>{modelo?.nome || "Não selecionado"}</dd><dt className="text-muted-foreground">Política</dt><dd>{politicas.find((p) => p.id === politicaId)?.nome || "Pendente"}</dd></dl></div>}
        {etapa === 6 && <div className="space-y-3"><h3 className="font-semibold">Salvar para validação</h3><p className="text-sm text-muted-foreground">Salvar não muda a fonte oficial dos cálculos. Após simular e revisar os resultados, uma configuração completa poderá ser ativada para análises MCT em paralelo.</p><Button type="submit" loading={pendente} disabled={!podeGerenciar} leftIcon={<Save className="size-4" />}>Salvar configuração</Button></div>}
      </div>
      <div className="flex justify-between border-t p-3"><Button variant="outline" size="sm" disabled={etapa === 0 || pendente} onClick={() => setEtapa((v) => v - 1)} leftIcon={<ArrowLeft className="size-4" />}>Voltar</Button>{etapa < etapas.length - 1 && <Button size="sm" disabled={(etapa === 0 && !jornadaId) || (etapa === 1 && !modeloCodigo)} onClick={() => setEtapa((v) => v + 1)} rightIcon={<ArrowRight className="size-4" />}>Continuar</Button>}</div>
    </form>
    <section className="rounded-md border bg-card"><div className="border-b p-4"><h2 className="font-semibold">Configurações cadastradas</h2><p className="mt-1 text-xs text-muted-foreground">Validar executa um cenário técnico real. Ativar não substitui o cálculo oficial LEGACY.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="p-3">Jornada</th><th className="p-3">Versão</th><th className="p-3">Modelo</th><th className="p-3">Política</th><th className="p-3">Vigência</th><th className="p-3">Status</th><th className="p-3"><span className="sr-only">Ações</span></th></tr></thead><tbody>{configuracoes.map((item) => <tr key={item.id} className="border-b"><td className="p-3 font-medium">{item.jornada}<span className="block text-xs font-normal text-muted-foreground">{item.escala ?? "Escala do servidor"}</span></td><td className="p-3">v{item.versao}</td><td className="p-3">{item.modelo}</td><td className="p-3">{item.politica ?? "Pendente"}</td><td className="whitespace-nowrap p-3">{item.vigencia}</td><td className="p-3">{item.status.replaceAll("_", " ")}</td><td className="p-3"><div className="flex gap-2">{["PRONTA_SIMULACAO", "EM_VALIDACAO"].includes(item.status) && <Button variant="outline" size="sm" disabled={!podeGerenciar || pendente} onClick={() => executarAcao(item.id, "validar")} leftIcon={<ShieldCheck className="size-4" />}>Validar</Button>}{item.status === "EM_VALIDACAO" && <Button variant="outline" size="sm" disabled={!podeGerenciar || pendente} onClick={() => ativar(item.id)} leftIcon={<Power className="size-4" />}>Ativar</Button>}{item.status === "ATIVA" && <Button variant="outline" size="sm" disabled={!podeGerenciar || pendente} onClick={() => executarAcao(item.id, "inativar")} leftIcon={<PowerOff className="size-4" />}>Inativar</Button>}</div></td></tr>)}{!configuracoes.length && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma configuração criada.</td></tr>}</tbody></table></div></section>
  </div>;
}
