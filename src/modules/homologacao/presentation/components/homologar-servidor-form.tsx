import { homologarServidorMesAction } from "../../application/actions/homologar-servidor-mes.action";

export function HomologarServidorForm({
  homologacaoServidorId,
}: {
  homologacaoServidorId: string;
}) {
  return (
    <form action={homologarServidorMesAction} className="space-y-3">
      <input
        type="hidden"
        name="homologacaoServidorId"
        value={homologacaoServidorId}
      />

      <select
        name="status"
        defaultValue="HOMOLOGADO"
        className="h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm"
      >
        <option value="HOMOLOGADO">Homologar</option>
        <option value="HOMOLOGADO_COM_RESSALVA">Homologar com ressalva</option>
        <option value="DEVOLVIDO">Devolver para correção</option>
      </select>

      <textarea
        name="observacaoChefia"
        rows={3}
        placeholder="Observação da chefia, quando necessário."
        className="w-full rounded-md border bg-[var(--card)] px-3 py-2 text-sm"
      />

      <button
        type="submit"
        className="w-full rounded-md bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-950"
      >
        Registrar decisão
      </button>
    </form>
  );
}
