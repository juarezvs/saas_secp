import type { ComponentProps } from "react";
import { cn } from "./utils";

export function Avatar({ className, ...props }: ComponentProps<"span">) {
  return <span className={cn("relative flex shrink-0 overflow-hidden rounded-full", className)} {...props} />;
}

export function AvatarImage({ className, alt = "", ...props }: ComponentProps<"img">) {
  // Avatar photos may come from authenticated data URLs and do not require image optimization.
  // eslint-disable-next-line @next/next/no-img-element
  return <img alt={alt} className={cn("size-full object-cover", className)} {...props} />;
}

export function AvatarFallback({ className, ...props }: ComponentProps<"span">) {
  return <span className={cn("flex size-full items-center justify-center bg-[var(--muted)]", className)} {...props} />;
}
