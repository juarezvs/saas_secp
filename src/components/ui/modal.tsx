"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "./button";
import { cn } from "./utils";

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function Modal({ open, onOpenChange, title, description, children, footer, className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2",
            "rounded-lg border border-border bg-card p-6 text-card-foreground shadow-floating focus:outline-none",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
              {description && <Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">{description}</Dialog.Description>}
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm" aria-label="Fechar modal" className="size-9 p-0">
                <X className="size-4" aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="mt-5">{children}</div>
          {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

