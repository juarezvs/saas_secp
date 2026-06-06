import type { InputHTMLAttributes } from "react";

import { cn } from "./utils";

export type CompetenciaInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label?: string;
  inputClassName?: string;
};

export function CompetenciaInput({
  id = "competencia",
  name = "competencia",
  label = "Competencia",
  className,
  inputClassName,
  ...props
}: CompetenciaInputProps) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="text-sm font-semibold text-[var(--foreground)]"
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="month"
        className={cn(
          "mt-2 h-10 w-full rounded-md border bg-[var(--card)] px-3 text-sm",
          inputClassName,
          props.disabled && "cursor-not-allowed opacity-70",
        )}
        {...props}
      />
    </div>
  );
}
