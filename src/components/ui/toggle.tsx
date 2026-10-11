"use client";

import * as TogglePrimitive from "@radix-ui/react-toggle";
import type { ComponentProps } from "react";

import { cn } from "./utils";

type ToggleProps = ComponentProps<typeof TogglePrimitive.Root> & {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md";
};

export function Toggle({
  className,
  variant = "default",
  size = "md",
  ...props
}: ToggleProps) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--secp-theme-accent)]",
        "disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        size === "sm" ? "h-9 px-3 text-sm" : "h-10 px-4 text-sm",
        variant === "outline" &&
          "border border-border bg-transparent text-foreground shadow-sm hover:bg-muted data-[state=on]:border-[var(--secp-theme-accent)] data-[state=on]:bg-[var(--secp-theme-accent-soft)] data-[state=on]:text-[var(--secp-theme-accent)]",
        variant === "ghost" &&
          "text-foreground hover:bg-muted data-[state=on]:bg-[var(--secp-theme-accent-soft)] data-[state=on]:text-[var(--secp-theme-accent)]",
        variant === "default" &&
          "bg-muted text-foreground hover:bg-muted/80 data-[state=on]:bg-[var(--secp-theme-accent-soft)] data-[state=on]:text-[var(--secp-theme-accent)]",
        className,
      )}
      {...props}
    />
  );
}
