import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
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

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Jornada e escala
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Nova jornada
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
          Cadastre jornadas ordinárias ou especiais que poderão ser atribuídas
          aos servidores.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Art. 4º"
        titulo="Jornada de 7h ou 8h"
        descricao="A Portaria prevê jornada de 7 horas ininterruptas ou de 8 horas em dois turnos, com intervalo regulamentar para repouso e alimentação."
      />

      <JornadaForm
        action={criarJornadaAction}
        modo="criar"
        valoresIniciais={{
          tipo: "SETE_HORAS",
          cargaDiariaMinutos: 420,
          ativo: true,
          horarioDiferenciadoPermitido: true,
          entradaMinimaDiferenciada: "06:00",
          saidaMaximaDiferenciada: "19:00",
        }}
      />
    </div>
  );
}