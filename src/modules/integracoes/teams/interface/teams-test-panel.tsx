"use client";

import { useState } from "react";
import { Download, Send, Wifi } from "lucide-react";

export function TeamsTestPanel() {
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [carregando, setCarregando] = useState<string | null>(null);

  async function executarTeste(endpoint: string, nome: string) {
    setCarregando(nome);
    setMensagem(null);

    try {
      const response = await fetch(endpoint, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      setMensagem(
        body.mensagem ?? body.erro ?? body.motivo ?? "Teste executado.",
      );
    } catch {
      setMensagem("Falha ao executar o teste.");
    } finally {
      setCarregando(null);
    }
  }

  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-bold">Testes e manifesto</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() =>
            executarTeste("/api/integracoes/teams/testar-conexao", "conexao")
          }
          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-[var(--muted)]"
        >
          <Wifi className="size-4" />
          {carregando === "conexao" ? "Testando..." : "Testar conexão"}
        </button>
        <button
          type="button"
          onClick={() =>
            executarTeste("/api/integracoes/teams/testar-mensagem", "mensagem")
          }
          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold hover:bg-[var(--muted)]"
        >
          <Send className="size-4" />
          {carregando === "mensagem" ? "Enviando..." : "Testar mensagem"}
        </button>
        <a
          href="/api/integracoes/teams/manifest.zip"
          className="inline-flex items-center gap-2 rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950"
        >
          <Download className="size-4" />
          Baixar manifest.zip
        </a>
      </div>
      {mensagem && (
        <p className="mt-3 rounded-md border bg-[var(--muted)] p-3 text-sm">
          {mensagem}
        </p>
      )}
    </section>
  );
}
