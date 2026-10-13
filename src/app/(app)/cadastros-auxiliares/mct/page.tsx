import Link from "next/link";
import { Braces, Check, Power } from "lucide-react";

import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { SwitchField } from "@/components/ui/switch";
import type {
  MctPoliticaVersao,
  MctRubricaVersao,
  Prisma,
} from "@/generated/prisma/client";
import { obterEscopoOrgaoDaSessao } from "@/modules/auth/application/services/escopo-orgao.service";
import {
  alterarEstadoCadastroMctAction,
  criarNaturezaRubricaMctAction,
  criarVersaoPoliticaMctAction,
  criarVersaoRegraMctAction,
  criarVersaoRubricaMctAction,
  exigirConsultaCadastrosMct,
} from "@/modules/mct/application/actions/cadastros-mct.actions";
import { prisma } from "@/shared/infrastructure/database/prisma";

type Aba = "rubricas" | "naturezas" | "politicas" | "regras";
type RegraComRelacionamentos = Prisma.MctRegraVersaoGetPayload<{
  include: {
    politica: { select: { codigo: true; versao: true } };
    efeitos: { include: { rubrica: { select: { codigo: true } } } };
  };
}>;
const campos =
  "h-10 w-full border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-[var(--primary)]";

export default async function CadastrosMctPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; orgaoId?: string }>;
}) {
  const [acesso, escopo, params] = await Promise.all([
    exigirConsultaCadastrosMct(),
    obterEscopoOrgaoDaSessao(),
    searchParams,
  ]);
  const aba: Aba = ["naturezas", "politicas", "regras"].includes(
    params.aba ?? "",
  )
    ? (params.aba as Aba)
    : "rubricas";
  const orgaos = escopo.global
    ? await prisma.orgao.findMany({
        where: { ativo: true },
        select: { id: true, sigla: true, nome: true },
        orderBy: { sigla: "asc" },
      })
    : escopo.orgaos;
  const orgaoId = orgaos.some((item) => item.id === params.orgaoId)
    ? params.orgaoId!
    : orgaos[0]?.id;
  const podeGerenciar = acesso.permissoes.some(
    (item) => item.startsWith("mct-") && item.includes(":gerenciar:"),
  );
  const [rubricas, naturezas, politicas, regras] = orgaoId
    ? await Promise.all([
        prisma.mctRubricaVersao.findMany({
          where: { OR: [{ orgaoId }, { orgaoId: null }] },
          orderBy: [{ codigo: "asc" }, { versao: "desc" }],
        }),
        prisma.mctNaturezaRubrica.findMany({
          where: { orgaoId },
          orderBy: [{ ativo: "desc" }, { nome: "asc" }],
        }),
        prisma.mctPoliticaVersao.findMany({
          where: { orgaoId },
          orderBy: [{ codigo: "asc" }, { versao: "desc" }],
        }),
        prisma.mctRegraVersao.findMany({
          where: { orgaoId },
          include: {
            politica: { select: { codigo: true, versao: true } },
            efeitos: { include: { rubrica: { select: { codigo: true } } } },
          },
          orderBy: [
            { prioridade: "asc" },
            { codigo: "asc" },
            { versao: "desc" },
          ],
        }),
      ])
    : [[], [], [], []];

  return (
    <div className="space-y-3">
      <PageHeader
        icon={Braces}
        titulo="Cadastros do MCT"
        descricao="Rubricas, políticas e regras versionadas do Motor de Classificação Temporal."
        contexto={
          <Breadcrumb
            embedded
            items={[{ label: "Cadastros Auxiliares" }, { label: "MCT" }]}
          />
        }
        variant="blade"
      />

      <section className="border border-[var(--border)] bg-[var(--card)]">
        <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1">
          {(["rubricas", "naturezas", "politicas", "regras"] as Aba[]).map(
            (item) => (
              <Link
                key={item}
                href={`${item === "rubricas" ? "?" : `?aba=${item}&`}${orgaoId ? `orgaoId=${orgaoId}` : ""}`}
                className={`px-3 py-2 text-sm font-medium ${aba === item ? "border-b-2 border-[var(--primary)] text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`}
              >
                {item[0].toUpperCase() + item.slice(1)}
              </Link>
            ),
          )}
          {escopo.global && orgaos.length > 1 ? (
            <form className="ml-auto flex items-center gap-2">
              <input type="hidden" name="aba" value={aba} />
              <select
                name="orgaoId"
                defaultValue={orgaoId}
                className={`${campos} w-72`}
                aria-label="Órgão"
                onChange={undefined}
              >
                {orgaos.map((orgao) => (
                  <option key={orgao.id} value={orgao.id}>
                    {orgao.sigla} - {orgao.nome}
                  </option>
                ))}
              </select>
              <button className="h-10 border px-3 text-sm">Selecionar</button>
            </form>
          ) : null}
        </div>

        {podeGerenciar && orgaoId ? (
          <div className="border-b p-4">
            {aba === "rubricas" ? (
              <FormRubrica orgaoId={orgaoId} naturezas={naturezas} />
            ) : null}
            {aba === "naturezas" ? <FormNatureza orgaoId={orgaoId} /> : null}
            {aba === "politicas" ? <FormPolitica orgaoId={orgaoId} /> : null}
            {aba === "regras" ? (
              <FormRegra
                orgaoId={orgaoId}
                politicas={politicas}
                rubricas={rubricas}
              />
            ) : null}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          {aba === "rubricas" ? (
            <TabelaRubricas itens={rubricas} podeGerenciar={podeGerenciar} />
          ) : null}
          {aba === "naturezas" ? <TabelaNaturezas itens={naturezas} /> : null}
          {aba === "politicas" ? (
            <TabelaPoliticas itens={politicas} podeGerenciar={podeGerenciar} />
          ) : null}
          {aba === "regras" ? (
            <TabelaRegras itens={regras} podeGerenciar={podeGerenciar} />
          ) : null}
        </div>
      </section>
    </div>
  );
}

function FormNatureza({ orgaoId }: { orgaoId: string }) {
  return (
    <form
      action={criarNaturezaRubricaMctAction}
      className="grid gap-3 lg:grid-cols-4"
    >
      <input type="hidden" name="orgaoId" value={orgaoId} />
      <Campo label="Código" descricao="Identificador estável, sem espaços">
        <input
          className={campos}
          name="codigo"
          placeholder="TRABALHO"
          required
        />
      </Campo>
      <Campo label="Nome" descricao="Nome apresentado na seleção">
        <input className={campos} name="nome" required />
      </Campo>
      <Campo
        label="Descrição"
        descricao="Finalidade desta natureza"
        className="lg:col-span-2"
      >
        <input className={campos} name="descricao" />
      </Campo>
      <button className="h-10 justify-self-start bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)]">
        Salvar natureza
      </button>
    </form>
  );
}

function FormRubrica({
  orgaoId,
  naturezas,
}: {
  orgaoId: string;
  naturezas: Array<{
    id: string;
    codigo: string;
    nome: string;
    ativo: boolean;
  }>;
}) {
  return (
    <form
      action={criarVersaoRubricaMctAction}
      className="grid gap-3 lg:grid-cols-4"
    >
      <input type="hidden" name="orgaoId" value={orgaoId} />
      <Campo label="Código" descricao="Ex.: DST-BANCO-CREDITO">
        <input className={campos} name="codigo" required />
      </Campo>
      <Campo label="Nome" descricao="Nome funcional da rubrica">
        <input className={campos} name="nome" required />
      </Campo>
      <Campo label="Dimensão" descricao="Papel da rubrica na classificação">
        <select className={campos} name="dimensao">
          <option value="TEMPORAL">Temporal</option>
          <option value="JURIDICA_ADMINISTRATIVA">
            Jurídica/administrativa
          </option>
          <option value="DESTINACAO">Destinação</option>
          <option value="INCIDENCIA">Incidência</option>
        </select>
      </Campo>
      <Campo label="Natureza" descricao="Categoria institucional">
        <select className={campos} name="natureza" required defaultValue="">
          <option value="" disabled>
            Selecione
          </option>
          {naturezas
            .filter((item) => item.ativo)
            .map((item) => (
              <option key={item.id} value={item.codigo}>
                {item.nome}
              </option>
            ))}
        </select>
      </Campo>
      <Campo label="Unidade" descricao="Unidade da quantidade">
        <select className={campos} name="unidade">
          <option value="MINUTO">Minuto</option>
          <option value="QUANTIDADE">Quantidade</option>
          <option value="BOOLEANO">Booleano</option>
        </select>
      </Campo>
      <Campo
        label="Efeito no banco"
        descricao="Não cria movimento enquanto estiver em SHADOW"
      >
        <select className={campos} name="efeitoBancoHoras">
          <option value="NENHUM">Nenhum</option>
          <option value="CREDITO">Crédito</option>
          <option value="DEBITO">Débito</option>
          <option value="COMPENSACAO">Compensação</option>
        </select>
      </Campo>
      <Campo label="Prioridade" descricao="Maior precedência usa menor número">
        <input
          className={campos}
          name="prioridade"
          type="number"
          defaultValue={100}
        />
      </Campo>
      <Campo label="Vigência inicial" descricao="Início da validade">
        <input className={campos} name="vigenciaInicio" type="date" required />
      </Campo>
      <Campo
        label="Descrição"
        descricao="Explique quando a rubrica deve ser usada"
        className="lg:col-span-2"
      >
        <input className={campos} name="descricao" required />
      </Campo>
      <Campo
        label="Fundamento normativo"
        descricao="Ato ou norma que sustenta a classificação"
        className="lg:col-span-2"
      >
        <input className={campos} name="fundamentoNormativo" />
      </Campo>
      <SwitchLinha name="exigeAutorizacao" label="Exige autorização" />
      <SwitchLinha name="exigeHomologacao" label="Exige homologação" />
      <div className="flex items-end lg:col-span-2">
        <button className="h-10 bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)]">
          Criar versão em rascunho
        </button>
      </div>
    </form>
  );
}

function FormPolitica({ orgaoId }: { orgaoId: string }) {
  return (
    <form
      action={criarVersaoPoliticaMctAction}
      className="grid gap-3 lg:grid-cols-4"
    >
      <input type="hidden" name="orgaoId" value={orgaoId} />
      <Campo label="Código" descricao="Identificador estável">
        <input className={campos} name="codigo" required />
      </Campo>
      <Campo label="Nome" descricao="Nome da política">
        <input className={campos} name="nome" required />
      </Campo>
      <Campo label="Vigência inicial" descricao="Início da validade">
        <input className={campos} name="vigenciaInicio" type="date" required />
      </Campo>
      <Campo label="Carga exigível" descricao="Minutos exigíveis no dia">
        <input
          className={campos}
          name="cargaExigivelMinutos"
          type="number"
          required
        />
      </Campo>
      <Campo label="Intervalo mínimo" descricao="Em minutos">
        <input
          className={campos}
          name="intervaloMinimoMinutos"
          type="number"
          defaultValue={0}
        />
      </Campo>
      <Campo label="Intervalo máximo" descricao="Em minutos">
        <input
          className={campos}
          name="intervaloMaximoMinutos"
          type="number"
          defaultValue={0}
        />
      </Campo>
      <Campo label="Flexibilidade de entrada" descricao="Em minutos">
        <input
          className={campos}
          name="flexibilidadeEntradaMinutos"
          type="number"
          defaultValue={0}
        />
      </Campo>
      <Campo label="Flexibilidade de saída" descricao="Em minutos">
        <input
          className={campos}
          name="flexibilidadeSaidaMinutos"
          type="number"
          defaultValue={0}
        />
      </Campo>
      <Campo
        label="Descrição"
        descricao="Finalidade da política"
        className="lg:col-span-2"
      >
        <input className={campos} name="descricao" />
      </Campo>
      <Campo
        label="Fundamento normativo"
        descricao="Ato ou norma aplicável"
        className="lg:col-span-2"
      >
        <input className={campos} name="fundamentoNormativo" />
      </Campo>
      <SwitchLinha
        name="permiteCompensacaoNoDia"
        label="Permitir compensação no dia"
      />
      <div className="flex items-end lg:col-span-3">
        <button className="h-10 bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)]">
          Criar versão em rascunho
        </button>
      </div>
    </form>
  );
}

function FormRegra({
  orgaoId,
  politicas,
  rubricas,
}: {
  orgaoId: string;
  politicas: Array<{ id: string; codigo: string; versao: number }>;
  rubricas: Array<{ id: string; codigo: string; versao: number }>;
}) {
  return (
    <form
      action={criarVersaoRegraMctAction}
      className="grid gap-3 lg:grid-cols-4"
    >
      <input type="hidden" name="orgaoId" value={orgaoId} />
      <Campo label="Código" descricao="Identificador estável">
        <input className={campos} name="codigo" required />
      </Campo>
      <Campo label="Nome" descricao="Nome da regra">
        <input className={campos} name="nome" required />
      </Campo>
      <Campo label="Política" descricao="Política à qual pertence">
        <select className={campos} name="politicaVersaoId" required>
          {politicas.map((item) => (
            <option key={item.id} value={item.id}>
              {item.codigo} v{item.versao}
            </option>
          ))}
        </select>
      </Campo>
      <Campo label="Prioridade" descricao="Ordem de avaliação">
        <input
          className={campos}
          name="prioridade"
          type="number"
          defaultValue={100}
        />
      </Campo>
      <Campo label="Campo da condição" descricao="Ex.: excedenteBrutoMinutos">
        <input className={campos} name="campo" required />
      </Campo>
      <Campo label="Operador" descricao="Comparação declarativa">
        <select className={campos} name="operador">
          <option>GT</option>
          <option>GTE</option>
          <option>EQ</option>
          <option>NE</option>
          <option>LT</option>
          <option>LTE</option>
        </select>
      </Campo>
      <Campo label="Valor" descricao="Valor para comparação">
        <input className={campos} name="valor" required />
      </Campo>
      <Campo
        label="Rubrica resultante"
        descricao="Efeito quando a condição for satisfeita"
      >
        <select className={campos} name="rubricaVersaoId" required>
          {rubricas.map((item) => (
            <option key={item.id} value={item.id}>
              {item.codigo} v{item.versao}
            </option>
          ))}
        </select>
      </Campo>
      <Campo label="Escopo temporal" descricao="Ex.: DIA ou SEGMENTO">
        <input
          className={campos}
          name="escopoTemporal"
          defaultValue="DIA"
          required
        />
      </Campo>
      <Campo label="Estratégia" descricao="Origem da quantidade">
        <select className={campos} name="estrategia">
          <option value="CAMPO">Campo do contexto</option>
          <option value="CONSTANTE">Valor constante</option>
        </select>
      </Campo>
      <Campo label="Quantidade/campo" descricao="Ex.: excedenteBrutoMinutos">
        <input className={campos} name="quantidade" required />
      </Campo>
      <Campo label="Vigência inicial" descricao="Início da validade">
        <input className={campos} name="vigenciaInicio" type="date" required />
      </Campo>
      <Campo
        label="Fundamento normativo"
        descricao="Ato ou norma aplicável"
        className="lg:col-span-3"
      >
        <input className={campos} name="fundamentoNormativo" />
      </Campo>
      <div className="flex items-end">
        <button
          disabled={!politicas.length || !rubricas.length}
          className="h-10 bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-50"
        >
          Criar versão em rascunho
        </button>
      </div>
    </form>
  );
}

function Campo({
  label,
  descricao,
  className = "",
  children,
}: {
  label: string;
  descricao: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      <span className="mt-1 block text-xs text-[var(--muted-foreground)]">
        {descricao}
      </span>
    </label>
  );
}
function SwitchLinha({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex items-center gap-3 py-2 text-sm">
      <SwitchField name={name} />
      <span>{label}</span>
    </label>
  );
}
function AcaoEstado({
  tipo,
  item,
  podeGerenciar,
}: {
  tipo: "rubrica" | "politica" | "regra";
  item: { id: string; orgaoId: string | null; estado: string };
  podeGerenciar: boolean;
}) {
  if (!podeGerenciar || !item.orgaoId) return null;
  const estado = item.estado === "RASCUNHO" ? "PUBLICADA" : "INATIVA";
  return (
    <form action={alterarEstadoCadastroMctAction}>
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="id" value={item.id} />
      <input type="hidden" name="orgaoId" value={item.orgaoId} />
      <input type="hidden" name="estado" value={estado} />
      <button
        title={estado === "PUBLICADA" ? "Publicar" : "Inativar"}
        className="inline-flex size-8 items-center justify-center hover:bg-[var(--muted)]"
      >
        {estado === "PUBLICADA" ? (
          <Check className="size-4" />
        ) : (
          <Power className="size-4" />
        )}
      </button>
    </form>
  );
}
function Cabecalho({ extra }: { extra: string[] }) {
  return (
    <thead className="bg-[var(--muted)] text-xs">
      <tr>
        {["Código/versão", "Nome", ...extra, "Estado", "Origem", "Ações"].map(
          (item) => (
            <th key={item} className="px-3 py-2 text-left">
              {item}
            </th>
          ),
        )}
      </tr>
    </thead>
  );
}
function TabelaRubricas({
  itens,
  podeGerenciar,
}: {
  itens: MctRubricaVersao[];
  podeGerenciar: boolean;
}) {
  return (
    <table className="w-full text-sm">
      <Cabecalho extra={["Dimensão", "Natureza", "Unidade"]} />
      <tbody className="divide-y">
        {itens.map((x) => (
          <tr key={x.id}>
            <td className="px-3 py-2 font-mono text-xs">
              {x.codigo} v{x.versao}
            </td>
            <td className="px-3 py-2">{x.nome}</td>
            <td className="px-3 py-2">{x.dimensao}</td>
            <td className="px-3 py-2">{x.natureza}</td>
            <td className="px-3 py-2">{x.unidade}</td>
            <td className="px-3 py-2">{x.estado}</td>
            <td className="px-3 py-2">{x.origem}</td>
            <td className="px-3 py-2">
              <AcaoEstado
                tipo="rubrica"
                item={x}
                podeGerenciar={podeGerenciar}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TabelaNaturezas({
  itens,
}: {
  itens: Array<{
    id: string;
    codigo: string;
    nome: string;
    descricao: string | null;
    ativo: boolean;
    origem: string;
  }>;
}) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-[var(--muted)] text-xs">
        <tr>
          {["Código", "Nome", "Descrição", "Origem", "Status"].map((item) => (
            <th key={item} className="px-3 py-2 text-left">
              {item}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {itens.map((item) => (
          <tr key={item.id} className="border-b border-[var(--border)]">
            <td className="px-3 py-2 font-mono">{item.codigo}</td>
            <td className="px-3 py-2 font-medium">{item.nome}</td>
            <td className="px-3 py-2">{item.descricao ?? "-"}</td>
            <td className="px-3 py-2">{item.origem}</td>
            <td className="px-3 py-2">{item.ativo ? "Ativa" : "Inativa"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function TabelaPoliticas({
  itens,
  podeGerenciar,
}: {
  itens: MctPoliticaVersao[];
  podeGerenciar: boolean;
}) {
  return (
    <table className="w-full text-sm">
      <Cabecalho extra={["Vigência", "Configuração"]} />
      <tbody className="divide-y">
        {itens.map((x) => (
          <tr key={x.id}>
            <td className="px-3 py-2 font-mono text-xs">
              {x.codigo} v{x.versao}
            </td>
            <td className="px-3 py-2">{x.nome}</td>
            <td className="px-3 py-2">
              {new Date(x.vigenciaInicio).toLocaleDateString("pt-BR", {
                timeZone: "UTC",
              })}
            </td>
            <td className="px-3 py-2 font-mono text-xs">
              {JSON.stringify(x.configuracao)}
            </td>
            <td className="px-3 py-2">{x.estado}</td>
            <td className="px-3 py-2">{x.origem}</td>
            <td className="px-3 py-2">
              <AcaoEstado
                tipo="politica"
                item={x}
                podeGerenciar={podeGerenciar}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function TabelaRegras({
  itens,
  podeGerenciar,
}: {
  itens: RegraComRelacionamentos[];
  podeGerenciar: boolean;
}) {
  return (
    <table className="w-full text-sm">
      <Cabecalho extra={["Política", "Prioridade", "Efeitos"]} />
      <tbody className="divide-y">
        {itens.map((x) => (
          <tr key={x.id}>
            <td className="px-3 py-2 font-mono text-xs">
              {x.codigo} v{x.versao}
            </td>
            <td className="px-3 py-2">{x.nome}</td>
            <td className="px-3 py-2">
              {x.politica.codigo} v{x.politica.versao}
            </td>
            <td className="px-3 py-2">{x.prioridade}</td>
            <td className="px-3 py-2">
              {x.efeitos.map((e) => e.rubrica.codigo).join(", ")}
            </td>
            <td className="px-3 py-2">{x.estado}</td>
            <td className="px-3 py-2">{x.origem}</td>
            <td className="px-3 py-2">
              <AcaoEstado tipo="regra" item={x} podeGerenciar={podeGerenciar} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
