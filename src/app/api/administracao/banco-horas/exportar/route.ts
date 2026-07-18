import { NextResponse } from "next/server";

import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import {
  exigirUmaDasPermissoesOuRedirecionar,
  usuarioPossuiPermissaoNoPerfil,
} from "@/modules/auth/application/services/permissao.service";
import { listarIdsUnidadesSubordinadasPorUsuario } from "@/modules/chefias/application/services/listar-unidades-subordinadas.service";
import { minutosParaHoraBanco } from "@/modules/banco-horas/application/services/formatar-banco-horas.service";
import { listarServidoresGestaoBancoHoras } from "@/modules/banco-horas/infrastructure/repositories/banco-horas.repository";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";

function csv(valor: string | number | null | undefined) {
  const texto = String(valor ?? "");
  return `"${texto.replaceAll('"', '""')}"`;
}

function formatarCompetencia(competencia?: string | null) {
  if (!competencia) {
    return "";
  }

  const [ano, mes] = competencia.split("-");
  return `${mes}/${ano}`;
}

export async function GET() {
  const permissao = await exigirUmaDasPermissoesOuRedirecionar([
    "banco-horas:gerenciar:global",
    "relatorios-gerenciais:consultar:chefia",
    "relatorios-gerenciais:consultar:global",
  ]);

  const escopo = await obterEscopoOrgaoDaSessao();
  const podeGlobal =
    usuarioPossuiPermissaoNoPerfil(
      permissao.perfilAtivoCodigo,
      permissao.permissoes,
      "banco-horas:gerenciar:global",
    ) ||
    usuarioPossuiPermissaoNoPerfil(
      permissao.perfilAtivoCodigo,
      permissao.permissoes,
      "relatorios-gerenciais:consultar:global",
    );
  const podeChefia = usuarioPossuiPermissaoNoPerfil(
    permissao.perfilAtivoCodigo,
    permissao.permissoes,
    "relatorios-gerenciais:consultar:chefia",
  );
  const unidadeIdsPermitidas =
    !podeGlobal && podeChefia && permissao.usuarioId
      ? await listarIdsUnidadesSubordinadasPorUsuario(permissao.usuarioId)
      : undefined;

  if (!podeGlobal && unidadeIdsPermitidas?.length === 0) {
    return new NextResponse("\uFEFF", {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition":
          'attachment; filename="banco-horas-servidores.csv"',
      },
    });
  }

  const servidores = await listarServidoresGestaoBancoHoras({
    orgaoIdsPermitidos: escopo.global ? undefined : escopo.orgaoIds,
    unidadeIdsPermitidas,
  });

  const linhas = [
    [
      "Seccional",
      "Unidade",
      "Matrícula",
      "Servidor",
      "Competência inicial",
      "Saldo inicial positivo",
      "Saldo inicial negativo",
      "Saldo atual",
    ],
    ...servidores.map((servidor) => {
      const saldo = servidor.bancoHorasSaldo;

      return [
        servidor.orgao.sigla,
        servidor.lotacoes[0]?.unidade.sigla ?? "",
        servidor.matricula,
        nomeServidor(servidor),
        formatarCompetencia(saldo?.competenciaInicioControle),
        minutosParaHoraBanco(saldo?.saldoInicialCreditoMinutos ?? 0),
        minutosParaHoraBanco(saldo?.saldoInicialDebitoMinutos ?? 0),
        minutosParaHoraBanco(saldo?.saldoMinutos ?? 0),
      ];
    }),
  ];

  const conteudo = `\uFEFF${linhas
    .map((linha) => linha.map(csv).join(";"))
    .join("\n")}`;

  return new NextResponse(conteudo, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition":
        'attachment; filename="banco-horas-servidores.csv"',
    },
  });
}
