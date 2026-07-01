export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") {
    return;
  }

  const { iniciarWorkersAutomaticos } = await import(
    "@/shared/application/workers/automatic-workers"
  );

  await iniciarWorkersAutomaticos();
}
