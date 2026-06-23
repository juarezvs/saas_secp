export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { iniciarWorkersAutomaticos } = await import(
    "./src/shared/application/workers/automatic-workers"
  );

  await iniciarWorkersAutomaticos();
}
