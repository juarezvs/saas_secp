import {
  aceitarRecessoSecadAction,
  devolverHomologacaoRecessoAction,
  homologarRecessoAction,
} from "../../application/actions/recesso-forense.actions";
import { nomeServidor } from "@/modules/servidores/application/services/nome-servidor.service";
import { RecessoStatusBadge } from "./recesso-status-badge";

type HomologacaoRecessoPanelProps = {
  homologacoes: Array<{
    id: string;
    mesReferencia: number;
    status: string;
    totalDiasConvocados: number;
    diasPecunia: number;
    diasFolga: number;
    minutosTrabalhados: number;
    servidor: {
      matricula: string;
      nomeFuncional?: string | null;
      usuario: { nome: string };
    };
  }>;
  podeHomologar?: boolean;
  podeAceitarSecad?: boolean;
};

export function HomologacaoRecessoPanel({
  homologacoes,
  podeHomologar = true,
  podeAceitarSecad = true,
}: HomologacaoRecessoPanelProps) {
  const exibirAcoes = podeHomologar || podeAceitarSecad;

  return (
    <section className="rounded-xl border bg-[var(--card)] shadow-sm">
      <div className="border-b p-5">
        <h2 className="text-lg font-bold">Homologacoes do recesso</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Chefia homologa e SECAD aceita antes dos relatorios SEPAG/SECAP.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b bg-[var(--muted)] text-xs uppercase text-[var(--muted-foreground)]">
            <tr>
              <th className="px-5 py-3">Servidor</th>
              <th className="px-5 py-3">Mes</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Dias</th>
              <th className="px-5 py-3">Pecunia</th>
              <th className="px-5 py-3">Folga</th>
              {exibirAcoes && <th className="px-5 py-3">Acoes</th>}
            </tr>
          </thead>
          <tbody>
            {homologacoes.map((homologacao) => (
              <tr key={homologacao.id} className="border-b align-top last:border-b-0">
                <td className="px-5 py-4">
                  <div className="font-semibold">
                    {nomeServidor(homologacao.servidor)}
                  </div>
                  <div className="font-mono text-xs text-[var(--muted-foreground)]">
                    {homologacao.servidor.matricula}
                  </div>
                </td>
                <td className="px-5 py-4">
                  {homologacao.mesReferencia === 12 ? "Dezembro" : "Janeiro"}
                </td>
                <td className="px-5 py-4">
                  <RecessoStatusBadge status={homologacao.status} />
                </td>
                <td className="px-5 py-4">{homologacao.totalDiasConvocados}</td>
                <td className="px-5 py-4">{homologacao.diasPecunia}</td>
                <td className="px-5 py-4">{homologacao.diasFolga}</td>
                {exibirAcoes && (
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-2">
                      {podeHomologar && (
                        <>
                          <form action={homologarRecessoAction} className="flex gap-2">
                            <input type="hidden" name="homologacaoId" value={homologacao.id} />
                            <input type="hidden" name="observacaoChefia" value="" />
                            <button className="rounded-md border px-3 py-1 text-xs font-semibold hover:bg-[var(--muted)]">
                              Homologar
                            </button>
                          </form>
                          <form action={devolverHomologacaoRecessoAction} className="flex gap-2">
                            <input type="hidden" name="homologacaoId" value={homologacao.id} />
                            <input type="hidden" name="observacaoChefia" value="Devolvido para ajuste." />
                            <button className="rounded-md border px-3 py-1 text-xs font-semibold hover:bg-[var(--muted)]">
                              Devolver
                            </button>
                          </form>
                        </>
                      )}
                      {podeAceitarSecad && (
                        <form action={aceitarRecessoSecadAction} className="flex gap-2">
                          <input type="hidden" name="homologacaoId" value={homologacao.id} />
                          <input type="hidden" name="observacaoSecad" value="" />
                          <button className="rounded-md bg-blue-900 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-950">
                            Aceite SECAD
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {homologacoes.length === 0 && (
              <tr>
                <td
                  colSpan={exibirAcoes ? 7 : 6}
                  className="px-5 py-10 text-center text-[var(--muted-foreground)]"
                >
                  Nenhum fechamento de recesso aguardando fluxo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
