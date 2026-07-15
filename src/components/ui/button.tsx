import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "./utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary: "secp-theme-primary-action border",
  secondary: "bg-muted text-foreground hover:bg-slate-200 dark:hover:bg-slate-700",
  outline: "border border-border bg-transparent text-foreground hover:bg-muted",
  ghost: "bg-transparent text-foreground hover:bg-muted",
  danger: "bg-secp-danger text-white hover:bg-red-800",
  success: "bg-secp-green-700 text-white hover:bg-green-800",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 gap-2 px-3 text-sm",
  md: "h-10 gap-2.5 px-4 text-sm",
  lg: "h-12 gap-3 px-5 text-base",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  leftIcon,
  rightIcon,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-semibold shadow-sm transition",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  );
}

