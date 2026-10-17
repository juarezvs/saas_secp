import { CalendarRange } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar } from "@/modules/auth/application/services/permissao.service";
import {
  alternarTipoFeriadoSuspensaoAction,
  salvarTipoFeriadoSuspensaoAction,
} from "@/modules/calendario-institucional/application/actions/tipo-feriado-suspensao.actions";
import { prismaListagem } from "@/shared/infrastructure/database/prisma-listagem";

const permissoesConsulta = [
  "tipoferiado:consultar:seccional",
  "tipoferiado:cadastrar:seccional",
  "tipoferiado:cadastrar:master",
  "configuracoes:gerenciar:seccional",
  "configuracoes:gerenciar:global",
];

export default async function TiposFeriadosSuspensoesPage() {
  const acesso = await exigirUmaDasPermissoesOuRedirecionar(permissoesConsulta);
  const podeCadastrar = acesso.permissoes.some((item) =>
    item.startsWith("tipoferiado:cadastrar:") ||
    item.startsWith("configuracoes:gerenciar:"),
  );
  const tipos = await prismaListagem.tipoFeriadoSuspensao.findMany({
    orderBy: { nome: "asc" },
  });

  return (
    <div className="space-y-5">
      <Breadcrumb
        items={[
          { label: "Cadastros Auxiliares" },
          { label: "Tipos de Feriados/Suspensões" },
        ]}
      />
      <PageHeader
        icon={CalendarRange}
        titulo="Tipos de Feriados/Suspensões"
        descricao="Tipos disponíveis no calendário institucional."
      />

      {podeCadastrar ? (
        <form
          action={salvarTipoFeriadoSuspensaoAction}
          className="grid gap-3 border-y py-4 md:grid-cols-[15rem_18rem_minmax(0,1fr)_auto]"
        >
          <select name="codigo" required className="h-10 rounded-md border px-3 text-sm">
            <option value="FERIADO">Feriado</option>
            <option value="PONTO_FACULTATIVO">Ponto facultativo</option>
            <option value="SUSPENSAO_EXPEDIENTE">Suspensão do expediente</option>
            <option value="TELETRABALHO_INTEGRAL_EXTRAORDINARIO">
              Teletrabalho integral extraordinário
            </option>
          </select>
          <input name="nome" required placeholder="Nome" className="h-10 rounded-md border px-3 text-sm" />
          <input name="descricao" placeholder="Descrição" className="h-10 rounded-md border px-3 text-sm" />
          <button className="h-10 rounded-md bg-blue-900 px-4 text-sm font-semibold text-white">
            Salvar
          </button>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-md border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted">
            <tr><th className="p-3">Nome</th><th className="p-3">Código</th><th className="p-3">Origem</th><th className="p-3">Status</th><th className="p-3">Ações</th></tr>
          </thead>
          <tbody>
            {tipos.map((tipo) => (
              <tr key={tipo.id} className="border-t">
                <td className="p-3 font-semibold">{tipo.nome}</td>
                <td className="p-3 font-mono text-xs">{tipo.codigo}</td>
                <td className="p-3">{tipo.origem}</td>
                <td className="p-3">{tipo.ativo ? "Ativo" : "Inativo"}</td>
                <td className="p-3">
                  {podeCadastrar && tipo.origem !== "SARH" ? (
                    <form action={alternarTipoFeriadoSuspensaoAction}>
                      <input type="hidden" name="id" value={tipo.id} />
                      <button className="text-sm font-semibold text-blue-800">
                        {tipo.ativo ? "Desativar" : "Ativar"}
                      </button>
                    </form>
                  ) : (
                    <span className="text-muted-foreground">Somente leitura</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
