import { ShieldCheck } from "lucide-react";

import { Card } from "@/components/ui";
import { timelineAuditoriaMock } from "../data/homologacao-chefia.mock";

export function TimelineAuditoriaMock() {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5 text-secp-blue-700" aria-hidden="true" />
        <h2 className="text-lg font-semibold">Auditoria visual</h2>
      </div>
      <ol className="mt-4 space-y-3">
        {timelineAuditoriaMock.map((evento) => (
          <li key={`${evento.data}-${evento.evento}`} className="border-l-2 border-secp-blue-700 pl-3 text-sm">
            <p className="font-semibold">{evento.evento}</p>
            <p className="mt-1 text-muted-foreground">{evento.data} • {evento.autor}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

