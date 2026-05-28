import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { CadastroFacialWizardClientOnly } from "@/modules/biometria/presentation/components/biometria-client-only";

type CadastroBiometriaPageProps = {
  searchParams?: Promise<{
    modo?: string;
  }>;
};

export default async function CadastroBiometriaPage({
  searchParams,
}: CadastroBiometriaPageProps) {
  const params = searchParams ? await searchParams : {};
  const recadastro = params.modo === "recadastro";

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Biometria Facial", href: "/biometria" },
          { label: recadastro ? "Recadastro facial" : "Cadastro facial" },
        ]}
      />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Biometria facial
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          {recadastro ? "Recadastro facial" : "Cadastro facial"}
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
          {recadastro
            ? "Capture novas amostras faciais para substituir o template biométrico atualmente ativo."
            : "Capture amostras faciais para criação do template biométrico do servidor autenticado."}
        </p>
      </section>

      <RegraPortariaCard
        artigo="Segurança e rastreabilidade"
        titulo={
          recadastro ? "Substituição do template facial" : "Template facial"
        }
        descricao={
          recadastro
            ? "O recadastro substituirá o template facial ativo por um novo template numérico, mantendo a rastreabilidade do evento em auditoria."
            : "O cadastro deve armazenar apenas o template numérico necessário à comparação biométrica, evitando persistência de imagem bruta."
        }
      />

      <CadastroFacialWizardClientOnly />
    </div>
  );
}
