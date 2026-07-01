import type { LucideIcon } from "lucide-react";
import {
  Baby,
  Briefcase,
  CalendarX,
  Droplet,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  Plane,
  Scale,
  TreePalm,
  Vote,
} from "lucide-react";

type AfastamentoIconeConfig = {
  Icone: LucideIcon;
  titulo: string;
};

type AfastamentoTipoIconeProps = {
  descricao?: string | null;
  className?: string;
};

export function obterIconeAfastamento(
  descricao?: string | null,
): AfastamentoIconeConfig {
  const texto = normalizarTexto(descricao);

  if (contem(texto, ["FERIAS", "RECESSO"])) {
    return { Icone: TreePalm, titulo: "Férias ou recesso" };
  }

  if (
    contem(texto, [
      "SAUDE",
      "MEDIC",
      "DOENCA",
      "TRATAMENTO",
      "PERICIA",
      "CONVALESC",
    ])
  ) {
    return { Icone: HeartPulse, titulo: "Licença ou tratamento de saúde" };
  }

  if (
    contem(texto, [
      "MATERN",
      "PATERN",
      "GESTANTE",
      "ADOT",
      "NATALIDADE",
      "AMAMENT",
    ])
  ) {
    return { Icone: Baby, titulo: "Maternidade, paternidade ou adoção" };
  }

  if (
    contem(texto, [
      "CAPACIT",
      "CURSO",
      "TREINAMENTO",
      "ESTUDO",
      "POS-GRAD",
      "MESTRADO",
      "DOUTORADO",
    ])
  ) {
    return { Icone: GraduationCap, titulo: "Capacitação ou estudo" };
  }

  if (contem(texto, ["ELEICA", "ELEITORAL", "TRE", "TSE"])) {
    return { Icone: Vote, titulo: "Serviço eleitoral" };
  }

  if (contem(texto, ["JURI", "JUSTICA", "AUDIENCIA", "DEPOIMENTO"])) {
    return { Icone: Scale, titulo: "Convocação judicial" };
  }

  if (contem(texto, ["DOACAO", "SANGUE"])) {
    return { Icone: Droplet, titulo: "Doação de sangue" };
  }

  if (contem(texto, ["LUTO", "NOJO", "FALECIMENTO", "CASAMENTO", "GALA"])) {
    return { Icone: HeartHandshake, titulo: "Afastamento pessoal" };
  }

  if (contem(texto, ["VIAGEM", "DESLOCAMENTO"])) {
    return { Icone: Plane, titulo: "Viagem a serviço" };
  }

  if (contem(texto, ["SERVICO", "MISSAO", "COMISSAO", "CONGRESSO"])) {
    return { Icone: Briefcase, titulo: "Serviço ou missão institucional" };
  }

  return { Icone: CalendarX, titulo: "Afastamento" };
}

export function AfastamentoTipoIcone({
  descricao,
  className = "size-4",
}: AfastamentoTipoIconeProps) {
  const { Icone, titulo } = obterIconeAfastamento(descricao);

  return <Icone className={className} aria-hidden="true" data-title={titulo} />;
}

function contem(texto: string, termos: string[]) {
  return termos.some((termo) => texto.includes(termo));
}

function normalizarTexto(valor?: string | null) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}
