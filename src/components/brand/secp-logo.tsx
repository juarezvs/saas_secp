type SecpLogoProps = {
  variant?: "full" | "mark";
  tone?: "light" | "dark";
  className?: string;
};

export function SecpLogo({
  variant = "full",
  tone = "dark",
  className,
}: SecpLogoProps) {
  const isMark = variant === "mark";
  const src = isMark ? "/secp-symbol.png" : "/secp-logo.png";
  const alt = isMark
    ? "SECP"
    : "SECP - Sistema Eletrônico de Controle de Ponto";
  const wrapperClassName = [
    "relative inline-flex shrink-0 overflow-hidden",
    isMark ? "items-center justify-center" : "items-center",
    !isMark && tone === "light"
      ? "rounded-md bg-white/95 p-1.5 shadow-sm ring-1 ring-white/30"
      : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={wrapperClassName} aria-label={alt} role="img">
      {/* A logo institucional deve funcionar mesmo se o otimizador do Next falhar. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={isMark ? 512 : 1200}
        height={isMark ? 701 : 392}
        className="h-full w-full object-contain"
        decoding="async"
        loading="eager"
      />
    </span>
  );
}
