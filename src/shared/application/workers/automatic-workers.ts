let inicializado = false;

function deveIniciarWorkersAutomaticos() {
  if (process.env.NODE_ENV === "test") {
    return false;
  }

  return process.env.SECP_AUTO_WORKERS !== "false";
}

export async function iniciarWorkersAutomaticos() {
  if (inicializado || !deveIniciarWorkersAutomaticos()) {
    return;
  }

  inicializado = true;

  const resultados = await Promise.allSettled([
    import("@/modules/afd/application/workers/afd-worker-runtime").then(
      ({ garantirAfdWorkerAutomatico }) => garantirAfdWorkerAutomatico(),
    ),
    import(
      "@/modules/marcacoes-brutas/application/workers/reprocessamento-global-worker-runtime"
    ).then(({ garantirReprocessamentoGlobalWorkerAutomatico }) =>
      garantirReprocessamentoGlobalWorkerAutomatico(),
    ),
    import(
      "@/modules/integracoes/application/workers/henry-coleta-worker-runtime"
    ).then(({ garantirHenryColetaWorkerAutomatico }) =>
      garantirHenryColetaWorkerAutomatico(),
    ),
    import(
      "@/modules/integracoes/application/workers/henry-online-worker-runtime"
    ).then(({ garantirHenryOnlineWorkerAutomatico }) =>
      garantirHenryOnlineWorkerAutomatico(),
    ),
  ]);

  resultados.forEach((resultado) => {
    if (resultado.status === "rejected") {
      console.error("[WORKERS] Falha ao iniciar worker automatico:", resultado.reason);
    }
  });
}
