import {
  exigirUmaDasPermissoesOuRedirecionar,
  usuarioPossuiPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import {
  buscarServidorBancoHorasPorUsuarioId,
  listarAutorizacoesBancoHorasMes,
  listarMovimentosComposicaoSaldoBancoHoras,
  listarMovimentosBancoHorasMes,
  listarServidoresComBancoHoras,
  listarServidoresSubordinadosComBancoHoras,
} from "@/modules/banco-horas/infrastructure/repositories/banco-horas.repository";
import { BancoHorasPageReal } from "@/modules/banco-horas/presentation/components/banco-horas-page-real";

type ServidorBancoHoras = NonNullable<
  Awaited<ReturnType<typeof buscarServidorBancoHorasPorUsuarioId>>
>;

type BancoHorasPageProps = {
  searchParams: Promise<{
    servidorId?: string;
    competencia?: string;
    anoReferencia?: string;
    mesReferencia?: string;
    extrato?: string;
    detalhar?: string;
  }>;
};

function normalizarCompetencia(params: {
  competencia?: string;
  anoReferencia?: string;
  mesReferencia?: string;
}) {
  const hoje = new Date();
  const match = params.competencia?.match(/^(\d{4})-(\d{2})$/);
  const ano = Number(match?.[1] ?? params.anoReferencia ?? hoje.getFullYear());
  const mes = Number(match?.[2] ?? params.mesReferencia ?? hoje.getMonth() + 1);

  return {
    anoReferencia: Number.isInteger(ano) ? ano : hoje.getFullYear(),
    mesReferencia: Number.isInteger(mes) && mes >= 1 && mes <= 12
      ? mes
      : hoje.getMonth() + 1,
  };
}

export default async function BancoHorasPage({ searchParams }: BancoHorasPageProps) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "banco-horas:visualizar:proprio",
    "banco-horas:consultar:proprio",
    "banco-horas:consultar:chefia",
    "banco-horas:consultar:global",
  ]);

  const params = await searchParams;
  const { anoReferencia, mesReferencia } = normalizarCompetencia(params);

  const podeConsultarGlobal = usuarioPossuiPermissaoNoPerfil(
    permissao.perfilAtivoCodigo,
    permissao.permissoes,
    "banco-horas:consultar:global",
  ) && permissao.perfilAtivoCodigo?.toUpperCase() !== "CHEFIA";
  const podeConsultarChefia =
    permissao.perfilAtivoCodigo?.toUpperCase() === "CHEFIA" ||
    usuarioPossuiPermissaoNoPerfil(
      permissao.perfilAtivoCodigo,
      permissao.permissoes,
      "banco-horas:consultar:chefia",
    );
  const podeSelecionarServidor = podeConsultarGlobal || podeConsultarChefia;
  const podeGerenciar = usuarioPossuiPermissaoNoPerfil(
    permissao.perfilAtivoCodigo,
    permissao.permissoes,
    "banco-horas:gerenciar:global",
  );
  const escopoOrgao = await obterEscopoOrgaoDaSessao();

  const servidorEhValido = (
    servidor: Awaited<ReturnType<typeof buscarServidorBancoHorasPorUsuarioId>>,
  ): servidor is ServidorBancoHoras => Boolean(servidor);

  const servidores =
    podeConsultarGlobal
      ? await listarServidoresComBancoHoras({
          anoReferencia,
          mesReferencia,
          orgaoIdsPermitidos: escopoOrgao.global
            ? undefined
            : escopoOrgao.orgaoIds,
        })
      : podeConsultarChefia && permissao.usuarioId
        ? [
            await buscarServidorBancoHorasPorUsuarioId(permissao.usuarioId, {
              anoReferencia,
              mesReferencia,
            }),
            ...(await listarServidoresSubordinadosComBancoHoras({
              usuarioId: permissao.usuarioId,
              anoReferencia,
              mesReferencia,
            })),
          ].filter(servidorEhValido)
        : permissao.usuarioId
          ? [
              await buscarServidorBancoHorasPorUsuarioId(permissao.usuarioId, {
                anoReferencia,
                mesReferencia,
              }),
            ].filter(servidorEhValido)
          : [];

  const servidorSelecionado =
    servidores.find((servidor) => servidor?.id === params.servidorId) ??
    servidores[0] ??
    null;

  const movimentos = servidorSelecionado
    ? await listarMovimentosBancoHorasMes({
        servidorId: servidorSelecionado.id,
        anoReferencia,
        mesReferencia,
      })
    : [];

  const movimentosComposicaoSaldo = servidorSelecionado
    ? await listarMovimentosComposicaoSaldoBancoHoras({
        servidorId: servidorSelecionado.id,
      })
    : [];

  const autorizacoes = servidorSelecionado
    ? await listarAutorizacoesBancoHorasMes({
        servidorId: servidorSelecionado.id,
        anoReferencia,
        mesReferencia,
      })
    : [];

  return (
    <BancoHorasPageReal
      servidores={servidores}
      servidorSelecionado={servidorSelecionado}
      movimentos={movimentos}
      movimentosComposicaoSaldo={movimentosComposicaoSaldo}
      autorizacoes={autorizacoes}
      anoReferencia={anoReferencia}
      mesReferencia={mesReferencia}
      podeSelecionarServidor={podeSelecionarServidor}
      podeGerenciar={podeGerenciar}
      perfilAtivoCodigo={permissao.perfilAtivoCodigo}
      extratoSelecionado={params.extrato}
      competenciaDetalhada={params.detalhar}
    />
  );
}
