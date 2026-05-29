import Link from "next/link";
import { ScanFace, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { buscarServidorBiometriaPorUsuarioId } from "@/modules/biometria/infrastructure/repositories/biometria.repository";
import { ValidacaoFacialCardClientOnly } from "@/modules/biometria/presentation/components/biometria-client-only";

export default async function BiometriaPage() {
  const session = await auth();

  const servidor = session?.user
    ? await buscarServidorBiometriaPorUsuarioId(session.user.id)
    : null;

  const biometria = servidor?.biometriaFacialServidor;

  const permissoes = session?.user.perfilAtivo?.permissoes ?? [];
  const podeCadastrarBiometria = permissoes.includes(
    "biometria:cadastrar:proprio",
  );

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Biometria Facial" }]} />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Biometria facial
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Validação facial
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-(--muted-foreground)">
          Consulte o status do cadastro facial e realize validação biométrica
          para reforço de autenticação.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Controle eletrônico de frequência"
        titulo="Identificação biométrica"
        descricao="A biometria facial complementa os mecanismos de autenticação e pode ser usada em fluxos autorizados de registro de frequência, totem e validação complementar."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border bg-(--card) p-5 shadow-sm">
          <ShieldCheck className="size-5 text-blue-900 dark:text-blue-300" />
          <p className="mt-3 text-sm text-(--muted-foreground)">
            Status do cadastro
          </p>
          <h2 className="mt-1 text-xl font-bold">
            {biometria?.status ?? "Não cadastrado"}
          </h2>
        </article>

        <article className="rounded-xl border bg-(--card) p-5 shadow-sm">
          <ScanFace className="size-5 text-blue-900 dark:text-blue-300" />
          <p className="mt-3 text-sm text-(--muted-foreground)">Amostras</p>
          <h2 className="mt-1 text-xl font-bold">
            {biometria?.amostrasQuantidade ?? 0}
          </h2>
        </article>

        <article className="rounded-xl border bg-(--card) p-5 shadow-sm">
          <p className="text-sm text-(--muted-foreground)">Qualidade média</p>
          <h2 className="mt-1 text-xl font-bold">
            {typeof biometria?.qualidadeMedia === "number"
              ? biometria.qualidadeMedia.toFixed(2)
              : "-"}
          </h2>
        </article>
      </section>

      {!biometria || biometria.status !== "ATIVO" ? (
        podeCadastrarBiometria && (
          <section className="rounded-xl border bg-(--card) p-5 shadow-sm">
            <h2 className="text-lg font-bold">Cadastro facial necessário</h2>

            <p className="mt-2 text-sm text-(--muted-foreground)">
              Você ainda não possui biometria facial ativa.
            </p>

            <Link
              href="/biometria/cadastro"
              className="mt-4 inline-flex rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950"
            >
              Cadastrar biometria facial
            </Link>
          </section>
        )
      ) : (
        <>
          <section className="rounded-xl border bg-(--card) p-5 shadow-sm">
            <h2 className="text-lg font-bold">Cadastro facial ativo</h2>

            <p className="mt-2 text-sm leading-6 text-(--muted-foreground)">
              Sua biometria facial está ativa. Caso tenha dificuldade na
              validação, alteração significativa de aparência ou necessidade
              administrativa, você pode recadastrar sua biometria facial.
            </p>

            <Link
              href="/biometria/cadastro?modo=recadastro"
              className="mt-4 inline-flex rounded-md border px-4 py-2 text-sm font-semibold transition hover:bg-(--muted)"
            >
              Recadastrar biometria facial
            </Link>
          </section>

          <ValidacaoFacialCardClientOnly />
        </>
      )}
    </div>
  );
}
