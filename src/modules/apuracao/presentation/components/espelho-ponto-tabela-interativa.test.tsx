// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EspelhoPontoTabelaInterativa } from "./espelho-ponto-tabela-interativa";

vi.mock("next/navigation", () => ({
  usePathname: () => "/espelho-ponto",
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(cleanup);

describe("EspelhoPontoTabelaInterativa", () => {
  it("exibe todos os dias da competência sem paginação", async () => {
    const dias = Array.from({ length: 31 }, (_, indice) => indice + 1);

    render(
      <EspelhoPontoTabelaInterativa totalRegistros={dias.length}>
        <table>
          <tbody>
            {dias.map((dia) => (
              <tr key={dia} data-espelho-row data-search={`DIA ${dia}`}>
                <td>Dia {dia}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </EspelhoPontoTabelaInterativa>,
    );

    await waitFor(() => {
      expect(screen.getByText("Dia 31").closest("tr")).not.toHaveAttribute(
        "hidden",
      );
    });
    expect(
      screen.queryByRole("combobox", { name: "Itens por página" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Próxima página" }),
    ).not.toBeInTheDocument();
  });

  it("aplica a pesquisa apenas depois da confirmação e permite removê-la", async () => {
    render(
      <EspelhoPontoTabelaInterativa totalRegistros={2}>
        <table>
          <tbody>
            <tr data-espelho-row data-search="PRIMEIRO REGISTRO">
              <td>Primeiro registro</td>
            </tr>
            <tr data-espelho-row data-search="SEGUNDO REGISTRO">
              <td>Segundo registro</td>
            </tr>
          </tbody>
        </table>
      </EspelhoPontoTabelaInterativa>,
    );

    const primeiro = screen.getByText("Primeiro registro").closest("tr");
    const segundo = screen.getByText("Segundo registro").closest("tr");

    fireEvent.click(screen.getByRole("button", { name: "Filtros" }));
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "primeiro" },
    });

    expect(segundo).not.toHaveAttribute("hidden");

    fireEvent.click(screen.getByRole("button", { name: "Aplicar filtro" }));

    await waitFor(() => {
      expect(primeiro).not.toHaveAttribute("hidden");
      expect(segundo).toHaveAttribute("hidden");
    });

    fireEvent.click(screen.getByRole("button", { name: /Pesquisa:/ }));

    await waitFor(() => {
      expect(primeiro).not.toHaveAttribute("hidden");
      expect(segundo).not.toHaveAttribute("hidden");
    });
  });
});
