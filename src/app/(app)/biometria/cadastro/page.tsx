import { ScanFace } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { CadastroFacialEnrollmentWizardClientOnly } from "@/modules/biometria/presentation/components/biometria-client-only";

type CadastroBiometriaPageProps = {
  searchParams?: Promise<{
    modo?: string;
  }>;
};

export default async function CadastroBiometriaPage({
  searchParams,
}: CadastroBiometriaPageProps) {
  await exigirUmaDasPermissoesOuRedirecionar([
    "biometriafacial:cadastrar:proprio",
    "biometriafacial:recadastrar:proprio",
    "biometria:cadastrar:proprio",
    "biometria:gerenciar:global",
  ]);

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

      <PageHeader
        icon={ScanFace}
        titulo={recadastro ? "Recadastro facial" : "Cadastro facial"}
        descricao={
          recadastro
            ? "Capture novas amostras faciais para substituir o template biométrico atualmente ativo."
            : "Capture amostras faciais para criacao do template biométrico do servidor autenticado."
        }
        artigo="Segurança e rastreabilidade"
        regraTitulo={
          recadastro ? "Substituicao do template facial" : "Template facial"
        }
        regraDescricao={
          recadastro
            ? "O recadastro substitui o template facial ativo por um novo template numérico, mantendo a rastreabilidade do evento em auditoria."
            : "O cadastro armazena apenas o template numérico necessário a comparação biometrica, evitando persistência de imagem bruta."
        }
      />

      <CadastroFacialEnrollmentWizardClientOnly
        modo={recadastro ? "recadastro" : "cadastro"}
      />
    </div>
  );
}
