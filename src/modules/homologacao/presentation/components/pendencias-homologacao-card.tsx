import { AlertTriangle } from "lucide-react";

type Pendencia = {
  tipo: string;
  descricao: string;
  quantidade?: number;
  minutos?: number;
};

const ROTULOS_PENDENCIA: Record<string, string> = {
  APURACAO_INCONSISTENTE: "Apuração inconsistente",
  MARCACAO_INCOMPLETA: "Marcação incompleta",
  SOLICITACAO_PENDENTE: "Solicitação pendente",
  BANCO_HORAS_PENDENTE: "Banco de horas pendente",
  HORA_EXTRA_NAO_AUTORIZADA: "Hora extra não autorizada",
  FALTA: "Falta",
  DEBITO: "Débito",
  JORNADA_NAO_CONFIGURADA: "Jornada não configurada",
  APURACAO_MENSAL_INCOMPLETA: "Apuração mensal incompleta",
  CARGA_PREVISTA_DIVERGENTE: "Carga prevista divergente",
  SEM_APURACAO: "Sem apuração",
};

function rotuloPendencia(tipo: string) {
  return ROTULOS_PENDENCIA[tipo] ?? tipo;
}

function minutosParaTexto(minutos: number) {
  const sinal = minutos < 0 ? "-" : "";
  const abs = Math.abs(minutos);
  const horas = Math.floor(abs / 60);
  const resto = abs % 60;

  return `${sinal}${String(horas).padStart(2, "0")}:${String(resto).padStart(
    2,
    "0",
  )}`;
}

export function PendenciasHomologacaoCard({
  pendencias,
}: {
  pendencias: Pendencia[];
}) {
  if (pendencias.length === 0) {
    return (
      <div className="rounded-lg border bg-green-50 p-4 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
        Nenhuma pendência identificada.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-300">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-4" />
        <p className="font-semibold">Pendências encontradas</p>
      </div>

      <div className="mt-3 space-y-3">
        {pendencias.map((pendencia, index) => (
          <div key={`${pendencia.tipo}-${index}`} className="text-sm">
            <p className="font-semibold">{rotuloPendencia(pendencia.tipo)}</p>
            <p className="mt-1">{pendencia.descricao}</p>

            {(pendencia.quantidade || pendencia.minutos) && (
              <p className="mt-1 text-xs">
                {pendencia.quantidade
                  ? `Quantidade: ${pendencia.quantidade}`
                  : ""}
                {pendencia.quantidade && pendencia.minutos ? " • " : ""}
                {pendencia.minutos
                  ? `Tempo: ${minutosParaTexto(pendencia.minutos)}`
                  : ""}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
