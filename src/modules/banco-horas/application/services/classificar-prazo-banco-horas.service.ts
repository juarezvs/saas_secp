export type ClassificacaoPrazoBancoHoras =
  | "SEM_PRAZO"
  | "REGULAR"
  | "ATENCAO"
  | "URGENTE"
  | "VENCIDO";

export function calcularDiasAtePrazo(params: {
  prazo: Date | null;
  hoje?: Date;
}) {
  if (!params.prazo) {
    return null;
  }

  const hoje = new Date(params.hoje ?? new Date());
  const prazo = new Date(params.prazo);
  const inicioHojeUtc = Date.UTC(
    hoje.getUTCFullYear(),
    hoje.getUTCMonth(),
    hoje.getUTCDate(),
  );
  const inicioPrazoUtc = Date.UTC(
    prazo.getUTCFullYear(),
    prazo.getUTCMonth(),
    prazo.getUTCDate(),
  );

  return Math.ceil((inicioPrazoUtc - inicioHojeUtc) / 86_400_000);
}

export function classificarPrazoBancoHoras(params: {
  prazo: Date | null;
  hoje?: Date;
}): ClassificacaoPrazoBancoHoras {
  const dias = calcularDiasAtePrazo(params);

  if (dias === null) return "SEM_PRAZO";
  if (dias < 0) return "VENCIDO";
  if (dias <= 10) return "URGENTE";
  if (dias <= 30) return "ATENCAO";

  return "REGULAR";
}

export function rotuloClassificacaoPrazoBancoHoras(
  classificacao: ClassificacaoPrazoBancoHoras,
) {
  const rotulos: Record<ClassificacaoPrazoBancoHoras, string> = {
    SEM_PRAZO: "Sem prazo",
    REGULAR: "Regular",
    ATENCAO: "Atencao",
    URGENTE: "Urgente",
    VENCIDO: "Vencido",
  };

  return rotulos[classificacao];
}

export function classeClassificacaoPrazoBancoHoras(
  classificacao: ClassificacaoPrazoBancoHoras,
) {
  const classes: Record<ClassificacaoPrazoBancoHoras, string> = {
    SEM_PRAZO: "bg-slate-100 text-slate-700",
    REGULAR: "bg-green-50 text-green-700",
    ATENCAO: "bg-yellow-50 text-yellow-800",
    URGENTE: "bg-amber-50 text-amber-800",
    VENCIDO: "bg-red-50 text-red-700",
  };

  return classes[classificacao];
}
