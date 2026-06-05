import type { HTMLAttributes, ReactNode } from "react";
import { HelpCircle } from "lucide-react";

import { cn } from "./utils";

type HelpTextProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
};

export function HelpText({ className, children, ...props }: HelpTextProps) {
  return (
    <p className={cn("mt-1.5 flex items-start gap-2 text-xs leading-5 text-muted-foreground", className)} {...props}>
      <HelpCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

