// Teste operacional opt-in. Nunca executa contra produção; mutações exigem flag e rede explícitas.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.SECP_DISCOVERY_TEST_URL ?? "http://localhost:3000";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Use somente localhost neste teste");
const storageState = process.env.SECP_DISCOVERY_TEST_AUTH;
const orgaoId = process.env.SECP_DISCOVERY_TEST_ORGAO;
assert(storageState && orgaoId, "Informe SECP_DISCOVERY_TEST_AUTH (storageState privado) e SECP_DISCOVERY_TEST_ORGAO");
const mutate = process.env.SECP_DISCOVERY_TEST_MUTATIONS === "1";
const networkId = process.env.SECP_DISCOVERY_TEST_NETWORK;
assert(!mutate || networkId, "Mutações exigem rede já autorizada em SECP_DISCOVERY_TEST_NETWORK");
const path = `/equipamentos/descoberta?orgaoId=${orgaoId}`;
const browser = await chromium.launch({ headless: true });
const checks = [];
await mkdir(".tmp/discovery-qa", { recursive: true });
try {
  const context = await browser.newContext({ storageState });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const response = await page.goto(base + path);
  assert.equal(response.status(), 200);
  assert(!page.url().includes("/login"), "Sessão de teste expirada");
  await page.getByText(/Atualizado em .*atualização automática/).waitFor();
  checks.push("Abertura autenticada e Next.js → FastAPI real");

  const field = (name, scope = page) => scope.locator("label").filter({ hasText: new RegExp("^" + name) });
  await field("Fabricante").getByRole("combobox").click();
  await page.getByPlaceholder("Pesquisar...").fill("CONTROL");
  await page.keyboard.press("Escape");
  await page.getByPlaceholder("IP, modelo, série...").fill("TEST_NO_SUCH_DEVICE");
  await page.getByText("Nenhum dispositivo nesta consulta").waitFor();
  await page.getByPlaceholder("IP, modelo, série...").fill("");
  checks.push("Filtros pesquisáveis e estado vazio");

  const detailsButton = page.getByRole("button", { name: "Detalhes", exact: true }).first();
  if (await detailsButton.count()) {
    await detailsButton.click();
    const drawer = page.getByRole("dialog");
    await drawer.getByText("Número de série", { exact: true }).waitFor();
    await drawer.getByText("Evidências", { exact: true }).waitFor();
    await page.screenshot({ path: ".tmp/discovery-qa/drawer.png" });
    await drawer.getByRole("button", { name: "Fechar detalhes" }).click();
    const checkbox = page.getByRole("checkbox").first();
    if (await checkbox.isEnabled()) {
      await checkbox.check();
      assert(await page.getByRole("button", { name: "Cadastrar selecionados (1/20)" }).isEnabled());
      await checkbox.uncheck();
    }
    checks.push("Resultados, evidências, drawer e seleção em lote");
  }
  for (const tab of ["Histórico", "Gerenciar agentes", "Redes autorizadas", "Resultados"]) {
    await page.getByRole("button", { name: tab, exact: true }).click();
  }
  checks.push("Histórico, agentes e redes");

  if (mutate) {
    await page.getByRole("button", { name: "Nova descoberta", exact: true }).click();
    const form = page.getByRole("dialog");
    await field("Modo", form).locator("select").selectOption("network", { force: true });
    await field("Rede autorizada", form).locator("select").selectOption(networkId, { force: true });
    const created = page.waitForResponse(r => r.url().includes("/api/descoberta-equipamentos") && r.request().method() === "POST");
    await form.getByRole("button", { name: "Iniciar descoberta", exact: true }).click();
    const result = await created;
    assert.equal(result.status(), 200, await result.text());
    await page.getByRole("progressbar").first().waitFor();
    const cancelled = page.waitForResponse(r => r.url().includes("/api/descoberta-equipamentos") && r.request().method() === "POST");
    await page.getByRole("button", { name: "Cancelar", exact: true }).first().click();
    const cancelResponse = await cancelled;
    assert.equal(cancelResponse.status(), 200);
    assert(["CANCELLING", "CANCELLED"].includes((await cancelResponse.json()).state));
    checks.push("Nova descoberta, progresso mensurável e cancelamento real");
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: ".tmp/discovery-qa/mobile.png", fullPage: true });
  assert(await page.getByRole("button", { name: "Nova descoberta", exact: true }).isVisible());
  checks.push("Layout móvel e ausência de erros JavaScript");
  assert.deepEqual(errors, []);

  const errorPage = await context.newPage();
  await errorPage.route("**/api/descoberta-equipamentos?**", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "TEST ONLY: serviço indisponível" }) }));
  await errorPage.goto(base + path);
  await errorPage.getByRole("alert").filter({ hasText: "TEST ONLY" }).waitFor();
  await errorPage.close();
  const anonymous = await browser.newContext();
  const denied = await anonymous.request.get(base + "/api/descoberta-equipamentos", { maxRedirects: 0 });
  assert([401, 302, 307].includes(denied.status()), "Acesso anônimo deve ser recusado ou redirecionado ao login");
  if (denied.status() !== 401) assert(denied.headers().location?.includes("/login"));
  await anonymous.close();
  checks.push("Indisponibilidade controlada e acesso anônimo bloqueado");
  console.log(JSON.stringify({ passed: true, checks }, null, 2));
} finally {
  await browser.close();
}
