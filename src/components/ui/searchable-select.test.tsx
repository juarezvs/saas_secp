// @vitest-environment jsdom
import React, { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Select } from "./form-controls";
import { SearchableSelect } from "./searchable-select";
import { Modal } from "./modal";

beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("listas pesquisaveis", () => {
  it("mantem a primeira opcao quando o valor inicial nao pertence a lista", () => {
    const { container } = render(<form><Select name="periodo" value=""><option value="2026">Exercício 2026</option><option value="2025">Exercício 2025</option></Select></form>);
    expect(screen.getByRole("combobox").textContent).toContain("Exercício 2026");
    expect(new FormData(container.querySelector("form")!).get("periodo")).toBe("2026");
  });
  it("busca por texto e acentos e emite o evento nativo apenas ao selecionar", () => {
    const change = vi.fn();
    const formChange = vi.fn();
    const { container } = render(<form onChange={formChange}>
      <label htmlFor="orgao">Órgão</label>
      <Select id="orgao" name="orgaoId" defaultValue="" onChange={change}>
        <option value="">Todos</option>
        <option value="am">Seção Judiciária do Amazonas</option>
        <option value="rr" data-search-text="SJRR Boa Vista">Seção Judiciária de Roraima</option>
      </Select>
    </form>);
    fireEvent.click(screen.getByRole("combobox", { name: "Órgão" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "secao judiciaria de roraima" } });
    expect(screen.queryByRole("option", { name: "Seção Judiciária do Amazonas" })).toBeNull();
    expect(formChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("option", { name: "Seção Judiciária de Roraima" }));
    expect(change).toHaveBeenCalledTimes(1);
    expect(change.mock.calls[0][0].target).toBeInstanceOf(HTMLSelectElement);
    expect(formChange).toHaveBeenCalledTimes(1);
    expect(new FormData(container.querySelector("form")!).get("orgaoId")).toBe("rr");
    fireEvent.click(screen.getByRole("combobox", { name: "Órgão" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "boa vista" } });
    expect(screen.getAllByRole("option")).toHaveLength(1);
  });

  it("acompanha valores controlados e permite limpar para Todos", () => {
    function Filtro() {
      const [value, setValue] = useState("rr");
      return <Select aria-label="Estado" name="estado" value={value} onChange={e => setValue(e.target.value)}>
        <option value="">Todos</option><option value="am">Amazonas</option><option value="rr">Roraima</option>
      </Select>;
    }
    render(<Filtro />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "Todos" }));
    expect(screen.getByRole("combobox").textContent).toContain("Todos");
  });

  it("usa o teclado sem submeter o formulario ao pesquisar", () => {
    const submit = vi.fn(e => e.preventDefault());
    render(<form onSubmit={submit}><Select name="estado"><option value="">Todos</option><option value="rr">Roraima</option></Select></form>);
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "roraima" } });
    fireEvent.keyDown(screen.getByRole("searchbox"), { key: "Enter" });
    expect(screen.getByRole("combobox").textContent).toContain("Roraima");
    expect(submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.keyDown(screen.getByRole("searchbox"), { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("restaura a selecao no reset e omite campos desabilitados do FormData", async () => {
    const { container } = render(<form>
      <Select name="estado" defaultValue="am"><option value="am">Amazonas</option><option value="rr">Roraima</option></Select>
      <Select name="bloqueado" disabled defaultValue="x"><option value="x">Bloqueado</option></Select>
    </form>);
    const trigger = screen.getAllByRole("combobox")[0];
    fireEvent.click(trigger); fireEvent.click(screen.getByRole("option", { name: "Roraima" }));
    container.querySelector("form")!.reset();
    await waitFor(() => expect(trigger.textContent).toContain("Amazonas"));
    expect(new FormData(container.querySelector("form")!).has("bloqueado")).toBe(false);
  });

  it("mantem a validacao required e foca o campo visivel", () => {
    const { container } = render(<form><Select name="estado" required defaultValue=""><option value="">Selecione</option><option value="rr">Roraima</option></Select></form>);
    expect(container.querySelector("form")!.checkValidity()).toBe(false);
    expect(document.activeElement).toBe(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "Roraima" }));
    expect(container.querySelector("form")!.checkValidity()).toBe(true);
  });

  it("preserva grupos, opcoes desabilitadas e opcoes em fragments", () => {
    render(<Select name="estado"><><option value="">Todos</option></>
      <optgroup label="Norte"><option value="am" disabled>Amazonas</option><option value="rr">Roraima</option></optgroup>
    </Select>);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Norte" } });
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect((screen.getByRole("option", { name: /Amazonas/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(screen.getByRole("searchbox"), { key: "Enter" });
    expect(screen.getByRole("combobox").textContent).toContain("Roraima");
  });

  it("permite busca dentro do modal e Escape fecha somente a lista", () => {
    const close = vi.fn();
    render(<Modal open onOpenChange={close} title="Filtros" description="Filtrar registros">
      <Select name="estado"><option value="">Todos</option><option value="rr">Roraima</option></Select>
    </Modal>);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "roraima" } });
    expect(screen.getByRole("option", { name: "Roraima" })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("searchbox"), { key: "Escape" });
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("consulta opcoes remotas e inclui a escolha no formulario", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ options: [{ value: "123", label: "AM123 - Pessoa encontrada" }] }))));
    const { container } = render(<form><SearchableSelect id="servidor" name="servidorId" options={[]} asyncSearchUrl="/api/servidores?q0=1" /></form>);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "AM123" } });
    fireEvent.click(await screen.findByRole("option", { name: "AM123 - Pessoa encontrada" }));
    expect(new FormData(container.querySelector("form")!).get("servidorId")).toBe("123");
    expect(fetch).toHaveBeenCalledWith("/api/servidores?q0=1&q=AM123", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });
});
