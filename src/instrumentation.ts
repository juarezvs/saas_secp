export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  if (
    process.env.NODE_ENV === "test" ||
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build"
  ) {
    return;
  }

  const { inicializarTracing } = await import("@/lib/observability/tracing");
  await inicializarTracing();

  if (process.env.SECP_AUTO_WORKERS === "false") {
    return;
  }

  const importarModulo = new Function(
    "specifier",
    "return import(specifier)",
  ) as (specifier: string) => Promise<{
    iniciarWorkersAutomaticos: () => Promise<void>;
  }>;
  const { iniciarWorkersAutomaticos } = await importarModulo(
    "@/shared/application/workers/automatic-workers",
  );

  await iniciarWorkersAutomaticos();
}
