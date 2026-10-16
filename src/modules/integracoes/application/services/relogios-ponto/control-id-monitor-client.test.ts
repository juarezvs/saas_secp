import { afterEach, describe, expect, it, vi } from "vitest";
import { ControlIdFaceIdClient } from "./control-id-face-id.client";

afterEach(() => vi.unstubAllGlobals());
const token = "a".repeat(48);
const id = "aae172f9-b95f-4aee-a7a4-79e69979640b";
const logs = [
  { id: 519, time: 1792152000, event: 7, user_id: 123 },
  { id: 520, time: 1792152001, event: 3, user_id: 0 },
];
function equipamento() {
  const escritas: Record<string, unknown>[] = [];
  let monitor: Record<string, unknown> = {};
  vi.stubGlobal("fetch", vi.fn(async (url: URL, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    let response: unknown = {};
    if (url.pathname === "/login.fcgi") response = { session: "mock" };
    if (url.pathname === "/load_objects.fcgi") response = body.object === "users"
      ? { users: [{ id: 123, registration: "RR200401", cpf: "52998224725" }] } : { access_logs: logs };
    if (url.pathname === "/set_configuration.fcgi") { escritas.push(body); monitor = body.monitor; }
    if (url.pathname === "/get_configuration.fcgi") response = { monitor };
    return new Response(JSON.stringify(response), { status: 200 });
  }));
  return { escritas, client: new ControlIdFaceIdClient({ equipamentoId: id, codigo: "teste", fabricante: "CONTROL_ID", ip: "127.0.0.1", porta: 80, configuracao: { controlIdMonitorToken: token } }) };
}
describe("Control iD Monitor e Access API", () => {
  it("produz a mesma identificacao e chave fisica nos dois canais", async () => {
    const { client } = equipamento();
    const coleta = await client.coletarMarcacoesDesdeNsr({ nsrInicial: 519 });
    const monitor = await client.converterNotificacaoMonitor(logs);
    expect(monitor.marcacoes).toEqual(coleta.marcacoes);
    expect(monitor.marcacoes).toHaveLength(1);
    expect(monitor.marcacoes[0]).toMatchObject({ nsr: "519", codigoExterno: "519", cpf: "52998224725", matricula: "RR200401" });
  });
  it("configura somente o Monitor e confirma os parametros no equipamento", async () => {
    const { client, escritas } = equipamento();
    const r = await client.configurarEventosOnline({ habilitado: true, ipServidor: "172.19.5.244", portaServidor: 3000 });
    expect(r.sucesso).toBe(true);
    expect(escritas).toEqual([{ monitor: {
      hostname: "172.19.5.244", port: "3000", path: `api/integracoes/control-id/monitor/${id}/${token}`, request_timeout: "5000",
    } }]);
    expect(JSON.stringify(r)).not.toContain(token);
  });
  it("desativa somente a entrega de notificacoes", async () => {
    const { client, escritas } = equipamento();
    expect((await client.configurarEventosOnline({ habilitado: false })).sucesso).toBe(true);
    expect(escritas[0]).toEqual({ monitor: { hostname: "", port: "0", path: "api/notifications", request_timeout: "5000" } });
  });
});
