import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarClock, Edit, ShieldCheck, UserRound } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { RegraPortariaCard } from "@/components/ui/regra-portaria-card";
import {
  exigirUmaDasPermissoesOuRedirecionar,
  usuarioPossuiAlgumaPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import { PERMISSOES_ADMIN_BIOMETRIA_FACIAL_TERCEIROS } from "@/modules/auth/domain/constants/perfis-sistema";
import { perfilAtivoEhChefia } from "@/modules/auth/application/services/perfil-chefia.service";
import {
  buscarServidorComUsuarioPorUsuarioId,
  listarServidoresParaEspelhoPonto,
} from "@/modules/apuracao/infrastructure/repositories/apuracao.repository";
import { buscarResumoBiometriaFacialServidor } from "@/modules/biometria/infrastructure/repositories/biometria.repository";
import { buscarFotoServidorDataUrl } from "@/modules/servidores/application/services/foto-servidor.service";
import {
  descricaoCargoServidor,
  descricaoFuncaoServidor,
} from "@/modules/servidores/application/services/funcao-cargo-servidor.service";
import {
  buscarServidorPorId,
  contarAfastamentosServidorSarhPorGrupo,
  listarAfastamentosServidorSarhPaginado,
  listarUnidadesAtivasParaLotacao,
} from "@/modules/servidores/infrastructure/repositories/servidor.repository";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import {
  criarDispensaPontoServidorAction,
  encerrarDispensaPontoServidorAction,
} from "@/modules/servidores/application/actions/dispensa-ponto-servidor.action";
import { reprocessarIdentificadoresPontoServidorAction } from "@/modules/servidores/application/actions/reprocessar-identificadores-ponto-servidor.action";
import { resolverFusoHorarioServidorNoBanco } from "@/modules/servidores/application/services/fuso-horario-servidor.service";
import { vincularLotacaoAction } from "@/modules/servidores/application/actions/vincular-lotacao.action";
import { DispensaPontoServidorCard } from "@/modules/servidores/presentation/components/dispensa-ponto-servidor-card";
import { AfastamentosServidorCard } from "@/modules/servidores/presentation/components/afastamentos-servidor-card";
import { LotacaoForm } from "@/modules/servidores/presentation/components/lotacao-form";
import { ReprocessarIdentificadoresPontoButton } from "@/modules/servidores/presentation/components/reprocessar-identificadores-ponto-button";
import { ServidorLotacoesCard } from "@/modules/servidores/presentation/components/servidor-lotacoes-card";
import { ServidorBiometriaFacialCard } from "@/modules/servidores/presentation/components/servidor-biometria-facial-card";

type ServidorDetalhePageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    aba?: string;
    paginaAfastamentos?: string;
    paginaFerias?: string;
    paginaOutros?: string;
    abaAfastamentos?: string;
  }>;
};

type AbaServidor =
  | "dados"
  | "perfis"
  | "jornadas"
  | "lotacoes"
  | "biometria"
  | "afastamentos"
  | "ponto";
type AbaAfastamentos = "ferias" | "outros";

const ABAS_SERVIDOR: Array<{ valor: AbaServidor; label: string }> = [
  { valor: "dados", label: "Dados" },
  { valor: "perfis", label: "Perfis" },
  { valor: "jornadas", label: "Jornadas" },
  { valor: "lotacoes", label: "Lotações" },
  { valor: "biometria", label: "Biometria" },
  { valor: "afastamentos", label: "Afastamentos" },
  { valor: "ponto", label: "Ponto" },
];

const ABAS_SERVIDOR_VALIDAS = new Set<AbaServidor>(
  ABAS_SERVIDOR.map((aba) => aba.valor),
);

const ROTULOS_TIPO_PESSOA: Record<
  string,
  {
    breadcrumb: string;
    href: string;
    singular: string;
    singularTitulo: string;
  }
> = {
  SERVIDOR: {
    breadcrumb: "Servidores",
    href: "/servidores",
    singular: "servidor",
    singularTitulo: "Servidor",
  },
  ESTAGIARIO: {
    breadcrumb: "Estagiários",
    href: "/estagiarios",
    singular: "estagiário",
    singularTitulo: "Estagiário",
  },
  PRESTADOR: {
    breadcrumb: "Prestadores",
    href: "/prestadores",
    singular: "prestador",
    singularTitulo: "Prestador",
  },
  VOLUNTARIO: {
    breadcrumb: "Voluntarios",
    href: "/voluntarios",
    singular: "voluntario",
    singularTitulo: "Voluntario",
  },
};

