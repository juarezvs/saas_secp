import { criarRelatorioExportacaoWorker } from "../src/modules/relatorios/application/workers/relatorio-exportacao-worker-runtime";

const worker = criarRelatorioExportacaoWorker();

async function encerrar() {
  await worker.close();
  process.exit(0);
}

process.on("SIGINT", () => {
  void encerrar();
});

process.on("SIGTERM", () => {
  void encerrar();
});
