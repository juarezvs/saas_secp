import {
  Fingerprint,
  Monitor,
  ScanFace,
  Smartphone,
  Upload,
  type LucideIcon,
} from "lucide-react";

type OrigemMarcacaoIconProps = {
  origem: string | null | undefined;
  compacta?: boolean;
};

type OrigemConfig = {
  label: string;
  icon: LucideIcon;
  className: string;
};

const origemConfig: Record<string, OrigemConfig> = {
  WEB: {
    label: "Sistema web",
    icon: Monitor,
    className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  },
  WEB_AUTORIZADO: {
    label: "Sistema web",
    icon: Monitor,
    className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
  },
  BIOMETRIA_FACIAL: {
    label: "Reconhecimento facial",
    icon: ScanFace,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  },
  FACIAL_AUTORIZADO: {
    label: "Reconhecimento facial",
    icon: ScanFace,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  },
  EQUIPAMENTO_BIOMETRICO: {
    label: "Equipamento biométrico",
    icon: Fingerprint,
    className: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300",
  },
  AFD: {
    label: "Arquivo AFD",
    icon: Upload,
    className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  },
  IMPORTACAO_AFD: {
    label: "Arquivo AFD",
    icon: Upload,
    className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  },
  MOBILE: {
    label: "Sistema mobile",
    icon: Smartphone,
    className: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950 dark:text-cyan-300",
  },
};

export function obterRotuloOrigemMarcacao(origem: string | null | undefined) {
  return origemConfig[origem ?? ""]?.label ?? origem ?? "Origem não informada";
}

export function OrigemMarcacaoIcon({
  origem,
  compacta = false,
}: OrigemMarcacaoIconProps) {
  const config = origemConfig[origem ?? ""] ?? {
    label: obterRotuloOrigemMarcacao(origem),
    icon: Monitor,
    className: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
  };
  const Icon = config.icon;

  if (compacta) {
    return (
      <span
        className={`inline-flex size-8 items-center justify-center rounded-full border ${config.className}`}
        title={config.label}
        aria-label={config.label}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.className}`}
      title={config.label}
    >
      <Icon className="size-4" aria-hidden="true" />
      {config.label}
    </span>
  );
}
