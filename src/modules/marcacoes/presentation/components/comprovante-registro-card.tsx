import { CheckCircle2, Copy } from "lucide-react";

import { Button, Card } from "@/components/ui";

type ComprovanteRegistroCardProps = {
  codigo: string;
  horario: string;
  tipo: string;
  metodo: string;
};

export function ComprovanteRegistroCard({
  codigo,
  horario,
  tipo,
  metodo,
}: ComprovanteRegistroCardProps) {
  return (
    <Card className="border-green-200 bg-green-50 p-5 text-green-950 dark:border-green-900 dark:bg-green-950 dark:text-green-50">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-secp-green-700" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold">Registro realizado com sucesso</h2>
          <p className="mt-1 text-sm leading-6">Comprovante gerado. Guarde o código para consulta futura.</p>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold">Tipo</dt>
              <dd>{tipo}</dd>
            </div>
            <div>
              <dt className="font-semibold">Horário</dt>
              <dd>{horario}</dd>
            </div>
            <div>
              <dt className="font-semibold">Metodo</dt>
              <dd>{metodo}</dd>
            </div>
            <div>
              <dt className="font-semibold">Código</dt>
              <dd className="break-all font-mono">{codigo}</dd>
            </div>
          </dl>

          <Button variant="success" className="mt-4" leftIcon={<Copy className="size-4" aria-hidden="true" />}>
            Preparar comprovante
          </Button>
        </div>
      </div>
    </Card>
  );
}

