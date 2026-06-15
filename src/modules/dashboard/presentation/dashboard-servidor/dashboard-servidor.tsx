import { DashboardServidor as DashboardServidorAtual } from "@/modules/dashboard/presentation/components/dashboard-servidor";
import { buscarNomeServidorPorUsuarioId } from "@/modules/servidores/infrastructure/repositories/servidor.repository";

type DashboardServidorProps = {
  usuarioId: string;
  nomeFallback: string;
};

export async function DashboardServidor({
  usuarioId,
  nomeFallback,
}: DashboardServidorProps) {
  const servidor = await buscarNomeServidorPorUsuarioId(usuarioId);
  const nome = servidor?.nomeFuncional?.trim() || servidor?.usuario.nome || nomeFallback;
  const primeiroNome = nome.trim().split(/\s+/)[0] || "Servidor";

  return <DashboardServidorAtual primeiroNome={primeiroNome} />;
}
