"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EquipamentosBiometricosTable } from "./equipamentos-biometricos-table";
import { RelogioPontoAdminPanel } from "./relogio-ponto-admin-panel";

type EquipamentoItem =
  Parameters<typeof EquipamentosBiometricosTable>[0]["equipamentos"][number];
type ColetaAtivaItem =
  Parameters<typeof EquipamentosBiometricosTable>[0]["coletasAtivas"][number];
type StatusListenerOnline =
  Parameters<typeof EquipamentosBiometricosTable>[0]["statusListenerOnline"];

export function EquipamentosPageTabs({
  equipamentos,
  coletasAtivas,
  statusListenerOnline,
}: {
  equipamentos: EquipamentoItem[];
  coletasAtivas: ColetaAtivaItem[];
  statusListenerOnline: StatusListenerOnline;
}) {
  const [aba, setAba] = useState<"listagem" | "operacoes">("listagem");
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, 15000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2 rounded-xl border bg-[var(--card)] p-2 shadow-sm">
        <button
          type="button"
          onClick={() => setAba("listagem")}
          className={`rounded-md px-4 py-2 text-sm font-semibold ${
            aba === "listagem"
              ? "bg-blue-900 text-white"
              : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Listagem
        </button>
        <button
          type="button"
          onClick={() => setAba("operacoes")}
          className={`rounded-md px-4 py-2 text-sm font-semibold ${
            aba === "operacoes"
              ? "bg-blue-900 text-white"
              : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Operações dos relógios de ponto
        </button>
      </div>

      {aba === "listagem" ? (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Link
              href="/equipamentos/novo"
              className="inline-flex items-center justify-center rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950"
            >
              Novo equipamento
            </Link>
          </div>
          <EquipamentosBiometricosTable
            equipamentos={equipamentos}
            coletasAtivas={coletasAtivas}
            statusListenerOnline={statusListenerOnline}
          />
        </div>
      ) : (
        <RelogioPontoAdminPanel
          equipamentos={equipamentos}
          coletasAtivas={coletasAtivas}
          statusListenerOnline={statusListenerOnline}
        />
      )}
    </section>
  );
}
