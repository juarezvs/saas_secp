"use client";

import { useState } from "react";
import { UserCheck } from "lucide-react";

import { Card, Label, Select } from "@/components/ui";

const chefias = ["Mariana Alves", "Carlos Nogueira", "Delegado da chefia"];

export function ChefiaRecessoSelectorMock() {
  const [chefia, setChefia] = useState(chefias[0]);

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <UserCheck className="size-5 text-secp-blue-700" aria-hidden="true" />
        <h2 className="text-lg font-semibold">Chefia específica do recesso</h2>
      </div>
      <div className="mt-4 space-y-2">
        <Label htmlFor="chefia-recesso">Responsável mockado</Label>
        <Select id="chefia-recesso" value={chefia} onChange={(event) => setChefia(event.target.value)}>
          {chefias.map((item) => <option key={item}>{item}</option>)}
        </Select>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">A chefia do recesso pode ser diferente da chefia ordinária.</p>
    </Card>
  );
}

