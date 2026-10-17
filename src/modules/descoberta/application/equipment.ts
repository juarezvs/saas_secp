import { isIP } from "node:net";
import { randomUUID } from "node:crypto";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { registrarEquipamentoBiometricoAction } from "@/modules/integracoes/application/actions/registrar-equipamento-biometrico.action";
import { equipamentoBiometricoSchema } from "@/modules/integracoes/application/schemas/integracao.schema";
import { criarRelogioPontoProvider } from "@/modules/integracoes/application/services/relogios-ponto/relogio-ponto-provider.service";
import type { FabricanteRelogioPonto } from "@/modules/integracoes/domain/relogio-ponto.types";
import type { DiscoveryDetail, DiscoveryDevice } from "../domain/contracts";
import { identifyRegistration } from "../domain/duplicates";
import {
  DiscoveryError,
  requireDiscoveryOrganization,
  type DiscoveryContext,
} from "./gateway";

export async function annotateRegistrations(
  devices: DiscoveryDevice[],
  context: DiscoveryContext,
) {
  // Não enviar configuracao/credenciais ao navegador. Identidades fora do escopo viram apenas conflito opaco.
  const equipment = await prisma.equipamentoBiometrico.findMany({
    select: {
      id: true,
      orgaoId: true,
      unidadeId: true,
      codigo: true,
      nome: true,
      fabricante: true,
      numeroSerie: true,
      ip: true,
    },
  });
  const macRows = await prisma.$queryRaw<
    Array<{ id: string; mac: string | null }>
  >`SELECT id, COALESCE(configuracao->>'mac', configuracao->>'enderecoMac') AS mac FROM equipamentos_biometricos WHERE configuracao IS NOT NULL`;
  const macById = new Map(macRows.map((row) => [row.id, row.mac]));
  const identities = equipment.map((e) => ({
    ...e,
    orgaoId:
      e.unidadeId && context.excludedUnitIds.includes(e.unidadeId)
        ? null
        : e.orgaoId,
    mac: macById.get(e.id) ?? null,
    discoveryId: e.codigo.startsWith("DISC_") ? e.codigo.slice(5) : null,
  }));
  return devices.map((d) => ({
    ...d,
    registration: identifyRegistration(d, identities, context.orgaoIds),
  }));
}

export function driverManufacturer(protocol: string): FabricanteRelogioPonto {
  if (protocol.startsWith("CONTROL_ID")) return "CONTROL_ID";
  if (protocol.startsWith("HENRY")) return "HENRY";
  if (protocol === "DIMEP_SMART_PRINT") return "DIMEP";
  if (protocol === "INTELBRAS_BIO_T") return "INTELBRAS";
  return "GENERIC";
}

function validateDriver(detail: DiscoveryDetail, protocol: string) {
  const selected = driverManufacturer(protocol);
  const identified = detail.payload.manufacturer
    ?.replace(/[\s_-]/g, "")
    .toUpperCase();
  if (
    detail.payload.confidence === "CONFIRMED" &&
    identified &&
    selected !== "GENERIC" &&
    selected.replaceAll("_", "") !== identified
  ) {
    throw new DiscoveryError(
      "O driver escolhido não corresponde ao fabricante confirmado. Use um driver compatível ou cadastro genérico para revisão.",
      422,
    );
  }
}

