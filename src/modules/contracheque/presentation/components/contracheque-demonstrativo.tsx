import { Badge, Card } from "@/components/ui";
import type {
  ContrachequeDados,
  ContrachequeRubrica,
} from "../../domain/contracheque.types";
import {
  formatarDataContracheque,
  formatarDataDocumentoContracheque,
  formatarDataHoraContracheque,
  formatarMoedaContracheque,
  rotuloCompetenciaContracheque,
} from "../../application/services/formatar-contracheque.service";

type ContrachequeDemonstrativoProps = {
  contracheque: ContrachequeDados;
};

function Campo({ label, valor }: { label: string; valor?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-xs font-semibold text-foreground">
        {valor || "-"}
      </dd>
    </div>
  );
}

function rubricaEhTotalizador(rubrica: ContrachequeRubrica) {
  return rubrica.tipo === "E";
}

function classeTipo(tipo: string) {
  if (tipo === "R") return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (tipo === "D") return "bg-rose-50 text-rose-800 ring-rose-200";

  return "bg-slate-50 text-slate-700 ring-slate-200";
}

export function ContrachequeDemonstrativo({
  contracheque,
}: ContrachequeDemonstrativoProps) {
  const rubricas = contracheque.rubricas.filter(
    (rubrica) => !rubricaEhTotalizador(rubrica),
  );
  const dataImpressao = formatarDataHoraContracheque(contracheque.consultadoEm);

  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-slate-50 px-4 py-3 dark:bg-slate-950/40">
        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Poder Judiciário - Tribunal Regional Federal da 1ª Região
            </p>
            <h2 className="mt-0.5 text-xl font-black tracking-tight">
              Demonstrativo de Pagamento
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
              Pagamento referente a{" "}
              {rotuloCompetenciaContracheque(contracheque.competencia)} -{" "}
              {formatarDataDocumentoContracheque(
                contracheque.documento.chaveFolha,
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <Badge variant="aguardando">Não tem valor legal</Badge>
            <Badge variant="regular">Consulta direta no SARH</Badge>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <dl className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Campo
            label="Servidor"
            valor={`${contracheque.cabecalho.nome} (${contracheque.cabecalho.codiserv})`}
          />
          <Campo label="CPF" valor={contracheque.cabecalho.cpf} />
          <Campo label="Cargo" valor={contracheque.cabecalho.cargo} />
          <Campo label="Função" valor={contracheque.cabecalho.funcao} />
          <Campo label="Lotação" valor={contracheque.cabecalho.lotacao} />
          <Campo label="Exercício" valor={formatarDataContracheque(contracheque.cabecalho.exercicio)} />
          <Campo label="Referência" valor={contracheque.cabecalho.referencia} />
          <Campo
            label="Dependentes"
            valor={`SF: ${
              contracheque.cabecalho.dependentesSalarioFamilia ?? 0
            } / IR: ${contracheque.cabecalho.dependentesIr ?? 0}`}
          />
        </dl>

        <div className="grid gap-3 rounded-md border bg-muted/30 p-3 md:grid-cols-4">
          <Campo
            label="Documento"
            valor={contracheque.documento.descricao}
          />
          <Campo
            label="Margem consignável"
            valor={
              contracheque.margemConsignavel === null
                ? "-"
                : formatarMoedaContracheque(contracheque.margemConsignavel)
            }
          />
          <Campo
            label="Banco"
            valor={
              contracheque.cabecalho.banco
                ? String(contracheque.cabecalho.banco)
                : "-"
            }
          />
          <Campo
            label="Agencia / Conta"
            valor={`${contracheque.cabecalho.agencia ?? "-"} / ${
              contracheque.cabecalho.conta ?? "-"
            }`}
          />
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-muted-foreground dark:bg-slate-950/50">
              <tr>
                <th className="px-3 py-2">Rubrica</th>
                <th className="px-3 py-2">Descrição</th>
                <th className="px-3 py-2 text-center">Sequência</th>
                <th className="px-3 py-2 text-center">Tipo</th>
                <th className="px-3 py-2 text-center">Prazo</th>
                <th className="px-3 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rubricas.map((rubrica) => (
                <tr key={`${rubrica.codigo}-${rubrica.tipo}-${rubrica.sequencial}`}>
                  <td className="whitespace-nowrap px-3 py-2 font-semibold">
                    {rubrica.codigo}
                  </td>
                  <td className="min-w-64 px-3 py-2">{rubrica.descricao}</td>
                  <td className="px-3 py-2 text-center">{rubrica.sequencial}</td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`inline-flex min-w-8 justify-center rounded-full px-2 py-1 text-xs font-bold ring-1 ${classeTipo(
                        rubrica.tipo,
                      )}`}
                    >
                      {rubrica.tipo || "-"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {rubrica.prazo ?? "-"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-semibold">
                    {formatarMoedaContracheque(rubrica.valor)}
                  </td>
                </tr>
              ))}
              {rubricas.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Nenhuma rubrica encontrada para a competência.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs font-bold uppercase text-muted-foreground">
              Bruto
            </p>
            <p className="mt-1 text-lg font-black">
              {formatarMoedaContracheque(contracheque.totais.bruto)}
            </p>
          </div>
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs font-bold uppercase text-muted-foreground">
              Descontos
            </p>
            <p className="mt-1 text-lg font-black">
              {formatarMoedaContracheque(contracheque.totais.descontos)}
            </p>
          </div>
          <div className="rounded-md border bg-muted/20 p-3">
            <p className="text-xs font-bold uppercase text-muted-foreground">
              Líquido
            </p>
            <p className="mt-1 text-lg font-black">
              {formatarMoedaContracheque(contracheque.totais.liquido)}
            </p>
          </div>
        </div>

        <p className="text-xs leading-5 text-muted-foreground">
          Dados obtidos diretamente do SARH em {dataImpressao}. O SECP não
          armazena informações do contracheque.
        </p>
      </div>
    </Card>
  );
}
