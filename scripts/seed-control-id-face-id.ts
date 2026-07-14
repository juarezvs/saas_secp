import { prisma } from "@/shared/infrastructure/database/prisma";

const equipamentos = [
  {
    codigo: "CONTROLID-FACEID-BALCAO-SAIDA",
    nome: "IDFace Balcao Saida",
    localizacao: "Balcao Saida",
    ip: "172.29.9.38",
  },
  {
    codigo: "CONTROLID-FACEID-BALCAO-ENTRADA",
    nome: "IDFace Balcao Entrada",
    localizacao: "Balcao Entrada",
    ip: "172.29.9.35",
  },
  {
    codigo: "CONTROLID-FACEID-PNE-SAIDA",
    nome: "IDFace PNE Saida",
    localizacao: "PNE Saida",
    ip: "172.29.9.37",
  },
  {
    codigo: "CONTROLID-FACEID-PNE-ENTRADA",
    nome: "IDFace PNE Entrada",
    localizacao: "PNE Entrada",
    ip: "172.29.9.36",
  },
  {
    codigo: "CONTROLID-FACEID-GARAGEM-SAIDA-1",
    nome: "IDFace Garagem Saida",
    localizacao: "Garagem Saida",
    ip: "172.29.5.44",
  },
  {
    codigo: "CONTROLID-FACEID-GARAGEM-SAIDA-2",
    nome: "IDFace Garagem Saida",
    localizacao: "Garagem Saida",
    ip: "172.29.5.43",
  },
  {
    codigo: "CONTROLID-FACEID-TORNIQUETE-ENTRADA",
    nome: "IDFace Torniquete Entrada",
    localizacao: "Torniquete Entrada",
    ip: "172.29.5.33",
  },
  {
    codigo: "CONTROLID-FACEID-TORNIQUETE-SAIDA",
    nome: "IDFace Torniquete Saida",
    localizacao: "Torniquete Saida",
    ip: "172.29.5.34",
  },
] as const;

async function main() {
  const unidade = await prisma.unidadeOrganizacional.findFirst({
    where: {
      ativo: true,
    },
    orderBy: [{ sigla: "asc" }, { nome: "asc" }],
    select: {
      id: true,
      orgaoId: true,
      sigla: true,
    },
  });

  if (!unidade) {
    throw new Error(
      "Nenhuma unidade ativa encontrada para vincular os equipamentos Control iD.",
    );
  }

  const integracaoExistente = await prisma.integracaoSistema.findFirst({
    where: {
      tipo: "EQUIPAMENTO_BIOMETRICO",
      nome: "Control ID - FACE ID",
      orgaoId: unidade.orgaoId,
    },
    select: {
      id: true,
    },
  });
  const dadosIntegracao = {
    orgaoId: unidade.orgaoId,
    nome: "Control ID - FACE ID",
    tipo: "EQUIPAMENTO_BIOMETRICO" as const,
    direcao: "ENTRADA" as const,
    status: "ATIVA" as const,
    ativo: true,
    descricao:
      "Integracao dos equipamentos Control iD FACE ID por Access API para coleta de eventos de ponto.",
    configuracao: {
      protocolo: "CONTROL_ID_FACE_ID",
      modoColeta: "ACCESS_API",
      objetoEventos: "access_logs",
      objetoUsuarios: "users",
      eventoAcessoConcedido: 7,
    },
  };
  const integracao = integracaoExistente
    ? await prisma.integracaoSistema.update({
        where: { id: integracaoExistente.id },
        data: dadosIntegracao,
      })
    : await prisma.integracaoSistema.create({
        data: dadosIntegracao,
      });

  for (const equipamento of equipamentos) {
    await prisma.equipamentoBiometrico.upsert({
      where: {
        codigo: equipamento.codigo,
      },
      update: {
        integracaoId: integracao.id,
        unidadeId: unidade.id,
        nome: equipamento.nome,
        fabricante: "CONTROL_ID",
        modelo: "FACE ID",
        localizacao: equipamento.localizacao,
        ip: equipamento.ip,
        porta: 80,
        ativo: true,
        configuracao: {
          protocolo: "CONTROL_ID_FACE_ID",
          usuario: "admin",
          senha: "admin",
          timeoutMs: 10000,
          proximoNsrColeta: 1,
          eventoAcessoConcedido: 7,
          modoColeta: "ACCESS_API",
        },
      },
      create: {
        integracaoId: integracao.id,
        unidadeId: unidade.id,
        codigo: equipamento.codigo,
        nome: equipamento.nome,
        fabricante: "CONTROL_ID",
        modelo: "FACE ID",
        localizacao: equipamento.localizacao,
        ip: equipamento.ip,
        porta: 80,
        ativo: true,
        configuracao: {
          protocolo: "CONTROL_ID_FACE_ID",
          usuario: "admin",
          senha: "admin",
          timeoutMs: 10000,
          proximoNsrColeta: 1,
          eventoAcessoConcedido: 7,
          modoColeta: "ACCESS_API",
        },
      },
    });
  }

  console.log(
    `Control ID - FACE ID: ${equipamentos.length} equipamento(s) vinculados a ${unidade.sigla}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
