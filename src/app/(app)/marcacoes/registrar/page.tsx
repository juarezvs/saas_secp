import Link from "next/link";
import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { RegistrarPontoCard } from "@/modules/marcacoes/presentation/components/registrar-ponto-card";
import { MarcacoesDiaCard } from "@/modules/marcacoes/presentation/components/marcacoes-dia-card";
import { listarMarcacoesDoUsuarioNoDia } from "@/modules/marcacoes/infrastructure/repositories/marcacao.repository";
import { classificarProximaMarcacao } from "@/modules/marcacoes/application/services/classificar-marcacao.service";
import { ValidacaoFacialCardClientOnly } from "@/modules/biometria/presentation/components/biometria-client-only";

export default async function RegistrarMarcacaoPage() {
  const session = await auth();

  const permissoes = session?.user?.perfilAtivo?.permissoes ?? [];

  const podeRegistrarWeb = permissoes.includes(
    "marcacoes:registrar-web:proprio",
  );

  const podeRegistrarFacial = permissoes.includes(
    "marcacoes:registrar-facial:proprio",
  );

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
          Registre sua marcação de ponto quando houver autorização específica
          para uso do sistema web ou reconhecimento facial.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Art. 6º"
        titulo="Registro eletrônico de frequência"
        descricao="O registro eletrônico de frequência é realizado em sistema próprio, preferencialmente por equipamento biométrico integrado, com possibilidade de meio alternativo idôneo em situações de impossibilidade técnica."
      />

      {servidor ? (
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

              {exigeReconhecimentoFacial && podeRegistrarFacial && (
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  A próxima marcação poderá exigir reconhecimento facial,
                  conforme regra aplicada ao registro.
                </p>
              )}
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <h2 className="font-bold">Servidor não encontrado</h2>

          <p className="mt-2 text-sm leading-6">
            O usuário autenticado ainda não possui cadastro de servidor ativo.
            Procure o administrador do sistema ou o NUTEC.
          </p>
        </section>
      )}

      {!podeRegistrarWeb && !podeRegistrarFacial && (
        <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
          <h2 className="text-lg font-bold">
            Registro pelo sistema indisponível
          </h2>

          <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
            Seu registro ordinário de frequência deve ser realizado pelos
            equipamentos biométricos da unidade. O registro pelo sistema web ou
            por reconhecimento facial depende de autorização específica.
          </p>
        </section>
      )}

      {podeRegistrarWeb && servidor && <RegistrarPontoCard />}

      {podeRegistrarFacial && servidor && (
        <ValidacaoFacialCardClientOnly servidorId={servidor.id} />
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