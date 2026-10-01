import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  CalendarClock,
  Edit,
  ShieldCheck,
  UserCog,
  UserRound,
  UserRoundCheck,
} from "lucide-react";
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
  listarServidoresParaFiltro,
} from "@/modules/servidores/infrastructure/repositories/servidor.repository";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import { montarRotuloUnidadeComHierarquia } from "@/modules/unidades/application/services/rotulo-unidade.service";
import {
  criarDispensaPontoServidorAction,
  encerrarDispensaPontoServidorAction,
} from "@/modules/servidores/application/actions/dispensa-ponto-servidor.action";
import { desvincularJornadaServidorAction } from "@/modules/jornadas/application/actions/desvincular-jornada-servidor.action";
import { reprocessarIdentificadoresPontoServidorAction } from "@/modules/servidores/application/actions/reprocessar-identificadores-ponto-servidor.action";
import { resolverFusoHorarioServidorNoBanco } from "@/modules/servidores/application/services/fuso-horario-servidor.service";
import { DispensaPontoServidorCard } from "@/modules/servidores/presentation/components/dispensa-ponto-servidor-card";
import { AfastamentosServidorCard } from "@/modules/servidores/presentation/components/afastamentos-servidor-card";
import { ReprocessarIdentificadoresPontoButton } from "@/modules/servidores/presentation/components/reprocessar-identificadores-ponto-button";
import { ServidorLotacoesCard } from "@/modules/servidores/presentation/components/servidor-lotacoes-card";
import { ServidorBiometriaFacialCard } from "@/modules/servidores/presentation/components/servidor-biometria-facial-card";
import { registrarSupervisaoEstagioAction } from "@/modules/servidores/application/actions/estagio-supervisao.action";
import { EstagioSupervisaoForm } from "@/modules/servidores/presentation/components/estagio-supervisao-form";
import { prisma } from "@/shared/infrastructure/database/prisma";

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
  | "perfilChefia"
  | "jornadas"
  | "lotacoes"
  | "supervisaoEstagio"
  | "substituicoesAutomaticas"
  | "biometria"
  | "afastamentos"
  | "ponto";
type AbaAfastamentos = "ferias" | "outros";

