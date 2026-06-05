import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

import { Card } from "@/components/ui";
import type { AlertaServidor } from "../data/dashboard-servidor.mock";

type AlertasEAvisosCardProps = {
  alertas: AlertaServidor[];
};

const styles = {
  warning: { icon: AlertTriangle, className: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100" },
  info: { icon: Info, className: "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100" },
  success: { icon: CheckCircle2, className: "border-green-200 bg-green-50 text-green-950 dark:border-green-900 dark:bg-green-950 dark:text-green-100" },
};

export function AlertasEAvisosCard({ alertas }: AlertasEAvisosCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Alertas e avisos</h2>
        <Link href="/solicitacoes" className="text-sm font-semibold text-secp-blue-700 hover:underline">Ver todos</Link>
      </div>
      <div className="mt-4 space-y-3">
        {alertas.map((alerta) => {
          const Icon = styles[alerta.tipo].icon;

          return (
            <article key={alerta.titulo} className={`rounded-md border p-4 ${styles[alerta.tipo].className}`}>
              <div className="flex gap-3">
                <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-bold">{alerta.titulo}</h3>
                  <p className="mt-1 text-sm leading-6">{alerta.descricao}</p>
                  {alerta.acao && (
                    <Link href={alerta.acao.href} className="mt-2 inline-flex text-sm font-semibold underline">
                      {alerta.acao.label}
                    </Link>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </Card>
  );
}
