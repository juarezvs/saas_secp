import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  equipamento: vi.fn(), upsert: vi.fn(), execute: vi.fn(), enfileirar: vi.fn(), coletar: vi.fn(),
  evento: vi.fn(), atualizar: vi.fn(), bruta: vi.fn(),
}));
vi.mock("@/shared/infrastructure/database/prisma", () => ({ prisma: {
  equipamentoBiometrico: { findUnique: mocks.equipamento },
  eventoEquipamentoBiometrico: { upsert: mocks.upsert, findUniqueOrThrow: mocks.evento, update: mocks.atualizar },
  marcacaoBruta: { findFirst: mocks.bruta }, $executeRaw: mocks.execute,
} }));
vi.mock("../../queues/control-id-monitor-queue", () => ({ enfileirarMonitorControlId: mocks.enfileirar }));
vi.mock("./relogio-ponto-operacoes.service", () => ({ coletarMarcacoesRelogioPontoService: mocks.coletar }));
import { extrairLogsMonitorControlId, receberMonitorControlId, processarEventoMonitorControlId, tokenMonitorControlIdValido } from "./control-id-monitor.service";

const token = "a".repeat(48);
const equipamentoId = "aae172f9-b95f-4aee-a7a4-79e69979640b";
const log = { id: "519", time: "1792152000", event: "7", user_id: "123", portal_id: "1" };
const dao = (values: unknown = log) => ({ device_id: 478435, object_changes: [{ object: "access_logs", type: "inserted", values }] });
const params = { equipamentoId, token, evento: "dao" };
const request = (body: unknown) => new Request("http://localhost/monitor", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.equipamento.mockResolvedValue({ id: equipamentoId, ativo: true, fabricante: "CONTROL_ID", configuracao: { controlIdMonitorToken: token } });
  mocks.upsert.mockResolvedValue({ id: "evento-1", processado: false });
});
describe("Monitor Control iD", () => {
  it("persiste e vincula o horario corrigido sem alterar a chave externa original", async () => {
    const configuracao = { controlIdMonitorToken: token, accessLogsUtcOffsetMinutos: -240 };
    const dataHora = new Date((Number(log.time) + 14400) * 1000);
    mocks.equipamento.mockResolvedValue({ id: equipamentoId, ativo: true, fabricante: "CONTROL_ID", configuracao });
    await receberMonitorControlId(request(dao()), params);
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ dataHora, codigoEventoExterno: "CONTROL_ID_MONITOR:519:1792152000" }) }));
    mocks.evento.mockResolvedValue({ equipamentoId, processado: false, payload: { fonte: "CONTROL_ID_MONITOR", log }, equipamento: { configuracao } });
    mocks.coletar.mockResolvedValue({ marcacoes: [{}], criadas: 0, processadas: 1 });
    mocks.bruta.mockResolvedValue({ marcacaoId: "existente" });
    await processarEventoMonitorControlId({ equipamentoId, eventoMonitorId: "evento-1" });
    expect(mocks.bruta).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ dataHora }) }));
    expect(mocks.atualizar).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ dataHora, marcacaoId: "existente" }) }));
  });
  it("interpreta payload nativo e descarta propriedades externas aos access_logs", () => {
    expect(extrairLogsMonitorControlId(dao({ ...log, template: "nao armazenar" }))).toEqual([{ id: 519, time: 1792152000, event: 7, user_id: 123, portal_id: 1 }]);
    expect(extrairLogsMonitorControlId({ object_changes: [{ object: "templates", type: "inserted", values: {} }, { object: "access_logs", type: "deleted", values: log }] })).toEqual([]);
  });
  it("rejeita identificadores invalidos em vez de gerar marcacao sem referencia", () => {
    expect(() => extrairLogsMonitorControlId(dao({ ...log, id: "abc" }))).toThrow();
  });
  it("valida a credencial individual do equipamento", () => {
    expect(tokenMonitorControlIdValido(token, token)).toBe(true);
    expect(tokenMonitorControlIdValido("b".repeat(48), token)).toBe(false);
    expect(tokenMonitorControlIdValido("", undefined)).toBe(false);
  });
  it("nega token incorreto antes de gravar ou enfileirar", async () => {
    expect((await receberMonitorControlId(request(dao()), { ...params, token: "errado" })).status).toBe(401);
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.enfileirar).not.toHaveBeenCalled();
  });
  it("persiste o evento e enfileira o processamento sem consultar o equipamento na requisicao", async () => {
    expect((await receberMonitorControlId(request(dao()), params)).status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { equipamentoId_codigoEventoExterno: { equipamentoId, codigoEventoExterno: "CONTROL_ID_MONITOR:519:1792152000" } } }));
    expect(mocks.enfileirar).toHaveBeenCalledWith({ equipamentoId, eventoMonitorId: "evento-1" });
    expect(mocks.coletar).not.toHaveBeenCalled();
  });
  it("nao reprocessa uma notificacao ja concluida", async () => {
    mocks.upsert.mockResolvedValue({ id: "evento-1", processado: true });
    await receberMonitorControlId(request(dao()), params);
    expect(mocks.enfileirar).not.toHaveBeenCalled();
  });
  it("rejeita acesso negado e trata sensor como heartbeat, sem marcacao", async () => {
    await receberMonitorControlId(request(dao({ ...log, event: "3" })), params);
    await receberMonitorControlId(request({ door: { open: true } }), { ...params, evento: "door" });
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.enfileirar).not.toHaveBeenCalled();
    expect(mocks.execute).toHaveBeenCalledTimes(2);
  });
  it("permite reenvio quando a fila falha, mantendo a notificacao salva", async () => {
    mocks.enfileirar.mockRejectedValue(new Error("Redis indisponivel"));
    expect((await receberMonitorControlId(request(dao()), params)).status).toBe(503);
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
  });
  it("processa o payload preservado sem avancar o cursor da coleta", async () => {
    mocks.evento.mockResolvedValue({ id: "evento-1", equipamentoId, processado: false, payload: { fonte: "CONTROL_ID_MONITOR", log } });
    mocks.coletar.mockResolvedValue({ marcacoes: [{}], criadas: 0, processadas: 1 });
    mocks.bruta.mockResolvedValue({ marcacaoId: "marcacao-existente" });
    expect(await processarEventoMonitorControlId({ equipamentoId, eventoMonitorId: "evento-1" })).toMatchObject({ criadas: 0, processadas: 1 });
    expect(mocks.coletar).toHaveBeenCalledWith(expect.objectContaining({ atualizarCursor: false, notificacaoControlIdMonitor: [expect.objectContaining({ id: 519 })] }));
    expect(mocks.atualizar).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ marcacaoId: "marcacao-existente", processado: true }) }));
  });
  it("impede processamento de evento de outro equipamento", async () => {
    mocks.evento.mockResolvedValue({ equipamentoId: "outro" });
    await expect(processarEventoMonitorControlId({ equipamentoId, eventoMonitorId: "evento-1" })).rejects.toThrow("outro equipamento");
    expect(mocks.coletar).not.toHaveBeenCalled();
  });
});
