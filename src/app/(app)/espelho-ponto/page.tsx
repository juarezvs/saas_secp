import { CalendarDays } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CompetenciaInput } from "@/components/ui";
import { redirect } from "next/navigation";
import {
  exigirUmaDasPermissoesOuRedirecionar,
  usuarioPossuiPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import { recalcularMesServidorAction } from "@/modules/recalculo/application/actions/recalcular-mes-servidor.action";
import {
  buscarServidorComUsuarioPorUsuarioId,
  listarApuracoesDoServidorNoMes,
  listarMarcacoesDoServidorNoMes,
  listarServidoresParaEspelhoPonto,
} from "@/modules/apuracao/infrastructure/repositories/apuracao.repository";
import { EspelhoPontoMensal } from "@/modules/apuracao/presentation/components/espelho-ponto-mensal";

type EspelhoPontoPageProps = {
  searchParams: Promise<{
    servidorId?: string;
    competencia?: string;
    anoReferencia?: string;
    mesReferencia?: string;
  }>;
};

type ServidorEspelho = Awaited<
  ReturnType<typeof listarServidoresParaEspelhoPonto>
>[number];

function normalizarCompetencia(params: {
  competencia?: string;
  anoReferencia?: string;
  mesReferencia?: string;
}) {
  const hoje = new Date();
  const matchCompetencia = params.competencia?.match(/^(\d{4})-(\d{2})$/);
  const anoCompetencia = matchCompetencia ? Number(matchCompetencia[1]) : null;
  const mesCompetencia = matchCompetencia ? Number(matchCompetencia[2]) : null;
  const anoParam = params.anoReferencia
    ? Number(params.anoReferencia)
    : null;
  const mesParam = params.mesReferencia
    ? Number(params.mesReferencia)
    : null;

  return {
    anoReferencia:
      anoCompetencia && Number.isInteger(anoCompetencia)
        ? anoCompetencia
        : anoParam && Number.isInteger(anoParam)
          ? anoParam
          : hoje.getFullYear(),
    mesReferencia:
      mesCompetencia &&
      Number.isInteger(mesCompetencia) &&
      mesCompetencia >= 1 &&
      mesCompetencia <= 12
        ? mesCompetencia
        : mesParam && Number.isInteger(mesParam) && mesParam >= 1 && mesParam <= 12
          ? mesParam
          : hoje.getMonth() + 1,
  };
}

function competenciaParaInput(anoReferencia: number, mesReferencia: number) {
  return `${anoReferencia}-${String(mesReferencia).padStart(2, "0")}`;
}

function obterCompetenciaAtualManaus() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Manaus",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const ano = partes.find((parte) => parte.type === "year")?.value;
  const mes = partes.find((parte) => parte.type === "month")?.value;

  return `${ano}-${mes}`;
}

function paramsPossuemCompetencia(params: {
  competencia?: string;
  anoReferencia?: string;
  mesReferencia?: string;
}) {
  return Boolean(
    params.competencia || params.anoReferencia || params.mesReferencia,
  );
}

function servidorProprioParaLista(
  servidor: Awaited<ReturnType<typeof buscarServidorComUsuarioPorUsuarioId>>,
): ServidorEspelho[] {
  if (!servidor) {
    return [];
  }

  return [
    {
      ...servidor,
      lotacoes: [],
    },
  ];
}

export default async function EspelhoPontoPage({
  searchParams,
}: EspelhoPontoPageProps) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "espelho-ponto:visualizar:proprio",
    "apuracao:consultar:proprio",
    "apuracao:consultar:global",
  ]);

  const params = await searchParams;
  const { anoReferencia, mesReferencia } = normalizarCompetencia(params);

  const podeConsultarGlobal = usuarioPossuiPermissaoNoPerfil(
    permissao.perfilAtivoCodigo,
    permissao.permissoes,
    "apuracao:consultar:global",
  );
  const podeRecalcular = usuarioPossuiPermissaoNoPerfil(
    permissao.perfilAtivoCodigo,
    permissao.permissoes,
    "apuracao:recalcular:global",
  );

  const servidores = podeConsultarGlobal
    ? await listarServidoresParaEspelhoPonto()
    : permissao.usuarioId
      ? servidorProprioParaLista(
          await buscarServidorComUsuarioPorUsuarioId(permissao.usuarioId),
        )
      : [];

  const servidorSelecionado =
    servidores.find((servidor) => servidor.id === params.servidorId) ??
    servidores[0] ??
    null;

  if (!paramsPossuemCompetencia(params)) {
    const query = new URLSearchParams({
      competencia: obterCompetenciaAtualManaus(),
    });

    if (servidorSelecionado) {
      query.set("servidorId", servidorSelecionado.id);
    }

    redirect(`/espelho-ponto?${query.toString()}`);
  }

  const [apuracoes, marcacoes] = servidorSelecionado
    ? await Promise.all([
        listarApuracoesDoServidorNoMes({
          servidorId: servidorSelecionado.id,
          ano: anoReferencia,
          mes: mesReferencia,
        }),
        listarMarcacoesDoServidorNoMes({
          servidorId: servidorSelecionado.id,
          ano: anoReferencia,
          mes: mesReferencia,
        }),
      ])
    : [[], []];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Espelho de ponto" }]} />

      <PageHeader
        icon={CalendarDays}
        titulo="Espelho de ponto"
        descricao="Consulte marcacoes, jornada prevista, horas trabalhadas, creditos, debitos e inconsistencias apuradas para a competencia selecionada."
        artigo="Arts. 8, 16 e 17"
        regraTitulo="Conferencia mensal da frequencia"
        regraDescricao="O servidor pode consultar a propria frequencia e o saldo; a chefia homologa mensalmente comparecimento, ausencias, creditos, debitos e compensacoes."
      />

      <Card className="p-5">
        <form className="grid gap-4 md:grid-cols-[1fr_220px_auto] md:items-end">
          <div>
            <label
              htmlFor="servidorId"
              className="text-sm font-semibold text-[var(--foreground)]"
            >
              Servidor
            </label>
            <select
              id="servidorId"
              name="servidorId"
              defaultValue={servidorSelecionado?.id ?? ""}
              disabled={!podeConsultarGlobal}
              className="mt-2 h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm disabled:cursor-not-allowed disabled:opacity-70"
            >
              {servidores.map((servidor) => (
                <option key={servidor.id} value={servidor.id}>
                  {servidor.matricula} - {servidor.usuario.nome}
                </option>
              ))}
            </select>
          </div>

          <CompetenciaInput
            defaultValue={competenciaParaInput(anoReferencia, mesReferencia)}
          />

          <button
            type="submit"
            className="h-10 rounded-md border px-4 text-sm font-semibold hover:bg-[var(--muted)]"
          >
            Filtrar
          </button>
        </form>

        {podeRecalcular && servidorSelecionado && (
          <form action={recalcularMesServidorAction} className="mt-4">
            <input type="hidden" name="servidorId" value={servidorSelecionado.id} />
            <input type="hidden" name="anoReferencia" value={anoReferencia} />
            <input type="hidden" name="mesReferencia" value={mesReferencia} />
            <button
              type="submit"
              className="rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950"
            >
              Recalcular mes e banco de horas
            </button>
          </form>
        )}
      </Card>

      {servidorSelecionado ? (
        <EspelhoPontoMensal apuracoes={apuracoes} marcacoes={marcacoes} />
      ) : (
        <Card className="p-8 text-center text-sm text-[var(--muted-foreground)]">
          Nenhum servidor ativo foi encontrado para exibicao do espelho.
        </Card>
      )}
    </div>
  );
}
