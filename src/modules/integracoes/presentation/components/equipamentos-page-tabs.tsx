"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EquipamentosBiometricosTable } from "./equipamentos-biometricos-table";
import { RelogioPontoAdminPanel } from "./relogio-ponto-admin-panel";

type EquipamentoItem =
  Parameters<typeof EquipamentosBiometricosTable>[0]["equipamentos"][number];
type ColetaAtivaItem =
  Parameters<typeof EquipamentosBiometricosTable>[0]["coletasAtivas"][number];
type StatusListenerOnline =
  Parameters<typeof EquipamentosBiometricosTable>[0]["statusListenerOnline"];

type AbaEquipamentos = "listagem" | "operacoes";

export function EquipamentosPageTabs({
  equipamentos,
  coletasAtivas,
  statusListenerOnline,
  orgaoId,
}: {
  equipamentos: EquipamentoItem[];
  coletasAtivas: ColetaAtivaItem[];
  statusListenerOnline: StatusListenerOnline;
  orgaoId?: string | null;
}) {
  const [aba, setAba] = useState<AbaEquipamentos>("listagem");
  const router = useRouter();
  const novoEquipamentoHref = orgaoId
    ? `/equipamentos/novo?${new URLSearchParams({ orgaoId }).toString()}`
    : "/equipamentos/novo";

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, 15000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <Tabs
      value={aba}
      onValueChange={(value) => setAba(value as AbaEquipamentos)}
      className="space-y-4"
    >
      <TabsList className="flex h-auto flex-wrap justify-start rounded-xl border bg-[var(--card)] p-2 shadow-sm">
        <TabsTrigger value="listagem">Listagem</TabsTrigger>
        <TabsTrigger value="operacoes">
          Operações dos relógios de ponto
        </TabsTrigger>
      </TabsList>

      <TabsContent value="listagem">
        <div className="space-y-6">
          <div className="flex justify-end">
            <Link
              href={novoEquipamentoHref}
              className="inline-flex items-center justify-center rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950"
            >
              Novo equipamento
            </Link>
          </div>
          <EquipamentosBiometricosTable
            equipamentos={equipamentos}
            coletasAtivas={coletasAtivas}
            statusListenerOnline={statusListenerOnline}
            orgaoId={orgaoId}
          />
        </div>
      </TabsContent>

      <TabsContent value="operacoes">
        <RelogioPontoAdminPanel
          equipamentos={equipamentos}
          coletasAtivas={coletasAtivas}
          statusListenerOnline={statusListenerOnline}
        />
      </TabsContent>
    </Tabs>
  );
}
