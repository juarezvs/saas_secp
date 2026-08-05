import { auth } from "@/auth";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import { PERMISSOES_ACESSO_REGISTRO_PONTO_SECP } from "@/modules/auth/domain/constants/perfis-sistema";
import { classificarProximaMarcacao } from "@/modules/marcacoes/application/services/classificar-marcacao.service";
import { listarMarcacoesDoUsuarioNoDia } from "@/modules/marcacoes/infrastructure/repositories/marcacao.repository";
import { RegistroPontoPage } from "@/modules/marcacoes/presentation/components/registro-ponto-page";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";

export default async function RegistrarMarcacaoPage() {
  await exigirUmaDasPermissoesOuRedirecionar(
    PERMISSOES_ACESSO_REGISTRO_PONTO_SECP,
  );

  const session = await auth();
  const permissoes = session?.user.perfilAtivo?.permissoes ?? [];
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
              nome: nomeServidor(servidor),
              matricula: servidor.matricula,
              unidade:
                servidor.lotacoes[0]?.unidade.sigla ??
                servidor.lotacoes[0]?.unidade.nome ??
                "Sem lotação ativa",
              jornada: jornadaAtual?.nome ?? "Jornada não definida",
              exigeIntervalo: jornadaAtual?.exigeIntervalo ?? true,
              biometriaAtiva:
                servidor.biometriaFacialServidor?.status === "ATIVO",
            }
          : null
      }
      marcacoes={marcacoes.map((marcacao) => ({
        id: marcacao.id,
        dataHora: marcacao.dataHora.toISOString(),
        fusoHorario: marcacao.fusoHorario,
        tipo: marcacao.tipo,
        fonte: marcacao.fonte,
        status: marcacao.status,
      }))}
      proximaMarcacao={proximaMarcacao}
      fluxoConcluido={fluxoConcluido}
      podeRegistrarWeb={permissoes.includes("marcacoes:registrar-web:proprio")}
      podeRegistrarFacial={permissoes.includes(
        "marcacoes:registrar-facial:proprio",
      )}
    />
  );
}
