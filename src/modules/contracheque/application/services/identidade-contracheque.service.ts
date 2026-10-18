import { prismaListagem } from "@/shared/infrastructure/database/prisma-listagem";

export async function obterIdentidadeContracheque(usuarioId: string) {
  const now = new Date();
  const servidor = await prismaListagem.servidor.findFirst({
    where: { usuarioId, ativo: true, orgao: { ativo: true } },
    select: { matricula: true, orgaoId: true, usuario: { select: { nome: true } },
      lotacoes: { where: { status: "ATIVO", dataInicio: { lte: now }, OR: [{ dataFim: null }, { dataFim: { gte: now } }],
        unidade: { ativo: true, orgao: { ativo: true } } }, orderBy: { dataInicio: "desc" }, take: 1,
        select: { unidade: { select: { nome: true, orgaoId: true } } } } },
  });
  const lotacao = servidor?.lotacoes[0];
  if (!servidor || !lotacao || lotacao.unidade.orgaoId !== servidor.orgaoId) return null;
  return { matricula: servidor.matricula, orgaoId: servidor.orgaoId, nome: servidor.usuario.nome, lotacao: lotacao.unidade.nome };
}
