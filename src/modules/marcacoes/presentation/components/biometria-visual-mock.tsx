import { ScanFace, ShieldCheck } from "lucide-react";

import { Badge, Card } from "@/components/ui";

type BiometriaVisualMockProps = {
  status: "aguardando" | "detectado" | "validado";
};

const mensagens = {
  aguardando: "Centralize seu rosto no círculo.",
  detectado: "Rosto detectado. Aguarde a confirmação.",
  validado: "Captura válida para registro.",
};

export function BiometriaVisualMock({ status }: BiometriaVisualMockProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Reconhecimento facial</h2>
        <Badge variant={status === "validado" ? "regular" : "aguardando"}>
          {status === "aguardando" ? "Aguardando" : status === "detectado" ? "Detectado" : "Validado"}
        </Badge>
      </div>

      <div className="mt-5 grid place-items-center rounded-lg border border-dashed border-secp-blue-700/40 bg-muted p-8">
        <div className="grid size-48 place-items-center rounded-full border-4 border-secp-blue-700 bg-card shadow-card">
          {status === "validado" ? (
            <ShieldCheck className="size-20 text-secp-green-700" aria-hidden="true" />
          ) : (
            <ScanFace className="size-20 text-secp-blue-700" aria-hidden="true" />
          )}
        </div>
      </div>

      <p className="mt-4 text-sm font-semibold">{mensagens[status]}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        Mantenha boa iluminação. Esta etapa é apenas visual e não ativa câmera real.
      </p>
    </Card>
  );
}

