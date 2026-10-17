import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { cadastrarMinutaCampanhaSjam2026, executarOperacaoOrcamentoCampanha, type ContextoOrcamentoCampanha } from "./orcamento-campanha-horas-extras.service";

const connectionString = process.env.HORAS_EXTRAS_TEST_DATABASE_URL;
if (connectionString) {
  const url = new URL(connectionString);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || !/^\/secp_he_test_[a-z0-9_]+$/.test(url.pathname)) {
    throw new Error("Integracao permitida somente em banco local descartavel secp_he_test_*.");
  }
}

describe.runIf(Boolean(connectionString))("orcamento de campanha - PostgreSQL real e migracao aditiva", () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const db2 = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const ator = "99999999-9999-4999-8999-999999999993";
  let orgaoId: string;
  let outroOrgaoId: string;
  let contexto: ContextoOrcamentoCampanha;

  beforeAll(async () => {
    const orgao = await db.orgao.upsert({ where: { sigla: "SJAM" }, update: {}, create: { sigla: "SJAM", nome: "SJAM ficticia de teste" } });
    const outro = await db.orgao.upsert({ where: { sigla: "OUTRO_HE_TEST" }, update: {}, create: { sigla: "OUTRO_HE_TEST", nome: "Outro orgao ficticio" } });
    orgaoId = orgao.id; outroOrgaoId = outro.id;
    // Somente minutas fictícias sem razão financeira, no banco de teste protegido.
    await db.overtimeCampaign.updateMany({
      where: { orgaoId, code: "SJAM-HE-2026-DIREF-26097342", status: "DRAFT", operations: { none: {} } },
      data: { code: `TEST_ARCHIVE_${randomUUID()}` },
    });
    contexto = { usuarioId: ator, perfilAtivoCodigo: "FINANCEIRO_TESTE",
      permissoes: ["horas-extras:responder-orcamento:seccional", "horas-extras:configurar-politica:seccional"],
      escopo: { global: false, orgaoIds: [orgaoId] } };
    // Falha tardia intencional para provar rollback de duas contas e razão.
    await db.$executeRawUnsafe(`CREATE OR REPLACE FUNCTION teste_he_falhar_auditoria() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.metadados->>'correlationId' = 'TEST_ROLLBACK' THEN RAISE EXCEPTION 'Falha de auditoria simulada'; END IF;
      RETURN NEW; END; $$`);
    await db.$executeRawUnsafe(`CREATE OR REPLACE TRIGGER teste_he_audit BEFORE INSERT ON auditoria_eventos
      FOR EACH ROW EXECUTE FUNCTION teste_he_falhar_auditoria()`);
  });
  beforeEach(() => {
    vi.stubEnv("HORAS_EXTRAS_CAMPANHAS_ENABLED", "true");
    vi.stubEnv("HORAS_EXTRAS_CAMPANHAS_ORGAOS", `${orgaoId},${outroOrgaoId}`);
  });
  afterAll(async () => {
    vi.unstubAllEnvs();
    await Promise.all([db.$disconnect(), db2.$disconnect()]);
  });

  async function unidade(tipo: "VARA" | "CENTRO_CONCILIACAO" = "VARA", orgao = orgaoId) {
    const key = randomUUID();
    return db.unidadeOrganizacional.create({ data: { orgaoId: orgao, codigo: key, sigla: key, nome: `Unidade ficticia ${key}`, tipo } });
  }
  async function fixture(credito = "100.00") {
    const unidades = await Promise.all([unidade(), unidade()]);
    const campanha = await db.overtimeCampaign.create({ data: {
      orgaoId, code: randomUUID(), name: "Campanha ficticia de integracao", fiscalYear: 2026,
      seiProcess: "TESTE-FICTICIO", authorizationDocument: "AUTORIZACAO-FICTICIA",
      validFrom: new Date("2026-10-01Z"), validUntil: new Date("2026-12-31Z"),
      projectDeadline: new Date("2026-10-21Z"), proofDeadline: new Date("2026-11-19Z"),
      status: "ACTIVE", rules: {}, sourceManifest: [],
      accounts: { create: unidades.map((item) => ({ unitId: item.id, referenceAmount: "18000.00" })) },
    }, include: { accounts: { orderBy: { id: "asc" } } } });
    const sourceAccountId = campanha.accounts[0].id;
    const destinationAccountId = campanha.accounts[1].id;
    const base = { orgaoId, campaignId: campanha.id, sourceAccountId };
    if (credito !== "0.00") {
      await operar(base, "ALLOCATE", credito);
      await operar(base, "DECENTRALIZE", credito);
    }
    return { ...base, destinationAccountId, campanha };
  }
  function comando(base: { orgaoId: string; campaignId: string; sourceAccountId: string }, type: string, amount: string) {
    return { orgaoId: base.orgaoId, campaignId: base.campaignId, sourceAccountId: base.sourceAccountId,
      type, amount, idempotencyKey: randomUUID(), reason: "Justificativa documental inteiramente ficticia para teste",
      seiDocument: "SEI-TESTE-FICTICIO", originReference: "PROJETO-TESTE-FICTICIO", correlationId: randomUUID() };
  }
  function operar(base: { orgaoId: string; campaignId: string; sourceAccountId: string }, type: string, amount: string, extra = {}) {
    return executarOperacaoOrcamentoCampanha(db, contexto, { ...comando(base, type, amount), ...extra });
  }

  it("preserva os registros ficticios inseridos no schema anterior antes da migration", async () => {
    expect(await db.orgao.findUnique({ where: { id: "99999999-9999-4999-8999-999999999991" } })).toMatchObject({ sigla: "HE_HIST", nome: "Orgao historico ficticio para ensaio" });
    expect(await db.unidadeOrganizacional.findUnique({ where: { id: "99999999-9999-4999-8999-999999999992" } })).toMatchObject({ codigo: "HE_HIST" });
    expect(await db.usuario.findUnique({ where: { id: ator } })).toMatchObject({ matricula: "HE_TEST_FICTICIO" });
    const historico = await db.autorizacaoHoraExtraAdministrativa.findUniqueOrThrow({
      where: { id: "99999999-9999-4999-8999-999999999995" },
      include: { atestos: true, calculos: { include: { itens: true, remuneracoesSnapshots: true } } },
    });
    expect(historico.status).toBe("PAGA");
    expect(historico.conteudoOriginalAutorizado).toEqual({ origem: "HISTORICO_FICTICIO_PRESERVAR" });
    expect(historico.atestos[0].snapshot).toEqual({ origem: "ATESTO_FICTICIO_PRESERVAR" });
    expect(historico.calculos[0]).toMatchObject({ totalMinutos: 120, totalValorCentavos: 12000, memoriaCalculo: { origem: "MEMORIA_FICTICIA_PRESERVAR" } });
    expect(historico.calculos[0].itens[0]).toMatchObject({ minutos: 120, valorCentavos: 12000, remuneracaoBaseCentavos: 800000 });
    expect(historico.calculos[0].remuneracoesSnapshots[0].payload).toEqual({ origem: "REMUNERACAO_FICTICIA_PRESERVAR" });
  });

  it("duas conexoes concorrentes nao reservam R$120 em saldo de R$100", async () => {
    const f = await fixture();
    const resultados = await Promise.allSettled([
      executarOperacaoOrcamentoCampanha(db, contexto, comando(f, "RESERVE", "60.00")),
      executarOperacaoOrcamentoCampanha(db2, contexto, comando(f, "RESERVE", "60.00")),
    ]);
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(resultados.filter((r) => r.status === "rejected")).toHaveLength(1);
    const conta = await db.overtimeCampaignAccount.findUniqueOrThrow({ where: { id: f.sourceAccountId } });
    expect(conta.reservedAmount.toFixed(2)).toBe("60.00");
    expect(await db.overtimeBudgetOperation.count({ where: { campaignId: f.campaignId, type: "RESERVE" } })).toBe(1);
  });

  it("repeticao concorrente da mesma chave grava uma operacao e uma auditoria", async () => {
    const f = await fixture();
    const input = comando(f, "RESERVE", "25.00");
    const resultados = await Promise.all([
      executarOperacaoOrcamentoCampanha(db, contexto, input),
      executarOperacaoOrcamentoCampanha(db2, contexto, input),
    ]);
    expect(resultados.map((r) => r.replayed).sort()).toEqual([false, true]);
    expect(resultados[0].operation.id).toBe(resultados[1].operation.id);
    expect(await db.auditoriaEvento.count({ where: { entidade: "OvertimeBudgetOperation", entidadeId: resultados[0].operation.id } })).toBe(1);
    await expect(executarOperacaoOrcamentoCampanha(db, contexto, { ...input, amount: "26.00" })).rejects.toThrow(/conteudo diferente/);
  });

  it("referencia ou alocacao sem descentralizacao nao permite reserva", async () => {
    const f = await fixture("0.00");
    await operar(f, "ALLOCATE", "18000");
    await expect(operar(f, "RESERVE", "0.01")).rejects.toThrow(/Saldo insuficiente/);
    expect(await db.overtimeBudgetOperation.count({ where: { campaignId: f.campaignId, type: "RESERVE" } })).toBe(0);
  });

  it("execucao e liberacao respeitam a reserva de origem mesmo com outra reserva na conta", async () => {
    const f = await fixture();
    const reserva = await operar(f, "RESERVE", "40");
    await operar(f, "RESERVE", "50");
    await operar(f, "EXECUTE", "10", { reservationOperationId: reserva.operation.id });
    await operar(f, "RELEASE", "30", { reservationOperationId: reserva.operation.id });
    await expect(operar(f, "RELEASE", "1", { reservationOperationId: reserva.operation.id })).rejects.toThrow(/remanescente/);
    const conta = await db.overtimeCampaignAccount.findUniqueOrThrow({ where: { id: f.sourceAccountId } });
    expect(conta.reservedAmount.toFixed(2)).toBe("50.00");
    expect(conta.executedAmount.toFixed(2)).toBe("10.00");
  });

  it("remanejamento distingue alocacao de credito e conserva os totais", async () => {
    const f = await fixture();
    await operar(f, "TRANSFER_ALLOCATION", "25", { destinationAccountId: f.destinationAccountId });
    let destino = await db.overtimeCampaignAccount.findUniqueOrThrow({ where: { id: f.destinationAccountId } });
    expect(destino.allocatedAmount.toFixed(2)).toBe("25.00");
    expect(destino.decentralizedAmount.toFixed(2)).toBe("0.00");
    await operar(f, "TRANSFER_CREDIT", "25", { destinationAccountId: f.destinationAccountId });
    destino = await db.overtimeCampaignAccount.findUniqueOrThrow({ where: { id: f.destinationAccountId } });
    const origem = await db.overtimeCampaignAccount.findUniqueOrThrow({ where: { id: f.sourceAccountId } });
    expect(origem.decentralizedAmount.plus(destino.decentralizedAmount).toFixed(2)).toBe("100.00");
    await operar({ ...f, sourceAccountId: f.destinationAccountId }, "RESERVE", "25");
  });

  it("falha tardia de auditoria desfaz as duas pernas, projecoes e operacao", async () => {
    const f = await fixture();
    const antes = await db.overtimeCampaignAccount.findMany({ where: { campaignId: f.campaignId }, orderBy: { id: "asc" } });
    const operacoes = await db.overtimeBudgetOperation.count({ where: { campaignId: f.campaignId } });
    await expect(operar(f, "TRANSFER_CREDIT", "30", { destinationAccountId: f.destinationAccountId, correlationId: "TEST_ROLLBACK" })).rejects.toThrow(/auditoria simulada/);
    const depois = await db.overtimeCampaignAccount.findMany({ where: { campaignId: f.campaignId }, orderBy: { id: "asc" } });
    expect(depois.map((c) => c.decentralizedAmount.toFixed(2))).toEqual(antes.map((c) => c.decentralizedAmount.toFixed(2)));
    expect(await db.overtimeBudgetOperation.count({ where: { campaignId: f.campaignId } })).toBe(operacoes);
  });

  it("razao e operacoes nao admitem alteracao ou exclusao direta", async () => {
    const f = await fixture();
    const resultado = await operar(f, "RESERVE", "10");
    await expect(db.overtimeBudgetOperation.update({ where: { id: resultado.operation.id }, data: { reason: "tentativa de sobrescrita" } })).rejects.toThrow(/imutavel/);
    await expect(db.overtimeBudgetMovement.deleteMany({ where: { operationId: resultado.operation.id } })).rejects.toThrow(/imutavel/);
    expect(await db.overtimeBudgetMovement.count({ where: { operationId: resultado.operation.id } })).toBe(1);
  });

  it("nega leitura como permissao de escrita, escopo vazio e campanha de outro orgao", async () => {
    const f = await fixture();
    const input = comando(f, "RESERVE", "10");
    await expect(executarOperacaoOrcamentoCampanha(db, { ...contexto, permissoes: ["horas-extras:visualizar-folha:global"] }, input)).rejects.toThrow(/permissao/);
    await expect(executarOperacaoOrcamentoCampanha(db, { ...contexto, escopo: { global: false, orgaoIds: [] } }, input)).rejects.toThrow(/permissao/);
    await expect(executarOperacaoOrcamentoCampanha(db, contexto, { ...input, orgaoId: outroOrgaoId })).rejects.toThrow(/permissao/);
  });

  it("orgao inativo e ancestral de unidade inativo bloqueiam movimentacoes", async () => {
    const f = await fixture();
    const conta = await db.overtimeCampaignAccount.findUniqueOrThrow({ where: { id: f.sourceAccountId } });
    const pai = await unidade();
    await db.unidadeOrganizacional.update({ where: { id: pai.id }, data: { ativo: false } });
    await db.unidadeOrganizacional.update({ where: { id: conta.unitId }, data: { unidadePaiId: pai.id } });
    await expect(operar(f, "RESERVE", "1")).rejects.toThrow(/superior inativa/);
    await db.unidadeOrganizacional.update({ where: { id: conta.unitId }, data: { unidadePaiId: null } });
    await db.orgao.update({ where: { id: orgaoId }, data: { ativo: false } });
    try { await expect(operar(f, "RESERVE", "1")).rejects.toThrow(/Orgao inativo/); }
    finally { await db.orgao.update({ where: { id: orgaoId }, data: { ativo: true } }); }
  });

  it("chaves compostas impedem vincular unidade de outro orgao e checks impedem saldo negativo", async () => {
    const f = await fixture();
    const outraUnidade = await unidade("VARA", outroOrgaoId);
    await expect(db.overtimeCampaignAccount.create({ data: { campaignId: f.campaignId, orgaoId, unitId: outraUnidade.id, referenceAmount: "18000" } })).rejects.toThrow();
    await expect(db.overtimeCampaignAccount.update({ where: { id: f.sourceAccountId }, data: { reservedAmount: "101" } })).rejects.toThrow();
  });

  it("minuta documental da SJAM nasce rascunho e com todos os saldos zerados", async () => {
    const unidades = await Promise.all([unidade(), unidade("CENTRO_CONCILIACAO")]);
    const minuta = await cadastrarMinutaCampanhaSjam2026(db, contexto, { orgaoId, unitIds: unidades.map((u) => u.id) });
    expect(minuta.status).toBe("DRAFT");
    expect(minuta.validFrom).toBeNull();
    const contas = await db.overtimeCampaignAccount.findMany({ where: { campaignId: minuta.id } });
    expect(contas.map((c) => c.referenceAmount.toFixed(2)).sort()).toEqual(["18000.00", "5000.00"]);
    expect(contas.every((c) => c.allocatedAmount.isZero() && c.decentralizedAmount.isZero() && c.reservedAmount.isZero() && c.executedAmount.isZero())).toBe(true);
    await expect(operar({ orgaoId, campaignId: minuta.id, sourceAccountId: contas[0].id }, "ALLOCATE", "1")).rejects.toThrow(/nao ativa/);
    expect(await db.overtimeBudgetOperation.count({ where: { campaignId: minuta.id } })).toBe(0);
    expect(await db.auditoriaEvento.count({ where: { entidade: "OvertimeCampaign", entidadeId: minuta.id } })).toBe(1);
  });

  it("flag desativada impede novas operacoes mesmo com perfil financeiro", async () => {
    const f = await fixture();
    vi.stubEnv("HORAS_EXTRAS_CAMPANHAS_ENABLED", "false");
    await expect(operar(f, "RESERVE", "1")).rejects.toThrow(/homologacao/);
    expect(await db.overtimeBudgetOperation.count({ where: { campaignId: f.campaignId, type: "RESERVE" } })).toBe(0);
  });

  it("reserva e destino de outra campanha nao podem ser consumidos ou remanejados", async () => {
    const a = await fixture();
    const b = await fixture();
    const reserva = await operar(a, "RESERVE", "20");
    await expect(operar(b, "EXECUTE", "10", { reservationOperationId: reserva.operation.id })).rejects.toThrow(/Reserva de origem/);
    await expect(operar(a, "TRANSFER_CREDIT", "10", { destinationAccountId: b.sourceAccountId })).rejects.toThrow(/fora da campanha/);
  });
});
