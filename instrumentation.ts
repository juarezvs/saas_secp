export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  const { inicializarTracing } = await import("./src/lib/observability/tracing");
  await inicializarTracing();

  const { iniciarWorkersAutomaticos } = await import(
    "./src/shared/application/workers/automatic-workers"
  );

  await iniciarWorkersAutomaticos();
}
