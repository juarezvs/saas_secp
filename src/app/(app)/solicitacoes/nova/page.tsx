import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { SolicitacaoForm } from "@/modules/solicitacoes/presentation/components/solicitacao-form";
import { SolicitacaoStepper } from "@/modules/solicitacoes/presentation/components/solicitacao-stepper";

export default async function NovaSolicitacaoPage() {
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Solicitações", href: "/solicitacoes" },
          { label: "Nova solicitação" },
        ]}
      />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Solicitações e aprovações
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Nova solicitação
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
          Preencha os dados abaixo. O sistema localizará a chefia responsável
          pela unidade de lotação atual e encaminhará a solicitação.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Art. 18, inciso IV"
        titulo="Correção de falha na marcação"
        descricao="O sistema deve permitir a correção de falha na marcação eletrônica relativa à entrada ou saída quando, por qualquer motivo, o registro não tiver sido capturado corretamente."
      />

      <SolicitacaoStepper status="ENVIADA" />

      <SolicitacaoForm />
    </div>
  );
}