export function recalculoEspelhoPontoDisponivel() {
  return process.env.RECALCULO_ESPELHO_PONTO_WORKER_ENABLED !== "false";
}
