"use client";

import { useContext, useId, useState, type ReactNode } from "react";
import { Clock3, Coffee, LogIn, LogOut, MapPin, RotateCcw } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { detalhesOrigemMarcacao } from "../../application/services/espelho-marcacao-origem.service";
import { ExibirOrigemMarcacoesContext } from "./exibir-origem-marcacoes";

type MarcacaoOrigemHoverCardProps = {
  detalhes: ReturnType<typeof detalhesOrigemMarcacao>;
  horario: string;
  children: ReactNode;
};

export function MarcacaoOrigemHoverCard(props: MarcacaoOrigemHoverCardProps) {
  const contexto = useContext(ExibirOrigemMarcacoesContext);
  if (contexto?.exibirOrigem === false) return <>{props.children}</>;
  return <MarcacaoOrigemHoverCardConteudo {...props} />;
}

function MarcacaoOrigemHoverCardConteudo({ detalhes, horario, children }: MarcacaoOrigemHoverCardProps) {
  const [aberto, setAberto] = useState(false);
  const descricaoId = useId();
  const nomeEquipamento = detalhes.campos.find(([rotulo]) => rotulo === "Equipamento")?.[1];
  const localizacao = detalhes.campos.find(([rotulo]) => rotulo === "Localização")?.[1];
  const tipo = detalhes.campos.find(([rotulo]) => rotulo === "Tipo")?.[1];
  const IconeTipo = tipo === "Entrada" ? LogIn
    : tipo === "Saída para intervalo" ? Coffee
    : tipo === "Retorno do intervalo" ? RotateCcw
    : tipo === "Saída" ? LogOut
    : Clock3;
  const titulo = nomeEquipamento ?? (
    detalhes.titulo === "Reconhecimento facial via equipamento biométrico" || detalhes.titulo === "Equipamento biométrico"
      ? "Equipamento não identificado"
      : detalhes.titulo
  );
  return (
    <HoverCard open={aberto} onOpenChange={setAberto} openDelay={250} closeDelay={150}>
      <HoverCardTrigger asChild>
        <span
          tabIndex={0}
          aria-label={`Marcação às ${horario}. ${titulo}`}
          aria-describedby={aberto ? descricaoId : undefined}
          className="inline-flex rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          onFocus={() => setAberto(true)}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setAberto(false); }}
          onKeyDown={(event) => { if (event.key === "Escape") setAberto(false); }}
        >
          {children}
        </span>
      </HoverCardTrigger>
      <HoverCardContent
        id={descricaoId}
        side="top"
        className="w-[320px] rounded-xl border-slate-200 bg-white p-4 font-sans font-normal whitespace-normal text-slate-950 shadow-[0_4px_16px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        <div className="flex items-start gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <Clock3 className="size-5" strokeWidth={2} aria-hidden="true" />
          </div>
          <div className="min-w-0 pt-0.5">
            <p className="text-[11px] leading-4 text-slate-500 dark:text-slate-400">Marcação às {horario}</p>
            <p className="mt-0.5 break-words text-sm font-semibold leading-5">{titulo}</p>
          </div>
        </div>
        <dl className="mt-3 space-y-2 border-t border-slate-200 pt-3 text-xs dark:border-slate-700">
          {localizacao && (
            <div className="grid grid-cols-[1rem_4.75rem_minmax(0,1fr)] items-start gap-x-2">
              <MapPin className="size-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
              <dt className="text-slate-500 dark:text-slate-400">Localização</dt>
              <dd className="min-w-0 break-words leading-4">{localizacao}</dd>
            </div>
          )}
          {tipo && (
            <div className="grid grid-cols-[1rem_4.75rem_minmax(0,1fr)] items-start gap-x-2">
              <IconeTipo className="size-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
              <dt className="text-slate-500 dark:text-slate-400">Tipo</dt>
              <dd className="min-w-0 break-words leading-4">{tipo}</dd>
            </div>
          )}
        </dl>
      </HoverCardContent>
    </HoverCard>
  );
}
