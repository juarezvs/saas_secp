"use client";

import Image from "next/image";
import { ChevronDown, ContactRound, Loader2, MapPin, Plus, Save, Trash2, UserRound } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";

type Opcao = { codigo: string; nome: string };
type Dominios = Record<"RACA" | "COR_CABELO" | "COR_OLHOS" | "TIPO_SANGUINEO" | "IDENTIDADE_GENERO", Opcao[]>;
type PerfilPessoal = {
  cep: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  numeroResidencia: string;
  complemento: string;
  email: string;
  telefones: string[];
  altura: string;
  raca: string;
  corCabelo: string;
  corOlhos: string;
  tipoSanguineo: string;
  identidadeGenero: string;
  dominios: Dominios;
};

function mascaraCep(valor: string) {
  const numeros = valor.replace(/\D/g, "").slice(0, 8);
  return numeros.replace(/^(\d{5})(\d)/, "$1-$2");
}

function mascaraTelefone(valor: string) {
  const numeros = valor.replace(/\D/g, "").slice(0, 11);
  if (numeros.length <= 10) return numeros.replace(/^(\d{2})(\d{4})(\d{0,4})$/, "($1) $2-$3");
  return numeros.replace(/^(\d{2})(\d)(\d{4})(\d{0,4})$/, "($1) $2 $3-$4");
}

function CampoSelect({ label, value, opcoes, onChange }: { label: string; value: string; opcoes: Opcao[]; onChange: (valor: string) => void }) {
  return (
    <label className="space-y-1.5 text-sm font-semibold">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} required className="h-10 w-full rounded-md border bg-background px-3 text-sm">
        <option value="">Selecione</option>
        {opcoes.map((item) => <option key={item.codigo} value={item.codigo}>{item.nome}</option>)}
      </select>
    </label>
  );
}

