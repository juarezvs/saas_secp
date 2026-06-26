import { notFound } from "next/navigation";
import { CalendarDays, Trash2 } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { atualizarCalendarioInstitucionalAction } from "@/modules/calendario-institucional/application/actions/atualizar-calendario-institucional.action";
import { excluirCalendarioInstitucionalAction } from "@/modules/calendario-institucional/application/actions/excluir-calendario-institucional.action";
import { buscarEventoCalendarioInstitucionalPorId } from "@/modules/calendario-institucional/infrastructure/repositories/calendario-institucional.repository";
import { CalendarioInstitucionalForm } from "@/modules/calendario-institucional/presentation/components/calendario-institucional-form";
import {
  listarOrgaosAtivos,
  listarUnidadesParaSelecao,
} from "@/modules/unidades/infrastructure/repositories/unidade.repository";

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
  const [evento, orgaos, unidades] = await Promise.all([
    buscarEventoCalendarioInstitucionalPorId(id),
    listarOrgaosAtivos(),
    listarUnidadesParaSelecao(),
  ]);

  if (!evento) {
    notFound();
  }

  const action = atualizarCalendarioInstitucionalAction.bind(null, evento.id);
  const excluirAction = excluirCalendarioInstitucionalAction.bind(null, evento.id);

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
        orgaos={orgaos}
        unidades={unidades}
        valoresIniciais={{
          dataReferencia: dataParaInput(evento.dataReferencia),
          descricao: evento.descricao,
          tipo: evento.tipo,
          abrangencia: evento.abrangencia,
          uf: evento.uf,
          municipio: evento.municipio,
          municipioIbge: evento.municipioIbge,
          orgaoId: evento.orgaoId,
          unidadeId: evento.unidadeId,
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

      <section className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-950 shadow-sm dark:border-red-900 dark:bg-red-950 dark:text-red-100">
        <h2 className="text-lg font-bold">Excluir evento institucional</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6">
          A exclusao remove o feriado, ponto facultativo ou suspensao do
          calendario e dispara o recalculo do espelho de ponto e banco de horas
          dos servidores afetados pelo escopo deste evento.
        </p>
        <form action={excluirAction} className="mt-4">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Excluir e recalcular reflexos
          </button>
        </form>
      </section>
    </div>
  );
}
