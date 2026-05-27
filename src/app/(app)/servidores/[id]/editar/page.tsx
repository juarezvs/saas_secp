import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { atualizarServidorAction } from "@/modules/servidores/application/actions/atualizar-servidor.action";
import {
  buscarServidorPorId,
  listarOrgaosAtivosParaServidor,
} from "@/modules/servidores/infrastructure/repositories/servidor.repository";
import { ServidorForm } from "@/modules/servidores/presentation/components/servidor-form";

type EditarServidorPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditarServidorPage({
  params,
}: EditarServidorPageProps) {
  await exigirPermissaoOuRedirecionar("servidores:gerenciar:global");

  const { id } = await params;

  const [servidor, orgaos] = await Promise.all([
    buscarServidorPorId(id),
    listarOrgaosAtivosParaServidor(),
  ]);

  if (!servidor) {
    notFound();
  }

  const action = atualizarServidorAction.bind(null, servidor.id);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: "Servidores", href: "/servidores" },
          { label: servidor.matricula, href: `/servidores/${servidor.id}` },
          { label: "Editar" },
        ]}
      />

      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
          Cadastro funcional
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Editar servidor
        </h1>

        <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--muted-foreground)]">
          Atualize os dados cadastrais e funcionais do servidor.
        </p>
      </section>

      <RegraPortariaCard
        artigo="Art. 8º"
        titulo="Cadastro funcional e jornada"
        descricao="O cadastro funcional será usado nas próximas etapas para definição de jornada, escala, apuração mensal e registro eletrônico de frequência."
      />

      <ServidorForm
        action={action}
        orgaos={orgaos}
        modo="editar"
        valoresIniciais={{
          orgaoId: servidor.orgaoId,
          matricula: servidor.matricula,
          nome: servidor.usuario.nome,
          email: servidor.usuario.email,
          nomeFuncional: servidor.nomeFuncional,
          vinculo: servidor.vinculo,
          ativo: servidor.ativo,
        }}
      />
    </div>
  );
}