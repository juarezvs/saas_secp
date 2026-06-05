import {
  exigirUmaDasPermissoesOuRedirecionar,
  usuarioPossuiPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import {
  buscarServidorBancoHorasPorUsuarioId,
  listarMovimentosBancoHorasMes,
  listarServidoresComBancoHoras,
} from "@/modules/banco-horas/infrastructure/repositories/banco-horas.repository";
import { BancoHorasPageReal } from "@/modules/banco-horas/presentation/components/banco-horas-page-real";

type ServidorBancoHoras = NonNullable<
  Awaited<ReturnType<typeof buscarServidorBancoHorasPorUsuarioId>>
>;

type BancoHorasPageProps = {
  searchParams: Promise<{
    servidorId?: string;
    anoReferencia?: string;
    mesReferencia?: string;
  }>;
};

export default async function BancoHorasPage({ searchParams }: BancoHorasPageProps) {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "banco-horas:visualizar:proprio",
    "banco-horas:consultar:proprio",
    "banco-horas:consultar:global",
  ]);

  const params = await searchParams;
  const hoje = new Date();
  const anoReferencia = Number(params.anoReferencia ?? hoje.getFullYear());
  const mesReferencia = Number(params.mesReferencia ?? hoje.getMonth() + 1);

  const podeConsultarGlobal = usuarioPossuiPermissaoNoPerfil(
    permissao.perfilAtivoCodigo,
    permissao.permissoes,
    "banco-horas:consultar:global",
  );
  const podeGerenciar = usuarioPossuiPermissaoNoPerfil(
    permissao.perfilAtivoCodigo,
    permissao.permissoes,
    "banco-horas:gerenciar:global",
  );

  const servidorEhValido = (
    servidor: Awaited<ReturnType<typeof buscarServidorBancoHorasPorUsuarioId>>,
  ): servidor is ServidorBancoHoras => Boolean(servidor);

  const servidores = podeConsultarGlobal
    ? await listarServidoresComBancoHoras()
    : permissao.usuarioId
      ? [await buscarServidorBancoHorasPorUsuarioId(permissao.usuarioId)].filter(servidorEhValido)
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

  return (
    <BancoHorasPageReal
      servidores={servidores}
      servidorSelecionado={servidorSelecionado}
      movimentos={movimentos}
      anoReferencia={anoReferencia}
      mesReferencia={mesReferencia}
      podeConsultarGlobal={podeConsultarGlobal}
      podeGerenciar={podeGerenciar}
    />
  );
}
