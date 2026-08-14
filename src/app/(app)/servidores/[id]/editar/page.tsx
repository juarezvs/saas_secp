import Image from "next/image";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { atualizarServidorAction } from "@/modules/servidores/application/actions/atualizar-servidor.action";
import { buscarFotoServidorDataUrl } from "@/modules/servidores/application/services/foto-servidor.service";
import {
  buscarServidorPorId,
  listarCategoriasPessoasAtivas,
  listarOrgaosAtivosParaServidor,
} from "@/modules/servidores/infrastructure/repositories/servidor.repository";
import { ServidorForm } from "@/modules/servidores/presentation/components/servidor-form";
import {
  descricaoCargoServidor,
  descricaoFuncaoServidor,
} from "@/modules/servidores/application/services/funcao-cargo-servidor.service";

type EditarServidorPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const ROTULOS_TIPO_PESSOA: Record<
  string,
  {
    breadcrumb: string;
    href: string;
    singular: string;
    cadastro: string;
  }
> = {
  SERVIDOR: {
    breadcrumb: "Pessoas",
    href: "/servidores",
    singular: "pessoa",
    cadastro: "Gestão de pessoas",
  },
  ESTAGIARIO: {
    breadcrumb: "Pessoas",
    href: "/servidores",
    singular: "pessoa",
    cadastro: "Gestão de pessoas",
  },
  PRESTADOR: {
    breadcrumb: "Pessoas",
    href: "/servidores",
    singular: "pessoa",
    cadastro: "Gestão de pessoas",
  },
  VOLUNTARIO: {
    breadcrumb: "Pessoas",
    href: "/servidores",
    singular: "pessoa",
    cadastro: "Gestão de pessoas",
  },
};

export default async function EditarServidorPage({
  params,
}: EditarServidorPageProps) {
  await exigirPermissaoOuRedirecionar("servidores:gerenciar:global");

  const { id } = await params;
  const escopoOrgao = await obterEscopoOrgaoDaSessao();
  const orgaoIdsPermitidos = escopoOrgao.global
    ? undefined
    : escopoOrgao.orgaoIds.length
      ? escopoOrgao.orgaoIds
      : ["00000000-0000-4000-8000-000000000000"];

  const [servidor, orgaos, categorias] = await Promise.all([
    buscarServidorPorId(id),
    listarOrgaosAtivosParaServidor({ orgaoIdsPermitidos }),
    listarCategoriasPessoasAtivas({ orgaoIdsPermitidos }),
  ]);

  if (!servidor) {
    notFound();
  }

  const action = atualizarServidorAction.bind(null, servidor.id);
  const rotuloPessoa =
    ROTULOS_TIPO_PESSOA[servidor.usuario.tipo] ?? ROTULOS_TIPO_PESSOA.SERVIDOR;
  const fotoCpf = servidor.cpf ?? servidor.usuario.cpf;
  const fotoSrc = await buscarFotoServidorDataUrl(fotoCpf);
  const cargoDescricao = descricaoCargoServidor(servidor);
  const funcaoDescricao = descricaoFuncaoServidor(servidor);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: rotuloPessoa.breadcrumb, href: rotuloPessoa.href },
          { label: servidor.matricula, href: `/servidores/${servidor.id}` },
          { label: "Editar" },
        ]}
      />

      <section className="rounded-xl border bg-[var(--card)] p-5 text-[var(--card-foreground)] shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {fotoSrc ? (
              <Image
                src={fotoSrc}
                alt=""
                width={80}
                height={80}
                unoptimized
                className="size-20 shrink-0 rounded-full border-4 border-white bg-slate-100 object-cover shadow-sm ring-2 ring-blue-100 dark:border-slate-950 dark:bg-slate-800 dark:ring-blue-900/60"
                priority
              />
            ) : (
              <span className="flex size-20 shrink-0 items-center justify-center rounded-full border-4 border-white bg-slate-100 text-xl font-bold text-slate-600 shadow-sm ring-2 ring-blue-100 dark:border-slate-950 dark:bg-slate-800 dark:text-slate-300 dark:ring-blue-900/60">
                {servidor.matricula.slice(0, 2).toUpperCase()}
              </span>
            )}

            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
                {rotuloPessoa.cadastro}
              </p>

              <h1 className="mt-1 truncate text-2xl font-bold tracking-tight sm:text-3xl">
                {servidor.nomeFuncional ?? servidor.usuario.nome}
              </h1>

              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Edite dados cadastrais, vínculo, categoria e identificadores de
                ponto.
              </p>
            </div>
          </div>

          <div className="grid gap-3 text-sm sm:grid-cols-2 lg:min-w-[28rem]">
            <InfoResumo label="Matrícula" value={servidor.matricula} />
            <InfoResumo label="Órgão" value={servidor.orgao.sigla} />
            <InfoResumo
              label="Categoria"
              value={servidor.categoriaPessoa?.nome ?? "-"}
            />
            <InfoResumo
              label="Status"
              value={servidor.ativo ? "Ativo" : "Inativo"}
            />
          </div>
        </div>

        {(cargoDescricao || funcaoDescricao) && (
          <div className="mt-5 grid gap-3 border-t pt-4 text-sm md:grid-cols-2">
            {cargoDescricao && (
              <InfoResumo label="Cargo" value={cargoDescricao} />
            )}
            {funcaoDescricao && (
              <InfoResumo label="Função" value={funcaoDescricao} />
            )}
          </div>
        )}
      </section>

      <ServidorForm
        action={action}
        orgaos={orgaos}
        categorias={categorias}
        modo="editar"
        valoresIniciais={{
          orgaoId: servidor.orgaoId,
          categoriaPessoaId: servidor.categoriaPessoaId,
          matricula: servidor.matricula,
          cpf: servidor.cpf || "",
          pis: servidor.pis || "",
          nome: servidor.usuario.nome,
          email: servidor.usuario.email,
          nomeFuncional: servidor.nomeFuncional,
          vinculo: servidor.vinculo,
          cargoDescricao,
          funcaoDescricao,
          descricaoProvimentoSarh: servidor.descricaoProvimentoSarh,
          descricaoSituacaoSarh: servidor.descricaoSituacaoSarh,
          sinalizacaoForaExpediente:
            servidor.horasForaExpedienteInconsistente === null
              ? "PADRAO"
              : servidor.horasForaExpedienteInconsistente
                ? "SINALIZAR"
                : "NAO_SINALIZAR",
          ativo: servidor.ativo,
          identificadoresPonto: servidor.identificadoresPonto.map(
            (identificador) => identificador.valor,
          ),
        }}
      />
    </div>
  );
}

function InfoResumo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-[var(--muted)] px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
        {label}
      </p>
      <p className="mt-1 truncate font-semibold">{value}</p>
    </div>
  );
}
