import { auth } from "@/auth";
import { exigirPermissaoOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { classificarProximaMarcacao } from "@/modules/marcacoes/application/services/classificar-marcacao.service";
import { listarMarcacoesDoUsuarioNoDia } from "@/modules/marcacoes/infrastructure/repositories/marcacao.repository";
import { RegistroPontoPage } from "@/modules/marcacoes/presentation/components/registro-ponto-page";

export default async function RegistrarMarcacaoPage() {
  await exigirPermissaoOuRedirecionar("marcacoes:registrar:proprio");

  const session = await auth();
  const { servidor, marcacoes } = session?.user
    ? await listarMarcacoesDoUsuarioNoDia(session.user.id)
    : { servidor: null, marcacoes: [] };

  const jornadaAtual = servidor?.jornadas[0]?.jornada;
  let proximaMarcacao: string | null = null;
  let fluxoConcluido = false;

  if (servidor) {
    try {
      proximaMarcacao = classificarProximaMarcacao({
        marcacoesDoDia: marcacoes,
        exigeIntervalo: jornadaAtual?.exigeIntervalo ?? true,
      }).descricao;
    } catch {
      fluxoConcluido = true;
    }
  }

  return (
    <RegistroPontoPage
      servidor={
        servidor
          ? {
              nome: servidor.usuario.nome,
              matricula: servidor.matricula,
              unidade:
                servidor.lotacoes[0]?.unidade.sigla ??
                servidor.lotacoes[0]?.unidade.nome ??
                "Sem lotação ativa",
              jornada: jornadaAtual?.nome ?? "Jornada não definida",
              biometriaAtiva:
                servidor.biometriaFacialServidor?.status === "ATIVO",
            }
          : null
      }
      marcacoes={marcacoes.map((marcacao) => ({
        id: marcacao.id,
        dataHora: marcacao.dataHora.toISOString(),
        tipo: marcacao.tipo,
        fonte: marcacao.fonte,
        status: marcacao.status,
      }))}
      proximaMarcacao={proximaMarcacao}
      fluxoConcluido={fluxoConcluido}
    />
  );
}
