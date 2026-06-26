import { notFound } from "next/navigation";
import { CalendarDays } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { atualizarCalendarioInstitucionalAction } from "@/modules/calendario-institucional/application/actions/atualizar-calendario-institucional.action";
import { buscarEventoCalendarioInstitucionalPorId } from "@/modules/calendario-institucional/infrastructure/repositories/calendario-institucional.repository";
import { CalendarioInstitucionalForm } from "@/modules/calendario-institucional/presentation/components/calendario-institucional-form";

type EditarCalendarioInstitucionalPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function dataParaInput(data: Date) {
  return data.toISOString().slice(0, 10);
}

export default async function EditarCalendarioInstitucionalPage({
  params,
}: EditarCalendarioInstitucionalPageProps) {
  await exigirPermissaoOuRedirecionar("configuracoes:gerenciar:global");

  const { id } = await params;
  const evento = await buscarEventoCalendarioInstitucionalPorId(id);

  if (!evento) {
    notFound();
  }

  const action = atualizarCalendarioInstitucionalAction.bind(null, evento.id);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          {
            label: "Calendário institucional",
            href: "/administracao/calendario",
          },
          { label: "Editar" },
        ]}
      />

      <PageHeader
        icon={CalendarDays}
        titulo="Editar evento institucional"
        descricao="Ajuste a classificação do dia e os seus efeitos sobre prazos e apuração ordinária."
      />

      <CalendarioInstitucionalForm
        action={action}
        modo="editar"
        valoresIniciais={{
          dataReferencia: dataParaInput(evento.dataReferencia),
          descricao: evento.descricao,
          tipo: evento.tipo,
          contaComoDiaUtil: evento.contaComoDiaUtil,
          geraApuracaoRegular: evento.geraApuracaoRegular,
          janelaInicio: evento.janelaInicio,
          janelaFim: evento.janelaFim,
          dataOriginal: evento.dataOriginal
            ? dataParaInput(evento.dataOriginal)
            : "",
          dataSubstituida: evento.dataSubstituida,
          observacao: evento.observacao,
          ativo: evento.ativo,
        }}
      />
    </div>
  );
}