const ABAS_SERVIDOR: Array<{ valor: AbaServidor; label: string }> = [
  { valor: "dados", label: "Dados" },
  { valor: "perfis", label: "Perfis" },
  { valor: "perfilChefia", label: "Perfil de Chefia" },
  { valor: "jornadas", label: "Jornadas" },
  { valor: "lotacoes", label: "Lotações" },
  { valor: "supervisaoEstagio", label: "Supervisao de estagio" },
  { valor: "substituicoesAutomaticas", label: "Substituicao automatica" },
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

function rotuloPapelChefia(papel: string) {
  const rotulos: Record<string, string> = {
    GESTOR_TITULAR: "Titular",
    GESTOR_SUBSTITUTO: "Substituto",
    DELEGADO_CHEFIA: "Delegado",
    AUTOMATICA: "Substituto automatico",
    EVENTUAL: "Substituto eventual",
    DESIGNADA: "Substituto designado",
    INTERINA: "Chefia interina",
    OUTRA: "Outra substituicao",
  };

  return rotulos[papel] ?? papel;
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

  const [servidor, resumoBiometria] = await Promise.all([
    buscarServidorPorId(id),
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

  const servidorEhEstagiario =
    servidor.usuario.tipo === "ESTAGIARIO" ||
    servidor.categoriaPessoa?.codigo?.toUpperCase() === "ESTAGIARIO";
  const [historicoSupervisaoEstagio, supervisoresEstagio] = servidorEhEstagiario
    ? await Promise.all([
        prisma.estagioSupervisao.findMany({
          where: {
            estagiarioServidorId: servidorId,
          },
          include: {
            supervisorServidor: {
              include: {
                usuario: true,
                lotacoes: {
                  where: { status: "ATIVO" },
                  include: { unidade: true },
                  orderBy: { dataInicio: "desc" },
                  take: 1,
                },
              },
            },
          },
          orderBy: [{ dataInicio: "desc" }],
        }),
        listarServidoresParaFiltro({
          orgaoIdsPermitidos,
          tipoUsuario: "SERVIDOR",
          semLimite: true,
        }),
      ])
    : [[], []];

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const [gestoesUnidadeAtivas, substituicoesChefiaAtivas] =
    abaSolicitada === "perfilChefia"
      ? await Promise.all([
          prisma.gestorUnidade.findMany({
            where: {
              servidorId,
              ativo: true,
              dataInicio: { lte: hoje },
              OR: [{ dataFim: null }, { dataFim: { gte: hoje } }],
            },
            include: {
              unidade: {
                include: {
                  orgao: true,
                  unidadePai: {
                    include: {
                      orgao: true,
                      unidadePai: {
                        include: {
                          orgao: true,
                          unidadePai: {
                            include: {
                              orgao: true,
                              unidadePai: {
                                include: {
                                  orgao: true,
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            orderBy: [{ papel: "asc" }, { dataInicio: "desc" }],
          }),
          prisma.substituicaoFuncao.findMany({
            where: {
              substitutoServidorId: servidorId,
              status: "ATIVA",
              dataInicio: { lte: hoje },
              OR: [{ dataFim: null }, { dataFim: { gte: hoje } }],
            },
            include: {
              orgao: true,
              unidade: {
                include: {
                  orgao: true,
                  unidadePai: {
                    include: {
                      orgao: true,
                      unidadePai: {
                        include: {
                          orgao: true,
                          unidadePai: {
                            include: {
                              orgao: true,
                              unidadePai: {
                                include: {
                                  orgao: true,
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              titularServidor: {
                include: {
                  usuario: true,
                  gestores: {
                    where: {
                      ativo: true,
                      dataInicio: { lte: hoje },
                      OR: [{ dataFim: null }, { dataFim: { gte: hoje } }],
                    },
                    include: {
                      unidade: {
                        include: {
                          orgao: true,
                          unidadePai: {
                            include: {
                              orgao: true,
                              unidadePai: {
                                include: {
                                  orgao: true,
                                  unidadePai: {
                                    include: {
                                      orgao: true,
                                      unidadePai: {
                                        include: {
                                          orgao: true,
                                        },
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                  afastamentosSarh: {
                    where: {
                      ativo: true,
                      dataInicio: { lte: hoje },
                      OR: [{ dataFim: null }, { dataFim: { gte: hoje } }],
                    },
                    select: {
                      dataInicio: true,
                      dataFim: true,
                      tipoDescricao: true,
                      categoria: true,
                    },
                    orderBy: [{ dataInicio: "desc" }],
                  },
                },
              },
            },
            orderBy: [{ tipo: "asc" }, { dataInicio: "desc" }],
          }),
        ])
      : [[], []];
  const substituicoesAutomaticas = await prisma.substituicaoFuncao.findMany({
    where: {
      substitutoServidorId: servidorId,
      tipo: "AUTOMATICA",
      orgaoId: servidor.orgaoId,
    },
    include: {
      orgao: { select: { sigla: true } },
      unidade: { select: { sigla: true, nome: true } },
      titularServidor: {
        select: {
          matricula: true,
          nomeFuncional: true,
          usuario: { select: { nome: true } },
          afastamentosSarh: {
            where: {
              ativo: true,
              dataInicio: { lte: hoje },
              OR: [{ dataFim: null }, { dataFim: { gte: hoje } }],
            },
            select: {
              dataInicio: true,
              dataFim: true,
              tipoDescricao: true,
              categoria: true,
            },
            orderBy: [{ dataInicio: "desc" }],
          },
        },
      },
      funcaoTitular: {
        select: { categoria: true, codigo: true, descricao: true },
      },
    },
    orderBy: [{ status: "asc" }, { dataInicio: "desc" }],
  });

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
  const perfilChefiaItens = [
    ...gestoesUnidadeAtivas.map((gestao) => ({
      id: `gestao-${gestao.id}`,
      unidade: gestao.unidade,
      papel: rotuloPapelChefia(gestao.papel),
      origem: "Cadastro de chefia",
      situacao: gestao.ativo ? "Ativa" : "Inativa",
      dataInicio: gestao.dataInicio,
      dataFim: gestao.dataFim,
      titular: null as string | null,
      detalhe: null as string | null,
      efetiva: true,
    })),
    ...substituicoesChefiaAtivas.flatMap((substituicao) => {
      const unidades = substituicao.unidade
        ? [substituicao.unidade]
        : substituicao.titularServidor.gestores.map(
            (gestor) => gestor.unidade,
          );
      const unidadesReferencia = unidades.length > 0 ? unidades : [null];
      const afastamentoVigente =
        substituicao.titularServidor.afastamentosSarh[0] ?? null;
      const automaticaEfetiva =
        substituicao.tipo !== "AUTOMATICA" || Boolean(afastamentoVigente);

      return unidadesReferencia.map((unidade, index) => ({
        id: `substituicao-${substituicao.id}-${unidade?.id ?? index}`,
        unidade,
        papel: rotuloPapelChefia(substituicao.tipo),
        origem: `Substituicao de funcao (${substituicao.origem})`,
        situacao: automaticaEfetiva
          ? "Temporaria ativa"
          : "Cadastro ativo, aguardando afastamento",
        dataInicio: substituicao.dataInicio,
        dataFim: substituicao.dataFim,
        titular: `${nomeServidor(substituicao.titularServidor)} (${substituicao.titularServidor.matricula})`,
        detalhe: afastamentoVigente
          ? `${
              afastamentoVigente.tipoDescricao ??
              afastamentoVigente.categoria ??
              "Afastamento"
            } desde ${formatarData(afastamentoVigente.dataInicio)}`
          : null,
        efetiva: automaticaEfetiva,
      }));
    }),
  ].sort((a, b) => {
    if (a.efetiva !== b.efetiva) {
      return a.efetiva ? -1 : 1;
    }

    return a.papel.localeCompare(b.papel, "pt-BR");
  });

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
  const abasServidorVisiveis = ABAS_SERVIDOR.filter((aba) => {
    if (aba.valor === "ponto") {
      return podeGerenciarServidor;
    }

    if (aba.valor === "supervisaoEstagio") {
      return servidorEhEstagiario;
    }

    return true;
  });

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

      {abaServidor === "perfilChefia" && (
        <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
          <div className="flex items-center gap-2 border-b p-5">
            <UserCog className="size-5 text-blue-900 dark:text-blue-300" />
            <div>
              <h2 className="text-lg font-bold">Perfil de Chefia</h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Lotações em que este servidor atua como titular, substituto,
                delegado ou chefia temporária.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-5 py-3">Unidade</th>
                  <th className="px-5 py-3">Papel</th>
                  <th className="px-5 py-3">Titular vinculado</th>
                  <th className="px-5 py-3">Vigencia</th>
                  <th className="px-5 py-3">Origem</th>
                  <th className="px-5 py-3">Situacao</th>
                </tr>
              </thead>
              <tbody>
                {perfilChefiaItens.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-sm text-[var(--muted-foreground)]"
                    >
                      Este servidor não possui perfil de chefia vigente.
                    </td>
                  </tr>
                ) : null}

                {perfilChefiaItens.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="px-5 py-4">
                      <div className="font-semibold">
                        {item.unidade
                          ? montarRotuloUnidadeComHierarquia(item.unidade)
                          : "-"}
                      </div>
                      <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {item.unidade?.nome ?? "Unidade nao informada"}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        {item.papel}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {item.titular ?? "-"}
                      {item.detalhe ? (
                        <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {item.detalhe}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">
                      {formatarData(item.dataInicio)} a{" "}
                      {formatarData(item.dataFim)}
                    </td>
                    <td className="px-5 py-4">{item.origem}</td>
                    <td className="px-5 py-4">
                      <span
                        className={[
                          "w-fit rounded-full px-2 py-1 text-xs font-semibold",
                          item.efetiva
                            ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                            : "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                        ].join(" ")}
                      >
                        {item.situacao}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

                  <div className="flex flex-wrap items-center gap-2">
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
                    {podeGerenciarServidor && jornadaServidor.ativo ? (
                      <form action={desvincularJornadaServidorAction}>
                        <input
                          type="hidden"
                          name="servidorId"
                          value={servidor.id}
                        />
                        <input
                          type="hidden"
                          name="jornadaServidorId"
                          value={jornadaServidor.id}
                        />
                        <button
                          type="submit"
                          className="rounded-md border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                        >
                          Desvincular
                        </button>
                      </form>
                    ) : null}
                  </div>
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

      {abaServidor === "supervisaoEstagio" && servidorEhEstagiario && (
        <div className="space-y-4">
          {podeGerenciarServidor ? (
            <EstagioSupervisaoForm
              action={registrarSupervisaoEstagioAction.bind(null, servidorId)}
              supervisores={supervisoresEstagio.map((supervisor) => {
                const lotacao = supervisor.lotacoes[0]?.unidade;

                return {
                  id: supervisor.id,
                  label: `${nomeServidor(supervisor) || supervisor.usuario.nome} - ${
                    supervisor.matricula
                  }${lotacao ? ` (${lotacao.sigla ?? lotacao.nome})` : ""}`,
                };
              })}
            />
          ) : null}

          <section className="overflow-hidden rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
            <div className="flex items-center gap-2 border-b p-5">
              <UserRoundCheck className="size-5 text-blue-900 dark:text-blue-300" />
              <h2 className="text-lg font-bold">Historico de supervisao</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-5 py-3">Supervisor</th>
                    <th className="px-5 py-3">Lotacao</th>
                    <th className="px-5 py-3">Curso</th>
                    <th className="px-5 py-3">Vigencia</th>
                  </tr>
                </thead>
                <tbody>
                  {historicoSupervisaoEstagio.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-10 text-center text-sm text-[var(--muted-foreground)]"
                      >
                        Nenhuma supervisao de estagio cadastrada.
                      </td>
                    </tr>
                  ) : null}
                  {historicoSupervisaoEstagio.map((supervisao) => {
                    const lotacao =
                      supervisao.supervisorServidor.lotacoes[0]?.unidade;

                    return (
                      <tr key={supervisao.id} className="border-b last:border-b-0">
                        <td className="px-5 py-4">
                          <div className="font-semibold">
                            {nomeServidor(supervisao.supervisorServidor) ||
                              supervisao.supervisorServidor.usuario.nome}
                          </div>
                          <div className="text-xs text-[var(--muted-foreground)]">
                            {supervisao.supervisorServidor.matricula}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {lotacao ? `${lotacao.sigla} - ${lotacao.nome}` : "-"}
                        </td>
                        <td className="px-5 py-4">{supervisao.curso ?? "-"}</td>
                        <td className="px-5 py-4">
                          {formatarData(supervisao.dataInicio)} a{" "}
                          {formatarData(supervisao.dataFim)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {abaServidor === "substituicoesAutomaticas" && (
        <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
          <div className="flex items-center gap-2 border-b p-5">
            <UserRoundCheck className="size-5 text-blue-900 dark:text-blue-300" />
            <h2 className="text-lg font-bold">
              Cadastro de substituicao automatica
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-5 py-3">Unidade</th>
                  <th className="px-5 py-3">Titular</th>
                  <th className="px-5 py-3">Funcao</th>
                  <th className="px-5 py-3">Vigencia</th>
                  <th className="px-5 py-3">Origem</th>
                  <th className="px-5 py-3">Situacao</th>
                </tr>
              </thead>
              <tbody>
                {substituicoesAutomaticas.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-sm text-[var(--muted-foreground)]"
                    >
                      Este servidor nao possui cadastro de substituicao
                      automatica.
                    </td>
                  </tr>
                )}

                {substituicoesAutomaticas.map((substituicao) => {
                  const afastamentoVigente =
                    substituicao.titularServidor.afastamentosSarh[0] ?? null;
                  const chefiaTemporariaAtiva =
                    substituicao.status === "ATIVA" && Boolean(afastamentoVigente);

                  return (
                    <tr
                      key={substituicao.id}
                      className="border-b last:border-b-0"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold">
                          {substituicao.unidade?.sigla ?? "-"}
                        </div>
                        <div className="text-xs text-[var(--muted-foreground)]">
                          {substituicao.orgao.sigla}
                          {substituicao.unidade?.nome
                            ? ` / ${substituicao.unidade.nome}`
                            : ""}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold">
                          {nomeServidor(substituicao.titularServidor)}
                        </div>
                        <div className="text-xs text-[var(--muted-foreground)]">
                          {substituicao.titularServidor.matricula}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {substituicao.funcaoTitular
                          ? `${substituicao.funcaoTitular.categoria} ${substituicao.funcaoTitular.codigo}`
                          : "-"}
                        <div className="text-xs text-[var(--muted-foreground)]">
                          {substituicao.funcaoTitular?.descricao ?? "-"}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {formatarData(substituicao.dataInicio)} a{" "}
                        {formatarData(substituicao.dataFim)}
                      </td>
                      <td className="px-5 py-4">{substituicao.origem}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-2">
                          <span
                            className={[
                              "w-fit rounded-full px-2 py-1 text-xs font-semibold",
                              substituicao.status === "ATIVA"
                                ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                            ].join(" ")}
                          >
                            {substituicao.status}
                          </span>
                          <span
                            className={[
                              "w-fit rounded-full px-2 py-1 text-xs font-semibold",
                              chefiaTemporariaAtiva
                                ? "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                            ].join(" ")}
                          >
                            {chefiaTemporariaAtiva
                              ? "Chefia temporaria ativa"
                              : "Sem afastamento vigente"}
                          </span>
                          {afastamentoVigente && (
                            <span className="text-xs text-[var(--muted-foreground)]">
                              {afastamentoVigente.tipoDescricao ??
                                afastamentoVigente.categoria ??
                                "Afastamento"}{" "}
                              desde {formatarData(afastamentoVigente.dataInicio)}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
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
        <DispensaPontoServidorCard
          dispensas={dispensasPonto}
          fusoHorario={fusoHorario}
          action={actionDispensaPonto}
        />
      )}
    </div>
  );
}
