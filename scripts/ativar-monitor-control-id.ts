import fs from "node:fs";
import { prisma } from "../src/shared/infrastructure/database/prisma";
import { configurarEventosOnlineRelogioPontoService } from "../src/modules/integracoes/application/services/relogios-ponto/relogio-ponto-operacoes.service";

const [sigla, servidor, portaTexto, diretorio] = process.argv.slice(2);
const porta = Number(portaTexto);
if (!sigla || !servidor || !Number.isInteger(porta) || porta < 1 || porta > 65535 || !diretorio) {
  throw new Error("Uso: tsx scripts/ativar-monitor-control-id.ts ORGAO IP_SERVIDOR PORTA DIRETORIO_BACKUP --aplicar");
}
const aplicar = process.argv.includes("--aplicar");
const anteriores: unknown[] = [];
fs.mkdirSync(diretorio, { recursive: true, mode: 0o700 });
try {
  const equipamentos = await prisma.equipamentoBiometrico.findMany({
    where: { ativo: true, fabricante: "CONTROL_ID", OR: [{ orgao: { sigla } }, { unidade: { orgao: { sigla } } }] },
    orderBy: { codigo: "asc" },
  });
  for (const e of equipamentos) {
    const c = (e.configuracao ?? {}) as Record<string, unknown>;
    if (!e.ip || c.protocolo === "CONTROL_ID_IDCLASS_BIO") continue;
    let session: string | undefined;
    const post = async (path: string, body: unknown) => {
      const response = await fetch(`http://${e.ip}:${e.porta ?? 80}${path}${session ? `?session=${encodeURIComponent(session)}` : ""}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(5000),
      });
      const result = await response.json() as Record<string, unknown>;
      if (!response.ok || result.error) throw new Error(`Control iD HTTP ${response.status}: ${String(result.error ?? "erro")}`);
      return result;
    };
    try {
      const login = await post("/login.fcgi", { login: c.usuarioConfiguracao ?? c.usuario ?? "admin", password: c.senhaConfiguracao ?? c.senha ?? "admin" });
      session = String(login.session ?? "");
      if (!session) throw new Error("Equipamento nao autenticou.");
      const antes = await post("/get_configuration.fcgi", { monitor: ["hostname", "port", "path"], general: ["online", "local_identification"] });
      anteriores.push({ equipamentoId: e.id, codigo: e.codigo, ip: e.ip, configuracao: antes, lidoEm: new Date().toISOString() });
      fs.writeFileSync(`${diretorio}/monitor-configuracoes-anteriores.json`, JSON.stringify(anteriores, null, 2), { mode: 0o600 });
      if (!aplicar) { console.log(JSON.stringify({ codigo: e.codigo, ip: e.ip, etapa: "simulacao", servidor, porta })); continue; }
      const resultado = await configurarEventosOnlineRelogioPontoService({ equipamentoId: e.id, habilitado: true, ipServidor: servidor, portaServidor: porta });
      if (!resultado.sucesso) throw new Error(resultado.mensagem);
      const depois = await post("/get_configuration.fcgi", { general: ["online", "local_identification"] });
      if (JSON.stringify(antes.general) !== JSON.stringify(depois.general)) throw new Error("Modo de operacao mudou durante a configuracao; verificar equipamento.");
      await prisma.auditoriaEvento.create({ data: {
        entidade: "EquipamentoBiometrico", entidadeId: e.id, acao: "CONTROL_ID_MONITOR_ATIVADO",
        dadosDepois: { servidor, porta, monitorHabilitado: true, modoOperacaoPreservado: true },
      } });
      console.log(JSON.stringify({ codigo: e.codigo, ip: e.ip, ativado: true, servidor, porta }));
    } catch (error) {
      console.error(JSON.stringify({ codigo: e.codigo, ip: e.ip, ativado: false, erro: error instanceof Error ? error.message : String(error) }));
    } finally {
      if (session) await post("/logout.fcgi", {}).catch(() => {});
    }
  }
} finally {
  await prisma.$disconnect();
}
process.exit(0);
