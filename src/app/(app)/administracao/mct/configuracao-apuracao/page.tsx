import { Settings2 } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { PageHeader } from "@/components/layout/page-header";
import { exigirUmaDasPermissoesOuRedirecionar, possuiAlgumaPermissaoNaLista } from "@/modules/auth/application/services/permissao.service";
import { ConfiguracaoApuracaoAssistente } from "@/modules/mct/presentation/components/configuracao-apuracao-assistente";
import { MODELOS_CONFIGURACAO_APURACAO } from "@/modules/mct/domain/modelos-configuracao-apuracao";
import { prisma } from "@/shared/infrastructure/database/prisma";

const CONSULTAR = ["mct-configuracao:consultar:seccional", "mct-configuracao:consultar:global", "mct-configuracao:gerenciar:seccional", "mct-configuracao:gerenciar:global"];
const GERENCIAR = ["mct-configuracao:gerenciar:seccional", "mct-configuracao:gerenciar:global"];

function dataCurta(data: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(data);
}

export default async function ConfiguracaoApuracaoPage() {
  const acesso = await exigirUmaDasPermissoesOuRedirecionar(CONSULTAR);
  const escopo = acesso.perfilAtivoEscopoGlobal ? {} : { orgaoId: { in: acesso.orgaoIds?.length ? acesso.orgaoIds : ["00000000-0000-0000-0000-000000000000"] } };
  const [jornadas, politicas, configuracoes] = await Promise.all([
    prisma.jornada.findMany({ where: { ativo: true, ...escopo }, select: { id: true, codigo: true, nome: true, tipo: true, cargaDiariaMinutos: true, escalas: { where: { ativo: true }, select: { id: true, nome: true } } }, orderBy: { nome: "asc" } }),
    prisma.mctPoliticaVersao.findMany({ where: { estado: "PUBLICADA", ...escopo }, select: { id: true, nome: true, versao: true, orgaoId: true }, orderBy: [{ nome: "asc" }, { versao: "desc" }] }),
    prisma.mctConfiguracaoApuracao.findMany({ where: escopo, include: { jornada: true, escala: true, politica: true }, orderBy: { criadoEm: "desc" } }),
  ]);
  return <div className="space-y-3">
    <Breadcrumb items={[{ label: "Administração" }, { label: "MCT" }, { label: "Configuração da Apuração" }]} />
    <PageHeader icon={Settings2} titulo="Configuração da Apuração" descricao="Associe jornadas existentes às políticas do MCT, valide e ative com segurança." />
    <ConfiguracaoApuracaoAssistente
      jornadas={jornadas.map((item) => ({ ...item, tipo: String(item.tipo) }))}
      politicas={politicas}
      modelos={MODELOS_CONFIGURACAO_APURACAO}
      podeGerenciar={possuiAlgumaPermissaoNaLista(acesso.permissoes, GERENCIAR)}
      configuracoes={configuracoes.map((item) => ({
        id: item.id,
        jornada: item.jornada.nome,
        escala: item.escala?.nome ?? null,
        modelo: MODELOS_CONFIGURACAO_APURACAO.find((modelo) => modelo.codigo === item.modeloCodigo)?.nome ?? item.modeloCodigo,
        politica: item.politica ? `${item.politica.nome} v${item.politica.versao}` : null,
        status: item.status,
        vigencia: `${dataCurta(item.vigenciaInicio)} a ${item.vigenciaFim ? dataCurta(item.vigenciaFim) : "sem término"}`,
      }))}
    />
  </div>;
}
