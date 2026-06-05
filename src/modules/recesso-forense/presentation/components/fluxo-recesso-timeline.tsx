import { CheckCircle2, CircleDot } from "lucide-react";

import { Card } from "@/components/ui";
import { fluxoRecessoMock } from "../data/recesso-forense.mock";

export function FluxoRecessoTimeline() {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold">Fluxo institucional do recesso</h2>
      <ol className="mt-4 space-y-3">
        {fluxoRecessoMock.map((etapa, index) => {
          const Icon = index < 2 ? CheckCircle2 : CircleDot;
          return (
            <li key={etapa} className="flex gap-3 text-sm">
              <Icon className={index < 2 ? "size-5 text-secp-green-700" : "size-5 text-muted-foreground"} aria-hidden="true" />
              <span>{etapa}</span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

