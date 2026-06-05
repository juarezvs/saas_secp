import { AlertTriangle, CheckCircle2, Clock, UserRound } from "lucide-react";

import { Badge, Button, Card } from "@/components/ui";
import type { ServidorHomologacaoMock } from "../data/homologacao-chefia.mock";

type ServidorHomologacaoCardProps = {
  servidor: ServidorHomologacaoMock;
  selecionado?: boolean;
  onSelecionar?: () => void;
};

const config = {
  critico: { label: "Crítico", variant: "critico", icon: AlertTriangle },
  pendente: { label: "Pendente", variant: "pendente", icon: Clock },
  regular: { label: "Regular", variant: "regular", icon: CheckCircle2 },
  homologado: { label: "Homologado", variant: "homologado", icon: CheckCircle2 },
} as const;

export function ServidorHomologacaoCard({ servidor, selecionado = false, onSelecionar }: ServidorHomologacaoCardProps) {
  const Icon = config[servidor.status].icon;

  return (
    <Card className={selecionado ? "border-secp-blue-700 p-4 ring-2 ring-secp-blue-700/20" : "p-4"}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-secp-blue-700">
            <UserRound className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{servidor.nome}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{servidor.matricula} • {servidor.unidade}</p>
          </div>
        </div>
        <Badge variant={config[servidor.status].variant}>{config[servidor.status].label}</Badge>
      </div>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <Resumo label="Débito" value={servidor.resumo.debito} />
        <Resumo label="Crédito" value={servidor.resumo.credito} />
        <Resumo label="Solicitações" value={String(servidor.resumo.solicitacoes)} />
      </div>
      <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
        {servidor.ultimaAcao}
      </p>
      {onSelecionar && (
        <Button className="mt-4 w-full" variant={selecionado ? "secondary" : "outline"} onClick={onSelecionar}>
          Analisar
        </Button>
      )}
    </Card>
  );
}

function Resumo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

