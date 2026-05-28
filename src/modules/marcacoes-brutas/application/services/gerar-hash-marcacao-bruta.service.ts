import crypto from "node:crypto";

export function gerarHashMarcacaoBruta(params: {
  cpf?: string | null;
  matricula?: string | null;
  dataHora: Date;
  equipamentoCodigo?: string | null;
  origem: string;
  nsr?: string | null;
  codigoExterno?: string | null;
}) {
  const chave = [
    params.origem,
    params.equipamentoCodigo ?? "",
    params.nsr ?? "",
    params.codigoExterno ?? "",
    params.cpf ?? "",
    params.matricula ?? "",
    params.dataHora.toISOString(),
  ].join("|");

  return crypto.createHash("sha256").update(chave).digest("hex");
}