import { CalendarClock } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { criarJornadaAction } from "@/modules/jornadas/application/actions/criar-jornada.action";
import { JornadaForm } from "@/modules/jornadas/presentation/components/jornada-form";

export default async function NovaJornadaPage() {
  await exigirPermissaoOuRedirecionar("jornadas:gerenciar:global");

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Jornadas", href: "/jornadas" },
          { label: "Nova jornada" },
        ]}
      />

      <PageHeader
        icon={CalendarClock}
        titulo="Nova jornada"
        descricao="Cadastre jornadas ordinárias, especiais, flexíveis ou cíclicas que poderão ser atribuídas aos servidores."
        artigo="Art. 4"
        regraTitulo="Jornada de 7h ou 8h"
        regraDescricao="A Portaria prevê jornada de 7 horas ininterruptas ou de 8 horas em dois turnos, com intervalo regulamentar para repouso e alimentação."
      />

      <JornadaForm
        action={criarJornadaAction}
        modo="criar"
        valoresIniciais={{
          tipo: "SETE_HORAS",
          cargaDiariaMinutos: 420,
          horarioEntradaPadrao: "08:00",
          horarioSaidaPadrao: "15:00",
          ativo: true,
          horarioDiferenciadoPermitido: true,
          entradaMinimaDiferenciada: "06:00",
          saidaMaximaDiferenciada: "19:00",
        }}
      />
    </div>
  );
}
