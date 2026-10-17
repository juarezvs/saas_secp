import { Decimal } from "@prisma/client/runtime/client";

import { RemuneracaoIndisponivelError } from "../integrations/remuneracao-provider";

type RubricaBase = { codigo: number; tipo: string; valor: number };
const Dinheiro = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

// Seleção técnica de códigos explícitos. Não substitui a validação jurídica/RH
// da natureza, vigência e composição das rubricas prevista na especificação.
export function selecionarBaseRemuneratoriaContracheque<T extends RubricaBase>(
  rubricas: T[],
  codigos: ReadonlySet<string>,
) {
  if (codigos.size === 0) {
    throw new RemuneracaoIndisponivelError(
      "Base de horas extras pendente: configure as rubricas remuneratorias validadas pelo RH. O total bruto do contracheque nao pode ser usado automaticamente.",
    );
  }

  const rubricasUsadas = rubricas.filter(
    (rubrica) => rubrica.tipo === "R" && codigos.has(String(rubrica.codigo)),
  );
  let base = new Dinheiro(0);
  for (const rubrica of rubricasUsadas) {
    if (!Number.isFinite(rubrica.valor)) {
      throw new RemuneracaoIndisponivelError("Rubrica remuneratoria com valor invalido.");
    }
    base = base.plus(rubrica.valor.toString());
  }
  const centavos = base.mul(100).toDecimalPlaces(0).toNumber();
  if (!Number.isSafeInteger(centavos) || centavos <= 0) {
    throw new RemuneracaoIndisponivelError("Rubricas configuradas sem remuneracao-base positiva em centavos.");
  }
  return {
    valor: centavos / 100,
    centavos,
    criterio: "RUBRICAS_CONFIGURADAS" as const,
    rubricasUsadas,
  };
}
