import { RadioTower } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { PERMISSOES_TOTEM_REGISTRO } from "@/modules/totem/application/totem-permissoes";
import { TotemFacialClient } from "@/modules/totem/presentation/totem-facial-client";

export default async function TotemPage() {
  await exigirUmaDasPermissoesOuRedirecionar(PERMISSOES_TOTEM_REGISTRO);

  return (
    <div className="space-y-5">
      <Breadcrumb items={[{ label: "Modo Totem" }]} />
      <PageHeader
        icon={RadioTower}
        titulo="Modo Totem"
        descricao="Registro facial coletivo para ambientes controlados, com reconhecimento continuo pela camera."
      />
      <TotemFacialClient />
    </div>
  );
}
