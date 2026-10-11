import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

import { Card } from "@/components/ui";
import type { AlertaServidor } from "../data/dashboard-servidor.config";

type AlertasEAvisosCardProps = {
  alertas: AlertaServidor[];
};

const styles = {
  warning: {
    icon: AlertTriangle,
    className:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100",
  },
  info: {
    icon: Info,
    className:
      "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100",
  },
  success: {
    icon: CheckCircle2,
    className:
      "border-green-200 bg-green-50 text-green-950 dark:border-green-900 dark:bg-green-950 dark:text-green-100",
  },
};

export function AlertasEAvisosCard({ alertas }: AlertasEAvisosCardProps) {
  return (
    <Card className="overflow-hidden rounded border-zinc-200 p-0 shadow-[0_1px_2px_rgba(0,0,0,0.12),0_3px_8px_rgba(0,0,0,0.06)] dark:border-zinc-700">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-700">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold"><span className="grid size-8 place-items-center bg-[#d83b01] text-white"><AlertTriangle className="size-4" aria-hidden="true" /></span>Alertas e avisos</h2>
        <Link
          href="/solicitacoes"
          className="text-xs font-semibold text-secp-blue-700 hover:underline"
        >
          Ver todos
        </Link>
      </div>
      <div className="grid gap-1.5 p-3 md:grid-cols-3">
        {alertas.map((alerta) => {
          const Icon = styles[alerta.tipo].icon;

          return (
            <article
              key={alerta.titulo}
              className={`rounded-md border p-2 ${styles[alerta.tipo].className}`}
            >
              <div className="flex gap-2">
                <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div>
                  <h3 className="text-xs font-bold">{alerta.titulo}</h3>
                  <p className="mt-1 line-clamp-3 text-xs leading-4">
                    {alerta.descricao}
                  </p>
                  {alerta.acao && (
                    <Link
                      href={alerta.acao.href}
                      className="mt-2 inline-flex text-xs font-semibold underline"
                    >
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
