"use client";

import { useState, type ReactNode } from "react";
import { DatabaseZap, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AbaMarcacoesBrutas = "marcacoes" | "reprocessamento";

export function MarcacoesBrutasPageTabs({
  marcacoes,
  reprocessamento,
}: {
  marcacoes: ReactNode;
  reprocessamento?: ReactNode;
}) {
  const [aba, setAba] = useState<AbaMarcacoesBrutas>("marcacoes");

  return (
    <Tabs
      value={aba}
      onValueChange={(value) => setAba(value as AbaMarcacoesBrutas)}
      className="space-y-4"
    >
      <TabsList
        aria-label="Marcações brutas"
        className="flex h-auto flex-wrap justify-start rounded-xl border bg-[var(--card)] p-2 shadow-sm"
      >
        <TabsTrigger value="marcacoes" className="gap-2">
          <DatabaseZap className="size-4" aria-hidden="true" />
          Marcações brutas
        </TabsTrigger>
        {reprocessamento ? (
          <TabsTrigger value="reprocessamento" className="gap-2">
            <RefreshCw className="size-4" aria-hidden="true" />
            Reprocessamento
          </TabsTrigger>
        ) : null}
      </TabsList>

      <TabsContent value="marcacoes">{marcacoes}</TabsContent>
      {reprocessamento ? (
        <TabsContent value="reprocessamento">{reprocessamento}</TabsContent>
      ) : null}
    </Tabs>
  );
}
