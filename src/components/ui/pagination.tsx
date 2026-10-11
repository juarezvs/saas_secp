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
      data-slot="pagination"
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
      data-slot="pagination-content"
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  );
}

export function PaginationItem({
  className,
  ...props
}: ComponentProps<"li">) {
  return <li data-slot="pagination-item" className={className} {...props} />;
}

type PaginationLinkProps = ComponentProps<typeof Link> & {
  isActive?: boolean;
  disabled?: boolean;
  size?: "default" | "icon";
  children: ReactNode;
};

export function PaginationLink({
  className,
  isActive,
  disabled,
  size = "icon",
  href,
  children,
  ...props
}: PaginationLinkProps) {
  return (
    <Link
      href={disabled ? "#" : href}
      aria-current={isActive ? "page" : undefined}
      aria-disabled={disabled || undefined}
      data-slot="pagination-link"
      data-active={isActive || undefined}
      tabIndex={disabled ? -1 : props.tabIndex}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-md text-sm font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        size === "icon" ? "w-9 p-0" : "px-4 py-2",
        isActive
          ? "border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] shadow-sm"
          : "border border-transparent text-[var(--foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
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
  children,
  text = "Anterior",
  ...props
}: Omit<PaginationLinkProps, "children" | "size"> & {
  children?: ReactNode;
  text?: string;
}) {
  return (
    <PaginationLink
      aria-label="Ir para a página anterior"
      size="default"
      className={cn("gap-1 px-2.5 sm:pl-2.5", className)}
      {...props}
    >
      {children ?? (
        <>
          <ChevronLeft className="size-4" aria-hidden="true" />
          <span className="hidden sm:block">{text}</span>
        </>
      )}
    </PaginationLink>
  );
}

export function PaginationNext({
  className,
  children,
  text = "Próxima",
  ...props
}: Omit<PaginationLinkProps, "children" | "size"> & {
  children?: ReactNode;
  text?: string;
}) {
  return (
    <PaginationLink
      aria-label="Ir para a próxima página"
      size="default"
      className={cn("gap-1 px-2.5 sm:pr-2.5", className)}
      {...props}
    >
      {children ?? (
        <>
          <span className="hidden sm:block">{text}</span>
          <ChevronRight className="size-4" aria-hidden="true" />
        </>
      )}
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
      data-slot="pagination-ellipsis"
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
