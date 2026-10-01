import Link from "next/link";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "./utils";

export function Pagination({
  className,
  ...props
}: ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="Paginação"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

export function PaginationContent({
  className,
  ...props
}: ComponentProps<"ul">) {
  return (
    <ul
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  );
}

export function PaginationItem({
  className,
  ...props
}: ComponentProps<"li">) {
  return <li className={cn("", className)} {...props} />;
}

type PaginationLinkProps = ComponentProps<typeof Link> & {
  isActive?: boolean;
  disabled?: boolean;
  children: ReactNode;
};

export function PaginationLink({
  className,
  isActive,
  disabled,
  href,
  children,
  ...props
}: PaginationLinkProps) {
  return (
    <Link
      href={disabled ? "#" : href}
      aria-current={isActive ? "page" : undefined}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : props.tabIndex}
      className={cn(
        "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm font-semibold transition",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        isActive
          ? "border-blue-900 bg-blue-900 text-white hover:bg-blue-950"
          : "border-border bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

export function PaginationPrevious({
  className,
  children = "Anterior",
  ...props
}: Omit<PaginationLinkProps, "children"> & { children?: ReactNode }) {
  return (
    <PaginationLink
      aria-label="Ir para a página anterior"
      className={cn("gap-1 pl-2.5", className)}
      {...props}
    >
      <ChevronLeft className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">{children}</span>
    </PaginationLink>
  );
}

export function PaginationNext({
  className,
  children = "Próxima",
  ...props
}: Omit<PaginationLinkProps, "children"> & { children?: ReactNode }) {
  return (
    <PaginationLink
      aria-label="Ir para a próxima página"
      className={cn("gap-1 pr-2.5", className)}
      {...props}
    >
      <span className="hidden sm:inline">{children}</span>
      <ChevronRight className="size-4" aria-hidden="true" />
    </PaginationLink>
  );
}

export function PaginationEllipsis({
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-9 min-w-9 items-center justify-center text-[var(--muted-foreground)]",
        className,
      )}
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">Mais páginas</span>
    </span>
  );
}