function formatarData(data: Date | null) {
  if (!data) return "Atual";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(data);
}

function formatarCarga(minutos: number) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  return resto === 0 ? `${horas}h` : `${horas}h${resto}`;
}

function classeAba(ativa: boolean) {
  return [
    "inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-semibold transition",
    ativa
      ? "border-blue-900 bg-blue-900 text-white"
      : "border-border bg-card hover:bg-muted",
  ].join(" ");
}

export default async function ServidorDetalhePage({
  params,
  searchParams,
}: ServidorDetalhePageProps) {
  const permissoesSessao = await exigirUmaDasPermissoesOuRedirecionar([
    "servidores:gerenciar:global",
    "servidores:consultar:global",
    "homologacao:gerenciar:chefia",
    "minha-equipe:consultar:chefia",
    ...PERMISSOES_ADMIN_BIOMETRIA_FACIAL_TERCEIROS,
  ]);

  const { id } = await params;
  const query = searchParams ? await searchParams : {};
  const abaSolicitada = query.aba as AbaServidor | undefined;
  const abaAfastamentos: AbaAfastamentos =
    query.abaAfastamentos === "outros" ? "outros" : "ferias";
  const paginaFerias = Number(
    query.paginaFerias ?? query.paginaAfastamentos ?? 1,
  );
  const paginaOutros = Number(query.paginaOutros ?? 1);
  const paginaAfastamentos =
    abaAfastamentos === "ferias" ? paginaFerias : paginaOutros;
  const orgaoIdsPermitidos = permissoesSessao.perfilAtivoEscopoGlobal
    ? undefined
    : permissoesSessao.orgaoIds?.length
      ? permissoesSessao.orgaoIds
      : ["00000000-0000-4000-8000-000000000000"];

  const [servidor, unidades, resumoBiometria] = await Promise.all([
    buscarServidorPorId(id),
    listarUnidadesAtivasParaLotacao({ orgaoIdsPermitidos }),
    buscarResumoBiometriaFacialServidor(id),
  ]);

  if (!servidor) {
    return notFound();
  }

  const servidorId = servidor.id;
  const perfilCodigo = permissoesSessao.perfilAtivoCodigo;
  const permissoesAtivas = permissoesSessao.permissoes;
  const perfilChefiaAtivo = perfilAtivoEhChefia({
    perfilAtivoCodigo: perfilCodigo,
    permissoes: permissoesAtivas,
  });
  const [servidorProprio, servidoresChefia] = perfilChefiaAtivo
    ? await Promise.all([
        buscarServidorComUsuarioPorUsuarioId(permissoesSessao.usuarioId ?? ""),
        listarServidoresParaEspelhoPonto({
          usuarioId: permissoesSessao.usuarioId,
          escopo: "chefia",
        }),
      ])
    : [null, []];
  const servidorPermitidoParaChefia =
    !perfilChefiaAtivo ||
    servidorProprio?.id === servidorId ||
    servidoresChefia.some((item) => item.id === servidorId);

  if (!servidorPermitidoParaChefia) {
    return notFound();
  }

  const [afastamentosResultado, totalOutraAba] = await Promise.all([
    listarAfastamentosServidorSarhPaginado(servidorId, {
      pagina: paginaAfastamentos,
      grupo: abaAfastamentos,
    }),
    contarAfastamentosServidorSarhPorGrupo(
      servidorId,
      abaAfastamentos === "ferias" ? "outros" : "ferias",
    ),
  ]);
  const totalFerias =
    abaAfastamentos === "ferias" ? afastamentosResultado.total : totalOutraAba;
  const totalOutros =
    abaAfastamentos === "outros" ? afastamentosResultado.total : totalOutraAba;
  const podeGerenciarServidor = usuarioPossuiAlgumaPermissaoNoPerfil(
    perfilCodigo,
    permissoesAtivas,
    ["servidores:gerenciar:global"],
  );
  const abaServidor: AbaServidor =
    abaSolicitada && ABAS_SERVIDOR_VALIDAS.has(abaSolicitada)
      ? abaSolicitada === "ponto" && !podeGerenciarServidor
        ? "dados"
        : abaSolicitada
      : "dados";
  const permissoesBiometria = {
    podeCadastrar: usuarioPossuiAlgumaPermissaoNoPerfil(
      perfilCodigo,
      permissoesAtivas,
      ["biometriafacial:cadastrar:seccional"],
    ),
    podeRecadastrar: usuarioPossuiAlgumaPermissaoNoPerfil(
      perfilCodigo,
      permissoesAtivas,
      ["biometriafacial:recadastrar:seccional"],
    ),
    podeInvalidar: usuarioPossuiAlgumaPermissaoNoPerfil(
      perfilCodigo,
      permissoesAtivas,
      ["biometriafacial:invalidar:global"],
    ),
    podeVerAuditoria: usuarioPossuiAlgumaPermissaoNoPerfil(
      perfilCodigo,
      permissoesAtivas,
      ["biometriafacial:visualizar:global"],
    ),
  };
  const actionLotacao = vincularLotacaoAction.bind(null, servidorId);
  const fusoHorario = await resolverFusoHorarioServidorNoBanco({
    servidorId,
  });
  const nomeFuncional = nomeServidor(servidor);
  const fotoCpf = servidor.cpf ?? servidor.usuario.cpf;
  const fotoSrc = await buscarFotoServidorDataUrl(fotoCpf);
  const cargo = descricaoCargoServidor(servidor);
  const funcao = descricaoFuncaoServidor(servidor);
  const rotuloPessoa =
    ROTULOS_TIPO_PESSOA[servidor.usuario.tipo] ?? ROTULOS_TIPO_PESSOA.SERVIDOR;
  const actionDispensaPonto = criarDispensaPontoServidorAction.bind(
    null,
    servidorId,
  );
  const actionReprocessarIdentificadores =
    reprocessarIdentificadoresPontoServidorAction.bind(null, servidorId);
  const dispensasPonto = servidor.dispensasPonto.map((dispensa) => ({
    id: dispensa.id,
    motivo: dispensa.motivo,
    atoAutorizativo: dispensa.atoAutorizativo,
    processoSei: dispensa.processoSei,
    observacao: dispensa.observacao,
    exigeFrequenciaManual: dispensa.exigeFrequenciaManual,
    status: dispensa.status,
    dataInicio: dispensa.dataInicio.toISOString(),
    dataFim: dispensa.dataFim?.toISOString() ?? null,
    encerrarAction: encerrarDispensaPontoServidorAction.bind(
      null,
      servidorId,
      dispensa.id,
    ),
  }));

  function montarHrefPaginaAfastamentos(novaPagina: number) {
    const params = new URLSearchParams();
    params.set("aba", "afastamentos");
    params.set("abaAfastamentos", abaAfastamentos);
    params.set(
      abaAfastamentos === "ferias" ? "paginaFerias" : "paginaOutros",
      String(novaPagina),
    );
    return `/servidores/${servidorId}?${params.toString()}`;
  }

  function montarHrefAbaAfastamentos(aba: AbaAfastamentos) {
    const params = new URLSearchParams();
    params.set("aba", "afastamentos");
    params.set("abaAfastamentos", aba);
    return `/servidores/${servidorId}?${params.toString()}`;
  }

  function montarHrefAbaServidor(aba: AbaServidor) {
    const params = new URLSearchParams();
    params.set("aba", aba);
    if (aba === "afastamentos") {
      params.set("abaAfastamentos", abaAfastamentos);
      params.set("paginaFerias", String(paginaFerias));
      params.set("paginaOutros", String(paginaOutros));
    }
    return `/servidores/${servidorId}?${params.toString()}`;
  }

  const tituloAfastamentos =
    abaAfastamentos === "ferias" ? "Férias registradas" : "Outros afastamentos";
  const descricaoAfastamentos =
    abaAfastamentos === "ferias"
      ? "Períodos de férias importados do SARH e vinculados à matrícula funcional do servidor."
      : "Licenças, afastamentos diversos e demais registros importados do SARH para este servidor.";
  const abasServidorVisiveis = ABAS_SERVIDOR.filter(
    (aba) => aba.valor !== "ponto" || podeGerenciarServidor,
  );

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Administração", href: "/administracao" },
          { label: rotuloPessoa.breadcrumb, href: rotuloPessoa.href },
          { label: servidor.matricula },
        ]}
      />

      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="flex items-center gap-5">
          {fotoSrc ? (
            <Image
              src={fotoSrc}
              alt=""
              width={88}
              height={88}
              unoptimized
              className="size-[5.5rem] rounded-full border-4 border-white bg-slate-100 object-cover shadow-md ring-2 ring-blue-100 dark:border-slate-950 dark:bg-slate-800 dark:ring-blue-900/60"
              priority
            />
          ) : (
            <span className="flex size-[5.5rem] items-center justify-center rounded-full border-4 border-white bg-slate-100 text-xl font-bold text-slate-600 shadow-md ring-2 ring-blue-100 dark:border-slate-950 dark:bg-slate-800 dark:text-slate-300 dark:ring-blue-900/60">
              {servidor.matricula.slice(0, 2).toUpperCase()}
            </span>
          )}

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-300">
              {rotuloPessoa.singularTitulo}
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              {nomeFuncional}
            </h1>

            {cargo && (
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                {cargo}
              </p>
            )}

            {funcao && (
              <p className="mt-1 text-sm font-semibold text-blue-900 dark:text-blue-300">
                {funcao}
              </p>
            )}

            <p className="mt-2 font-mono text-sm text-[var(--muted-foreground)]">
              Matrícula: {servidor.matricula}
            </p>
          </div>
        </div>

        {podeGerenciarServidor && (
          <Link
            href={`/servidores/${servidor.id}/editar`}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-950"
          >
            <Edit className="size-4" aria-hidden="true" />
            Editar {rotuloPessoa.singular}
          </Link>
        )}
      </section>

      <RegraPortariaCard
        artigo="Arts. 8º e 16"
        titulo="Lotação como base da apuração e homologação"
        descricao="A lotação define a unidade em que a carga mensal será apurada e a chefia responsável pela análise, compensação e homologação da frequência."
      />

      <nav
        aria-label="Seções do servidor"
        className="flex flex-wrap gap-2 rounded-xl border bg-card p-2"
      >
        {abasServidorVisiveis.map((aba) => (
          <Link
            key={aba.valor}
            href={montarHrefAbaServidor(aba.valor)}
            className={classeAba(abaServidor === aba.valor)}
            aria-current={abaServidor === aba.valor ? "page" : undefined}
          >
            {aba.label}
          </Link>
        ))}
      </nav>

      {abaServidor === "dados" && (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
              <p className="text-sm text-[var(--muted-foreground)]">Órgão</p>
              <h2 className="mt-2 text-2xl font-bold">
                {servidor.orgao.sigla}
              </h2>
            </div>

            <div className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
              <p className="text-sm text-[var(--muted-foreground)]">Vínculo</p>
              <h2 className="mt-2 text-base font-bold">{servidor.vinculo}</h2>
            </div>

            <div className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
              <p className="text-sm text-[var(--muted-foreground)]">Perfis</p>
              <h2 className="mt-2 text-2xl font-bold">
                {servidor.usuario.perfis.length}
              </h2>
            </div>

            <div className="rounded-xl border bg-[var(--card)] p-5 shadow-sm">
              <p className="text-sm text-[var(--muted-foreground)]">Status</p>
              <h2 className="mt-2 text-2xl font-bold">
                {servidor.ativo ? "Ativo" : "Inativo"}
              </h2>
            </div>
          </section>

          <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
            <div className="flex items-center gap-2 border-b p-5">
              <UserRound className="size-5 text-blue-900 dark:text-blue-300" />
              <h2 className="text-lg font-bold">Dados do usuário</h2>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Nome</p>
                <p className="mt-1 font-semibold">{nomeFuncional}</p>
              </div>

              <div>
                <p className="text-sm text-[var(--muted-foreground)]">E-mail</p>
                <p className="mt-1 font-semibold">
                  {servidor.usuario.email ?? "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-[var(--muted-foreground)]">CPF</p>
                <p className="mt-1 font-mono text-sm font-semibold">
                  {servidor.cpf ?? servidor.usuario.cpf ?? "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  PIS/PASEP
                </p>
                <p className="mt-1 font-mono text-sm font-semibold">
                  {servidor.pis ?? "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Nome funcional
                </p>
                <p className="mt-1 font-semibold">
                  {servidor.nomeFuncional ?? "-"}
                </p>
              </div>

              <div>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Tipo de usuário
                </p>
                <p className="mt-1 font-semibold">{servidor.usuario.tipo}</p>
              </div>

              <div className="md:col-span-2">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Identificadores de ponto
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      Usados para associar marcações recebidas por equipamentos
                      biométricos diferentes.
                    </p>
                  </div>

                  {podeGerenciarServidor && (
                    <ReprocessarIdentificadoresPontoButton
                      action={actionReprocessarIdentificadores}
                    />
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {servidor.identificadoresPonto.length > 0 ? (
                    servidor.identificadoresPonto.map((identificador) => (
                      <span
                        key={identificador.id}
                        className="rounded-md border bg-[var(--muted)] px-2 py-1 font-mono text-xs font-semibold"
                      >
                        {identificador.valor}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[var(--muted-foreground)]">
                      -
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {abaServidor === "perfis" && (
        <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
          <div className="flex items-center gap-2 border-b p-5">
            <ShieldCheck className="size-5 text-blue-900 dark:text-blue-300" />
            <h2 className="text-lg font-bold">Perfis vinculados</h2>
          </div>

          <div className="divide-y">
            {servidor.usuario.perfis.map((usuarioPerfil) => (
              <div
                key={usuarioPerfil.id}
                className="flex flex-col justify-between gap-2 p-5 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-semibold">{usuarioPerfil.perfil.nome}</p>
                  <p className="font-mono text-xs text-[var(--muted-foreground)]">
                    {usuarioPerfil.perfil.codigo}
                  </p>
                </div>

                <span
                  className={[
                    "w-fit rounded-full px-2 py-1 text-xs font-semibold",
                    usuarioPerfil.ativo
                      ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                  ].join(" ")}
                >
                  {usuarioPerfil.ativo ? "Ativo" : "Inativo"}
                </span>
              </div>
            ))}

            {servidor.usuario.perfis.length === 0 && (
              <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
                Nenhum perfil vinculado a este usuário.
              </div>
            )}
          </div>
        </section>
      )}

      {abaServidor === "jornadas" && (
        <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
          <div className="flex items-center gap-2 border-b p-5">
            <CalendarClock className="size-5 text-blue-900 dark:text-blue-300" />
            <h2 className="text-lg font-bold">Jornadas vinculadas</h2>
          </div>

          <div className="divide-y">
            {servidor.jornadas.map((jornadaServidor) => (
              <div key={jornadaServidor.id} className="space-y-3 p-5">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                  <div>
                    <p className="font-semibold">
                      {jornadaServidor.jornada.nome}
                    </p>
                    <p className="font-mono text-xs text-[var(--muted-foreground)]">
                      {jornadaServidor.jornada.codigo}
                    </p>
                  </div>

                  <span
                    className={[
                      "w-fit rounded-full px-2 py-1 text-xs font-semibold",
                      jornadaServidor.ativo
                        ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                    ].join(" ")}
                  >
                    {jornadaServidor.ativo ? "Vigente" : "Encerrada"}
                  </span>
                </div>

                <div className="grid gap-2 text-sm text-[var(--muted-foreground)] sm:grid-cols-2">
                  <p>
                    Início:{" "}
                    <span className="font-semibold text-[var(--foreground)]">
                      {formatarData(jornadaServidor.dataInicio)}
                    </span>
                  </p>
                  <p>
                    Fim:{" "}
                    <span className="font-semibold text-[var(--foreground)]">
                      {formatarData(jornadaServidor.dataFim)}
                    </span>
                  </p>
                  <p>
                    Carga:{" "}
                    <span className="font-semibold text-[var(--foreground)]">
                      {formatarCarga(
                        jornadaServidor.jornada.cargaDiariaMinutos,
                      )}
                    </span>
                  </p>
                  <p>
                    Escala:{" "}
                    <span className="font-semibold text-[var(--foreground)]">
                      {jornadaServidor.escala?.nome ?? "-"}
                    </span>
                  </p>
                </div>
              </div>
            ))}

            {servidor.jornadas.length === 0 && (
              <div className="p-8 text-center text-sm text-[var(--muted-foreground)]">
                Nenhuma jornada vinculada a este {rotuloPessoa.singular}.
              </div>
            )}
          </div>
        </section>
      )}

      {abaServidor === "lotacoes" && (
        <ServidorLotacoesCard lotacoes={servidor.lotacoes} />
      )}

      {abaServidor === "biometria" && (
        <ServidorBiometriaFacialCard
          servidorId={servidorId}
          servidorNome={nomeFuncional}
          resumo={{
            status: resumoBiometria.biometria?.status ?? "NAO_CADASTRADO",
            amostrasQuantidade:
              resumoBiometria.biometria?.amostrasQuantidade ?? 0,
            qualidadeMedia: resumoBiometria.biometria?.qualidadeMedia ?? null,
            atualizadoEm:
              resumoBiometria.biometria?.atualizadoEm.toISOString() ?? null,
            revogadoEm:
              resumoBiometria.biometria?.revogadoEm?.toISOString() ?? null,
            ultimaTentativaEm:
              resumoBiometria.ultimaSessao?.criadoEm.toISOString() ??
              resumoBiometria.ultimaAmostra?.criadoEm.toISOString() ??
              null,
            ultimaTentativaStatus:
              resumoBiometria.ultimaSessao?.status ??
              (resumoBiometria.ultimaAmostra
                ? resumoBiometria.ultimaAmostra.validada
                  ? "VALIDADA"
                  : "NÃO VALIDADA"
                : null),
            ultimoEventoEm:
              resumoBiometria.ultimoEvento?.criadoEm.toISOString() ?? null,
            ultimoEventoAcao: resumoBiometria.ultimoEvento?.acao ?? null,
            ultimoEventoUsuario: resumoBiometria.ultimoEvento?.usuario
              ? resumoBiometria.ultimoEvento.usuario.matricula +
                " - " +
                resumoBiometria.ultimoEvento.usuario.nome
              : null,
          }}
          permissoes={permissoesBiometria}
        />
      )}

      {abaServidor === "afastamentos" && (
        <div className="space-y-4">
          <nav
            aria-label="Tipos de afastamento"
            className="flex flex-wrap gap-2 rounded-xl border bg-card p-2"
          >
            <Link
              href={montarHrefAbaAfastamentos("ferias")}
              className={classeAba(abaAfastamentos === "ferias")}
            >
              Férias
              <span className="ml-2 rounded-full bg-background/80 px-2 py-0.5 text-xs text-foreground">
                {totalFerias}
              </span>
            </Link>
            <Link
              href={montarHrefAbaAfastamentos("outros")}
              className={classeAba(abaAfastamentos === "outros")}
            >
              Outros afastamentos
              <span className="ml-2 rounded-full bg-background/80 px-2 py-0.5 text-xs text-foreground">
                {totalOutros}
              </span>
            </Link>
          </nav>

          <AfastamentosServidorCard
            afastamentos={afastamentosResultado.afastamentos}
            titulo={tituloAfastamentos}
            descricao={descricaoAfastamentos}
            resumo={{
              total: afastamentosResultado.total,
              vigentes: afastamentosResultado.vigentes,
              futuros: afastamentosResultado.futuros,
            }}
            paginacao={{
              total: afastamentosResultado.total,
              pagina: afastamentosResultado.pagina,
              totalPaginas: afastamentosResultado.totalPaginas,
              itensPorPagina: afastamentosResultado.itensPorPagina,
              montarHrefPagina: montarHrefPaginaAfastamentos,
            }}
          />
        </div>
      )}

      {abaServidor === "ponto" && podeGerenciarServidor && (
        <div className="space-y-4">
          <DispensaPontoServidorCard
            dispensas={dispensasPonto}
            fusoHorario={fusoHorario}
            action={actionDispensaPonto}
          />

          <LotacaoForm action={actionLotacao} unidades={unidades} />
        </div>
      )}
    </div>
  );
}
