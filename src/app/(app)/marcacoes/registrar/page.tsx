import Link from "next/link";
import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { MarcacoesDiaCard } from "@/modules/marcacoes/presentation/components/marcacoes-dia-card";
import { listarMarcacoesDoUsuarioNoDia } from "@/modules/marcacoes/infrastructure/repositories/marcacao.repository";
import { classificarProximaMarcacao } from "@/modules/marcacoes/application/services/classificar-marcacao.service";
import { ValidacaoFacialCardClientOnly } from "@/modules/biometria/presentation/components/biometria-client-only";

export default async function RegistrarMarcacaoPage() {
  const session = await auth();

  const { servidor, marcacoes } = session?.user
    ? await listarMarcacoesDoUsuarioNoDia(session.user.id)
    : { servidor: null, marcacoes: [] };

  let proximaMarcacao: string | null = null;
  let exigeReconhecimentoFacial = false;

  try {
    const jornadaAtual = servidor?.jornadas[0]?.jornada;

    const classificacao = classificarProximaMarcacao({
      marcacoesDoDia: marcacoes,
      exigeIntervalo: jornadaAtual?.exigeIntervalo ?? true,
    });

    proximaMarcacao = classificacao.descricao;
    exigeReconhecimentoFacial = classificacao.exigeReconhecimentoFacial;
  } catch {
    proximaMarcacao = null;
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Marcações", href: "/marcacoes" },
          { label: "Registrar" },
        ]}
      />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Registro de ponto
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Registrar horário
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
          Valide sua biometria facial para liberar o registro da marcação de
          ponto. O sistema classificará automaticamente o tipo conforme a
          sequência cronológica do dia.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Art. 6º"
        titulo="Registro eletrônico de frequência"
        descricao="O registro eletrônico de frequência é realizado em sistema próprio, preferencialmente por equipamento biométrico integrado, com possibilidade de meio alternativo idôneo em situações de impossibilidade técnica."
      />

      {servidor ? (
        <>
          <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
            <h2 className="text-lg font-bold">Servidor identificado</h2>

            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              {servidor.usuario.nome} • Matrícula {servidor.matricula}
            </p>

            {servidor.lotacoes[0] && (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Lotação atual: {servidor.lotacoes[0].unidade.sigla} —{" "}
                {servidor.lotacoes[0].unidade.nome}
              </p>
            )}

            {proximaMarcacao && (
              <div className="mt-4 rounded-lg border bg-[var(--muted)] p-4 text-sm">
                Próxima marcação prevista: <strong>{proximaMarcacao}</strong>
                {exigeReconhecimentoFacial && (
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    Esta marcação exige validação facial antes do registro.
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
            <h2 className="text-lg font-bold">Validação facial obrigatória</h2>

            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              Capture e valide sua face. Após a validação, o sistema exibirá o
              botão para registrar a marcação. A autorização biométrica é
              temporária e será consumida no momento do registro.
            </p>
          </section>

          <ValidacaoFacialCardClientOnly />
        </>
      ) : (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <h2 className="font-bold">Servidor não encontrado</h2>

          <p className="mt-2 text-sm leading-6">
            O usuário autenticado ainda não possui cadastro de servidor ativo.
            Procure o administrador do sistema ou o NUTEC.
          </p>
        </section>
      )}

      <MarcacoesDiaCard marcacoes={marcacoes} />

      <div>
        <Link
          href="/marcacoes"
          className="text-sm font-semibold text-blue-900 hover:underline dark:text-blue-300"
        >
          Voltar para marcações
        </Link>
      </div>
    </div>
  );
}
