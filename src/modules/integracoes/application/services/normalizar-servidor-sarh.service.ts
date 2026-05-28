import type { SarhServidorDto } from "./sarh-client.service";

export type ServidorSarhNormalizado = {
  matricula: string;
  nome: string;
  email: string | null;
  cargo: string | null;
  unidadeSigla: string | null;
  unidadeNome: string | null;
  ativo: boolean;
  dataAdmissao: Date | null;
};

export function normalizarServidorSarh(
  dto: SarhServidorDto,
): ServidorSarhNormalizado {
  const situacao = String(dto.situacao ?? "ATIVO").toUpperCase();

  return {
    matricula: String(dto.matricula ?? "").trim(),
    nome: String(dto.nome ?? "").trim(),
    email: dto.email ? String(dto.email).trim().toLowerCase() : null,
    cargo: dto.cargo ? String(dto.cargo).trim() : null,
    unidadeSigla: dto.unidadeSigla ? String(dto.unidadeSigla).trim() : null,
    unidadeNome: dto.unidadeNome ? String(dto.unidadeNome).trim() : null,
    ativo: !["INATIVO", "DESLIGADO", "EXONERADO"].includes(situacao),
    dataAdmissao: dto.dataAdmissao ? new Date(dto.dataAdmissao) : null,
  };
}
