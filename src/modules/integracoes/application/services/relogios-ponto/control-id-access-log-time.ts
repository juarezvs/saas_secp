// Alguns firmwares devolvem a hora civil local codificada como Unix UTC.
// O ajuste deve ser confirmado e habilitado por equipamento; UTC é o padrão.
export function dataHoraAccessLogControlId(valor: unknown, configuracao?: unknown) {
  const segundos = Number(valor);
  if (!Number.isFinite(segundos)) return null;
  const config = configuracao && typeof configuracao === "object"
    ? configuracao as Record<string, unknown> : {};
  const offsetConfigurado = config.accessLogsUtcOffsetMinutos;
  const offset = offsetConfigurado == null ? 0 : Number(offsetConfigurado);
  if (!Number.isInteger(offset) || offset < -720 || offset > 840) {
    throw new Error("Fuso dos access_logs Control iD invalido.");
  }
  const data = new Date((segundos - offset * 60) * 1000);
  return Number.isNaN(data.getTime()) ? null : data;
}
