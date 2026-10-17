import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { restringirConsultaOrganizacional, whereOrganizacaoVisivel } from "./visibilidade-organizacional";

const contexto = { unidadesOcultas: ["pai-inativo", "filha-ativa"], hoje: new Date("2026-10-17T00:00:00Z") };

describe("visibilidade organizacional", () => {
  it("mantém o mapa de relações compatível com o schema Prisma", () => {
    expect(() => execFileSync(process.execPath, ["scripts/gerar-mapa-visibilidade-organizacional.mjs", "--check"])).not.toThrow();
  });
  it("não permite que filtros recebidos substituam o status do órgão", () => {
    const result = restringirConsultaOrganizacional("Orgao", { where: { ativo: false, id: "inativo" }, take: 10, skip: 20 }, contexto);
    expect(result).toEqual({ where: { ativo: false, id: "inativo", AND: [{ ativo: true }] }, take: 10, skip: 20 });
  });
  it("oculta unidades inativas e descendentes mesmo que o próprio status seja ativo", () => {
    expect(whereOrganizacaoVisivel("UnidadeOrganizacional", contexto)).toEqual({ ativo: true, orgao: { is: { ativo: true } }, id: { notIn: contexto.unidadesOcultas } });
  });
  it("usa só lotações vigentes para ocultar servidores e não altera o filtro de status da pessoa", () => {
    const result = restringirConsultaOrganizacional("Servidor", { where: { ativo: false, matricula: "AM123" } }, contexto);
    expect(result.where).toEqual({ ativo: false, matricula: "AM123", AND: [{
      orgao: { is: { ativo: true } }, lotacoes: { none: { status: "ATIVO", dataInicio: { lte: contexto.hoje }, OR: [{ dataFim: null }, { dataFim: { gte: contexto.hoje } }], unidadeId: { in: contexto.unidadesOcultas } } },
    }] });
  });
  it("restringe equipamentos por órgão e unidade, preservando vínculos nulos globais", () => {
    const where = whereOrganizacaoVisivel("EquipamentoBiometrico", contexto);
    expect(JSON.stringify(where)).toContain('"orgao":{"is":{"ativo":true}}');
    expect(JSON.stringify(where)).toContain('"unidade":{"is":null}');
    expect(JSON.stringify(where)).toContain('filha-ativa');
  });
  it("filtra relações aninhadas e contagens sem perder seleção ou ordenação", () => {
    const result = restringirConsultaOrganizacional("Jornada", { include: { servidores: { orderBy: { criadoEm: "desc" }, include: { servidor: { select: { id: true } } } }, _count: { select: { servidores: true } } } }, contexto);
    const includes = result.include as Record<string, Record<string, unknown>>;
    expect(includes.servidores.orderBy).toEqual({ criadoEm: "desc" });
    expect(JSON.stringify(includes.servidores.where)).toContain('"orgao"');
    expect(JSON.stringify(includes._count)).toContain('"where"');
    expect(JSON.stringify(includes)).not.toContain('"id":true,"where"');
  });
  it("mantém dados globais sem organização e aplica a mesma restrição a usuários vinculados", () => {
    expect(whereOrganizacaoVisivel("FusoHorario", contexto)).toEqual({});
    const result = whereOrganizacaoVisivel("Usuario", contexto);
    expect(JSON.stringify(result)).toContain('"servidor":{"is":null}');
    expect(JSON.stringify(result)).toContain('"ativo":true');
  });
});
