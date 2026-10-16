import { withHttpMetrics } from "@/lib/observability/http";
import { receberMonitorControlId } from "@/modules/integracoes/application/services/relogios-ponto/control-id-monitor.service";

export const runtime = "nodejs";
export const POST = withHttpMetrics(
  "/api/integracoes/control-id/monitor/:equipamentoId/:token/:evento",
  async (request: Request, context: { params: Promise<{ equipamentoId: string; token: string; evento: string }> }) =>
    receberMonitorControlId(request, await context.params),
);
