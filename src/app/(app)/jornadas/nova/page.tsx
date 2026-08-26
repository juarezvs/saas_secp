import { CalendarClock } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { criarJornadaAction } from "@/modules/jornadas/application/actions/criar-jornada.action";
import { HorarioForm } from "@/modules/jornadas/presentation/components/horario-form";

export default async function NovaJornadaPage() {
  await exigirPermissaoOuRedirecionar("jornadas:gerenciar:global");

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Horário de Trabalho", href: "/jornadas" },
          { label: "Novo horário" },
        ]}
      />

      <PageHeader
        icon={CalendarClock}
        titulo="Novo horário"
        descricao="Cadastre o horário de trabalho que poderá ser associado às pessoas."
        artigo="Art. 4"
        regraTitulo="Horário de trabalho"
        regraDescricao="O cadastro do horário define a carga prevista e as faixas de trabalho usadas na apuração."
      />

      <HorarioForm
        action={criarJornadaAction}
        modo="criar"
        valoresIniciais={{
          tipo: "FIXA_SEMANAL",
          cargaDiariaMinutos: 480,
          horarioEntradaPadrao: "08:00",
          horarioSaidaPadrao: "17:00",
          ativo: true,
          horarioDiferenciadoPermitido: true,
          entradaMinimaDiferenciada: "06:00",
          saidaMaximaDiferenciada: "19:00",
        }}
      />
    </div>
  );
}
