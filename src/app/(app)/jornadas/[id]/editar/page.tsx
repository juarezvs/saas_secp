import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { atualizarJornadaAction } from "@/modules/jornadas/application/actions/atualizar-jornada.action";
import { buscarJornadaPorId } from "@/modules/jornadas/infrastructure/repositories/jornada.repository";
import { JornadaForm } from "@/modules/jornadas/presentation/components/jornada-form";

type EditarJornadaPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditarJornadaPage({
  params,
}: EditarJornadaPageProps) {
  await exigirPermissaoOuRedirecionar("jornadas:gerenciar:global");

  const { id } = await params;
  const jornada = await buscarJornadaPorId(id);

  if (!jornada) {
    notFound();
  }

  const action = atualizarJornadaAction.bind(null, jornada.id);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Jornadas", href: "/jornadas" },
          { label: jornada.codigo, href: `/jornadas/${jornada.id}` },
          { label: "Editar" },
        ]}
      />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Jornada e escala
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Editar jornada
        </h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
          Atualize os parâmetros usados para apuração futura de frequência.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Art. 18, inciso I"
        titulo="Escalas individuais e horário diferenciado"
        descricao="A Portaria prevê que, havendo viabilidade técnica, o sistema cadastre escalas individuais e jornadas de horário diferenciado."
      />

      <JornadaForm
        action={action}
        modo="editar"
        valoresIniciais={{
          codigo: jornada.codigo,
          nome: jornada.nome,
          descricao: jornada.descricao,
          tipo: jornada.tipo,
          cargaDiariaMinutos: jornada.cargaDiariaMinutos,
          exigeIntervalo: jornada.exigeIntervalo,
          intervaloMinimoMinutos: jornada.intervaloMinimoMinutos,
          intervaloMaximoMinutos: jornada.intervaloMaximoMinutos,
          horarioEntradaPadrao: jornada.horarioEntradaPadrao,
          horarioSaidaPadrao: jornada.horarioSaidaPadrao,
          horarioDiferenciadoPermitido: jornada.horarioDiferenciadoPermitido,
          entradaMinimaDiferenciada: jornada.entradaMinimaDiferenciada,
          saidaMaximaDiferenciada: jornada.saidaMaximaDiferenciada,
          ativo: jornada.ativo,
        }}
      />
    </div>
  );
}