export function PerfilPessoalDrawer({ nome, matricula, funcaoOuCargo, fotoUrl }: { nome: string; matricula: string; funcaoOuCargo?: string | null; fotoUrl?: string | null }) {
  const [aberto, setAberto] = useState(false);
  const [perfil, setPerfil] = useState<PerfilPessoal | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [consultandoCep, setConsultandoCep] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const ultimoCepConsultado = useRef("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const response = await fetch("/api/perfil-pessoal", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.mensagem ?? "Falha ao carregar os dados.");
      setPerfil(payload);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao carregar os dados.");
    } finally {
      setCarregando(false);
    }
  }, []);

  function alterar<K extends keyof PerfilPessoal>(campo: K, valor: PerfilPessoal[K]) {
    setPerfil((atual) => atual ? { ...atual, [campo]: valor } : atual);
  }

  useEffect(() => {
    const cep = perfil?.cep.replace(/\D/g, "") ?? "";
    if (cep.length !== 8 || cep === ultimoCepConsultado.current) return;
    const timeout = window.setTimeout(async () => {
      ultimoCepConsultado.current = cep;
      setConsultandoCep(true);
      setErro(null);
      try {
        const response = await fetch(`/api/perfil-pessoal/cep/${cep}`, { cache: "no-store" });
        const dados = await response.json();
        if (!response.ok) throw new Error(dados.mensagem ?? "Falha ao consultar o CEP.");
        setPerfil((atual) => atual ? {
          ...atual,
          endereco: dados.endereco,
          bairro: dados.bairro,
          cidade: dados.cidade,
          uf: dados.uf,
          complemento: dados.complemento || atual.complemento,
        } : atual);
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Falha ao consultar o CEP.");
      } finally {
        setConsultandoCep(false);
      }
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [perfil?.cep]);

  async function salvar(event: React.FormEvent) {
    event.preventDefault();
    if (!perfil) return;
    setSalvando(true);
    setErro(null);
    setMensagem(null);
    try {
      const response = await fetch("/api/perfil-pessoal", {
        method: "PUT",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ ...perfil, cep: perfil.cep.replace(/\D/g, ""), telefones: perfil.telefones.map((item) => item.replace(/\D/g, "")) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.mensagem ?? "Falha ao atualizar o SARH.");
      setMensagem(payload.mensagem);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao atualizar o SARH.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Drawer open={aberto} onOpenChange={(valor) => { setAberto(valor); if (valor && !perfil && !carregando) void carregar(); }}>
      <DrawerTrigger asChild>
        <button type="button" className="group hidden min-w-0 items-center gap-3 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-left shadow-sm backdrop-blur transition hover:border-white/35 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:flex" aria-label="Abrir meus dados pessoais">
          {fotoUrl ? <Image src={fotoUrl} alt="" width={40} height={40} unoptimized className="size-10 rounded-full border-2 border-white bg-white object-cover shadow-sm ring-2 ring-white/25" /> : <span className="flex size-10 items-center justify-center rounded-full border-2 border-white bg-white text-secp-blue-900 shadow-sm ring-2 ring-white/25"><UserRound className="size-4" aria-hidden="true" /></span>}
          <span className="min-w-0 max-w-80 flex-1">
            <span className="flex min-w-0 items-center gap-2"><span className="truncate text-sm font-semibold">{nome}</span><span className="shrink-0 rounded bg-white/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white/85">{matricula}</span></span>
            <span className="mt-0.5 block truncate text-xs text-white/75">{funcaoOuCargo}</span>
          </span>
          <ChevronDown className="size-4 shrink-0 translate-y-[-2px] text-white/80 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100" aria-hidden="true" />
        </button>
      </DrawerTrigger>
      <DrawerContent swipeDirection="right" className="w-[min(96vw,52rem)] max-w-none">
        <DrawerHeader>
          <DrawerTitle>Meus dados pessoais</DrawerTitle>
          <DrawerDescription>Atualize seus dados básicos no SARH.</DrawerDescription>
        </DrawerHeader>
        {carregando ? <div className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin" />Carregando dados do SARH</div> : null}
        {!carregando && erro && !perfil ? <div className="m-5 border-l-4 border-red-600 bg-red-50 p-4 text-sm text-red-800">{erro}<button type="button" onClick={() => void carregar()} className="ml-3 font-bold underline">Tentar novamente</button></div> : null}
        {perfil ? (
          <form id="perfil-pessoal-form" onSubmit={salvar} className="flex-1 space-y-4 overflow-y-auto p-5">
            {erro ? <div role="alert" className="border-l-4 border-red-600 bg-red-50 p-3 text-sm text-red-800">{erro}</div> : null}
            {mensagem ? <div role="status" className="border-l-4 border-emerald-600 bg-emerald-50 p-3 text-sm text-emerald-800">{mensagem}</div> : null}
            <section className="overflow-hidden rounded border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.12),0_3px_8px_rgba(0,0,0,0.06)] dark:border-zinc-700 dark:bg-zinc-950">
              <div className="flex items-start gap-3 border-b border-zinc-200 px-4 py-3.5 dark:border-zinc-700">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center bg-[#0078d4] text-white"><MapPin className="size-4" aria-hidden="true" /></span>
                <div className="min-w-0"><h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Endereço e contato</h3><p className="mt-0.5 text-xs leading-5 text-zinc-600 dark:text-zinc-400">Mantenha seus dados de endereço e canais de contato atualizados.</p></div>
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-semibold"><span>CEP</span><span className="relative block"><input value={mascaraCep(perfil.cep)} onChange={(e) => alterar("cep", e.target.value)} required inputMode="numeric" className="h-10 w-full rounded-md border bg-background px-3 pr-10" />{consultandoCep ? <Loader2 className="absolute right-3 top-3 size-4 animate-spin text-muted-foreground" aria-label="Consultando CEP" /> : null}</span></label>
                <label className="space-y-1.5 text-sm font-semibold"><span>Número da residência</span><input value={perfil.numeroResidencia} onChange={(e) => alterar("numeroResidencia", e.target.value)} required maxLength={20} className="h-10 w-full rounded-md border bg-background px-3" /></label>
                <label className="space-y-1.5 text-sm font-semibold sm:col-span-2"><span>Endereço</span><input value={perfil.endereco} onChange={(e) => alterar("endereco", e.target.value)} required maxLength={200} className="h-10 w-full rounded-md border bg-background px-3" /></label>
                <label className="space-y-1.5 text-sm font-semibold"><span>Bairro</span><input value={perfil.bairro} onChange={(e) => alterar("bairro", e.target.value)} required maxLength={100} className="h-10 w-full rounded-md border bg-background px-3" /></label>
                <div className="grid grid-cols-[minmax(0,1fr)_5rem] gap-2"><label className="space-y-1.5 text-sm font-semibold"><span>Cidade</span><input value={perfil.cidade} onChange={(e) => alterar("cidade", e.target.value)} required maxLength={100} className="h-10 w-full rounded-md border bg-background px-3" /></label><label className="space-y-1.5 text-sm font-semibold"><span>UF</span><input value={perfil.uf} onChange={(e) => alterar("uf", e.target.value.toUpperCase().slice(0, 2))} required maxLength={2} className="h-10 w-full rounded-md border bg-background px-3 uppercase" /></label></div>
                <label className="space-y-1.5 text-sm font-semibold sm:col-span-2"><span>Complemento</span><input value={perfil.complemento} onChange={(e) => alterar("complemento", e.target.value)} maxLength={100} className="h-10 w-full rounded-md border bg-background px-3" /></label>
                <label className="space-y-1.5 text-sm font-semibold sm:col-span-2"><span>E-mail institucional</span><input type="email" value={perfil.email} onChange={(e) => alterar("email", e.target.value)} required className="h-10 w-full rounded-md border bg-background px-3" /></label>
              </div>
              <div className="mx-4 mb-4 space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                <div className="flex items-center justify-between"><span className="text-sm font-semibold">Telefones</span>{perfil.telefones.length < 4 ? <button type="button" onClick={() => alterar("telefones", [...perfil.telefones, ""])} className="inline-flex size-9 items-center justify-center rounded-md border" title="Adicionar telefone"><Plus className="size-4" /><span className="sr-only">Adicionar telefone</span></button> : null}</div>
                {perfil.telefones.map((telefone, index) => <div key={index} className="flex gap-2"><input value={mascaraTelefone(telefone)} onChange={(e) => alterar("telefones", perfil.telefones.map((item, i) => i === index ? e.target.value : item))} required inputMode="tel" placeholder="(92) 9 9999-9999" className="h-10 min-w-0 flex-1 rounded-md border bg-background px-3" /><button type="button" onClick={() => alterar("telefones", perfil.telefones.filter((_, i) => i !== index))} className="inline-flex size-10 items-center justify-center rounded-md border text-red-700" title="Remover telefone"><Trash2 className="size-4" /><span className="sr-only">Remover telefone</span></button></div>)}
              </div>
            </section>
            <section className="overflow-hidden rounded border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.12),0_3px_8px_rgba(0,0,0,0.06)] dark:border-zinc-700 dark:bg-zinc-950">
              <div className="flex items-start gap-3 border-b border-zinc-200 px-4 py-3.5 dark:border-zinc-700">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center bg-[#8661c5] text-white"><ContactRound className="size-4" aria-hidden="true" /></span>
                <div className="min-w-0"><h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Características pessoais</h3><p className="mt-0.5 text-xs leading-5 text-zinc-600 dark:text-zinc-400">Confira as informações pessoais utilizadas pelo SARH.</p></div>
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-semibold"><span>Altura</span><input value={perfil.altura} onChange={(e) => alterar("altura", e.target.value.replace(".", ",").slice(0, 5))} required inputMode="decimal" placeholder="1,79" className="h-10 w-full rounded-md border bg-background px-3" /></label>
                <CampoSelect label="Raça" value={perfil.raca} opcoes={perfil.dominios.RACA} onChange={(v) => alterar("raca", v)} />
                <CampoSelect label="Cor do cabelo" value={perfil.corCabelo} opcoes={perfil.dominios.COR_CABELO} onChange={(v) => alterar("corCabelo", v)} />
                <CampoSelect label="Cor dos olhos" value={perfil.corOlhos} opcoes={perfil.dominios.COR_OLHOS} onChange={(v) => alterar("corOlhos", v)} />
                <CampoSelect label="Tipo sanguíneo" value={perfil.tipoSanguineo} opcoes={perfil.dominios.TIPO_SANGUINEO} onChange={(v) => alterar("tipoSanguineo", v)} />
                <CampoSelect label="Identidade de gênero" value={perfil.identidadeGenero} opcoes={perfil.dominios.IDENTIDADE_GENERO} onChange={(v) => alterar("identidadeGenero", v)} />
              </div>
            </section>
          </form>
        ) : null}
        <DrawerFooter className="flex-row justify-end gap-2">
          <DrawerClose asChild><Button type="button" variant="outline">Cancelar</Button></DrawerClose>
          <Button type="submit" form="perfil-pessoal-form" disabled={!perfil || salvando}>{salvando ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Confirmar alteração</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
