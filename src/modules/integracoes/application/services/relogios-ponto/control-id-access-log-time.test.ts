import { describe, expect, it } from "vitest";
import { dataHoraAccessLogControlId } from "./control-id-access-log-time";

describe("horario dos access_logs Control iD", () => {
  const time = Date.parse("2026-10-16T14:01:06Z") / 1000;
  it("mantem UTC para equipamentos sem ajuste confirmado", () => {
    expect(dataHoraAccessLogControlId(time)?.toISOString()).toBe("2026-10-16T14:01:06.000Z");
  });
  it("interpreta 14h01 local de Manaus como 18h01 UTC", () => {
    expect(dataHoraAccessLogControlId(time, { accessLogsUtcOffsetMinutos: -240 })?.toISOString()).toBe("2026-10-16T18:01:06.000Z");
  });
  it("preserva a virada da data no fuso local", () => {
    expect(dataHoraAccessLogControlId(Date.parse("2026-10-16T23:30:00Z") / 1000, { accessLogsUtcOffsetMinutos: -240 })?.toISOString()).toBe("2026-10-17T03:30:00.000Z");
  });
  it("rejeita offsets invalidos e timestamps nao numericos", () => {
    expect(() => dataHoraAccessLogControlId(time, { accessLogsUtcOffsetMinutos: 1440 })).toThrow("invalido");
    expect(dataHoraAccessLogControlId("invalido")).toBeNull();
  });
});
