import { BookOpenCheck } from "lucide-react";

import { Card } from "@/components/ui";

type GuiaRapidoCardProps = {
  regras: string[];
};

export function GuiaRapidoCard({ regras }: GuiaRapidoCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <BookOpenCheck className="size-5 text-secp-blue-700" aria-hidden="true" />
        <h2 className="text-lg font-semibold">Guia rápido</h2>
      </div>
      <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
        {regras.map((regra) => (
          <li key={regra} className="rounded-md bg-muted px-3 py-2">{regra}</li>
        ))}
      </ul>
    </Card>
  );
}

