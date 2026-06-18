import { buscarContextoDashboardServidor } from "@/modules/dashboard/application/dashboard-servidor-contexto.service";
import { buscarFrequenciaMesServidorPorUsuarioId } from "@/modules/dashboard/application/frequencia-mes-servidor.service";
import { DashboardServidor as DashboardServidorAtual } from "@/modules/dashboard/presentation/components/dashboard-servidor";
import { contarNotificacoesUsuario } from "@/modules/notificacoes/application/notificacoes.service";
import { buscarNomeServidorPorUsuarioId } from "@/modules/servidores/infrastructure/repositories/servidor.repository";

type DashboardServidorProps = {
  usuarioId: string;
  nomeFallback: string;
};

export async function DashboardServidor({
  usuarioId,
  nomeFallback,
}: DashboardServidorProps) {
  const [servidor, contexto, totalNotificacoes, frequenciaMes] =
    await Promise.all([
      buscarNomeServidorPorUsuarioId(usuarioId),
      buscarContextoDashboardServidor(usuarioId),
      contarNotificacoesUsuario(usuarioId),
      buscarFrequenciaMesServidorPorUsuarioId(usuarioId),
    ]);
  const nome = servidor?.nomeFuncional?.trim() || servidor?.usuario.nome || nomeFallback;
  const primeiroNome = nome.trim().split(/\s+/)[0] || "Servidor";

  return (
    <DashboardServidorAtual
      primeiroNome={primeiroNome}
      cabecalho={contexto}
      totalNotificacoes={totalNotificacoes}
      frequenciaMes={frequenciaMes ?? undefined}
    />
  );
}
