import { Fingerprint } from "lucide-react";

type EquipamentoItem = {
  id: string;
  codigo: string;
  nome: string;
  fabricante: string | null;
  modelo: string | null;
  ip: string | null;
  localizacao: string | null;
  ativo: boolean;
  ultimoHeartbeatEm: Date | null;
  unidade: {
    sigla: string;
  } | null;
  _count: {
    eventos: number;
  };
};

export function EquipamentosBiometricosTable({
  equipamentos,
}: {
  equipamentos: EquipamentoItem[];
}) {
  return (
    <section className="rounded-xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-sm">
      <div className="flex items-center gap-2 border-b p-5">
        <Fingerprint className="size-5 text-blue-900 dark:text-blue-300" />
        <h2 className="text-lg font-bold">Equipamentos biométricos</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b bg-[var(--muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="px-5 py-3">Código</th>
              <th className="px-5 py-3">Nome</th>
              <th className="px-5 py-3">Unidade</th>
              <th className="px-5 py-3">Modelo</th>
              <th className="px-5 py-3">IP</th>
              <th className="px-5 py-3">Eventos</th>
              <th className="px-5 py-3">Heartbeat</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {equipamentos.map((equipamento) => (
              <tr key={equipamento.id} className="border-b last:border-b-0">
                <td className="px-5 py-4 font-mono text-xs font-semibold">
                  {equipamento.codigo}
                </td>

                <td className="px-5 py-4">
                  <div className="font-semibold">{equipamento.nome}</div>
                  {equipamento.localizacao && (
                    <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {equipamento.localizacao}
                    </div>
                  )}
                </td>

                <td className="px-5 py-4">
                  {equipamento.unidade?.sigla ?? "-"}
                </td>

                <td className="px-5 py-4">
                  {[equipamento.fabricante, equipamento.modelo]
                    .filter(Boolean)
                    .join(" / ") || "-"}
                </td>

                <td className="px-5 py-4 font-mono text-xs">
                  {equipamento.ip ?? "-"}
                </td>

                <td className="px-5 py-4">{equipamento._count.eventos}</td>

                <td className="px-5 py-4">
                  {equipamento.ultimoHeartbeatEm
                    ? new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(equipamento.ultimoHeartbeatEm)
                    : "-"}
                </td>

                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      equipamento.ativo
                        ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {equipamento.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
              </tr>
            ))}

            {equipamentos.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                >
                  Nenhum equipamento biométrico cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