export async function testDiscoveryDevice(
  detail: DiscoveryDetail,
  context: DiscoveryContext,
  input: { protocolo: string; porta: number; usuario?: string; senha?: string },
) {
  await requireDiscoveryOrganization(
    context,
    detail.orgao_id,
    detail.job.unidade_id,
  );
  validateDriver(detail, input.protocolo);
  if (!input.usuario?.trim() || !input.senha)
    throw new DiscoveryError(
      "Informe as credenciais autorizadas. Não são testadas senhas padrão.",
      422,
    );
  if (isIP(detail.ip) !== 4 || !detail.payload.open_ports.includes(input.porta))
    throw new DiscoveryError("Porta/IP não comprovado pela descoberta.", 422);
  const fabricante = driverManufacturer(input.protocolo);
  if (fabricante === "GENERIC")
    throw new DiscoveryError(
      "Selecione um driver existente compatível. Identificação de fabricante não comprova compatibilidade.",
      422,
    );
  const provider = criarRelogioPontoProvider({
    equipamentoId: detail.device_id,
    codigo: "DISC_" + detail.device_id,
    fabricante,
    modelo: detail.payload.model,
    ip: detail.ip,
    porta: input.porta,
    usuario: input.usuario,
    senha: input.senha,
    timeoutMs: 3000,
    configuracao: {
      protocolo: input.protocolo,
      transporteLegado: input.protocolo === "CONTROL_ID_FACE_ID",
    },
  });
  try {
    const result = await provider.testarConexao();
    // Detalhes de drivers podem conter respostas/PII: retornar só estado e resumo operacional.
    return {
      status: result.status,
      mensagem:
        result.status === "ONLINE"
          ? "Comunicação validada pelo driver existente do SECP."
          : "O driver não confirmou comunicação operacional.",
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return {
      status: "OFFLINE",
      mensagem:
        "Não foi possível testar pelo servidor SECP. Verifique rota, protocolo e credenciais; agentes remotos podem alcançar redes sem rota direta para este servidor.",
      checkedAt: new Date().toISOString(),
    };
  }
}

export async function registerDiscoveredDevice(
  detail: DiscoveryDetail,
  context: DiscoveryContext,
  input: {
    nome: string;
    unidadeId?: string;
    localizacao?: string;
    protocolo: string;
    porta: number;
    usuario?: string;
    senha?: string;
    aceitarIdentificacaoProvavel?: boolean;
  },
) {
  await requireDiscoveryOrganization(
    context,
    detail.orgao_id,
    input.unidadeId || detail.job.unidade_id,
  );
  validateDriver(detail, input.protocolo);
  if (
    detail.payload.confidence !== "CONFIRMED" &&
    !input.aceitarIdentificacaoProvavel
  )
    throw new DiscoveryError(
      "Revise e confirme explicitamente o cadastro de dispositivo sem identificação confirmada.",
      422,
    );
  if (!detail.payload.open_ports.includes(input.porta) || isIP(detail.ip) !== 4)
    throw new DiscoveryError("Endereço não comprovado pela descoberta.", 422);
  const [annotated] = await annotateRegistrations([detail], context);
  if (annotated.registration?.state === "REGISTERED")
    return { id: annotated.registration.equipmentId, duplicate: true };
  if (annotated.registration?.state === "CONFLICT")
    throw new DiscoveryError(annotated.registration.warnings.join(" "), 409);
  const codigo = "DISC_" + detail.device_id;
  const data = equipamentoBiometricoSchema.parse({
    codigo,
    nome: input.nome,
    orgaoId: detail.orgao_id,
    unidadeId: input.unidadeId || detail.job.unidade_id || "",
    fabricante: detail.payload.manufacturer ?? "",
    modelo: detail.payload.model ?? "",
    numeroSerie:
      detail.payload.confidence === "CONFIRMED"
        ? (detail.payload.serial ?? "")
        : "",
    localizacao: input.localizacao ?? "",
    ip: detail.ip,
    porta: input.porta,
    protocolo: input.protocolo,
    usuario: input.usuario ?? "",
    senha: input.senha ?? "",
    ativo: false,
  });
  const form = new FormData();
  for (const [key, value] of Object.entries(data))
    if (value !== undefined) form.set(key, String(value));
  // Inativo até revisão/configuração: não inicia coleta ou Monitor automaticamente.
  const saved = await registrarEquipamentoBiometricoAction(
    { sucesso: false, mensagem: null },
    form,
  );
  const existing = await prisma.equipamentoBiometrico.findUnique({
    where: { codigo },
    select: { id: true, orgaoId: true, ip: true },
  });
  if (
    !saved.sucesso &&
    (!existing ||
      existing.orgaoId !== detail.orgao_id ||
      existing.ip !== detail.ip)
  )
    throw new DiscoveryError(
      saved.mensagem ?? "Falha ao cadastrar equipamento.",
      422,
    );
  if (!existing)
    throw new DiscoveryError(
      "Cadastro não confirmado. Consulte a listagem antes de reenviar.",
    );
  await prisma.auditoriaEvento.create({
    data: {
      usuarioId: context.userId,
      entidade: "EquipamentoBiometrico",
      entidadeId: existing.id,
      acao: "EQUIPAMENTO_CADASTRADO_POR_DESCOBERTA",
      dadosDepois: {
        discoveryDeviceId: detail.device_id,
        observationId: detail.id,
        jobId: detail.job_id,
        correlationId: randomUUID(),
      },
    },
  });
  return { id: existing.id, duplicate: !saved.sucesso };
}
