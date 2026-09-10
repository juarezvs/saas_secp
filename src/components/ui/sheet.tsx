"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentPropsWithoutRef, ElementRef, ReactNode } from "react";
import { forwardRef } from "react";

import { cn } from "@/components/ui/utils";

const Sheet = Dialog.Root;
const SheetTrigger = Dialog.Trigger;
const SheetClose = Dialog.Close;
const SheetPortal = Dialog.Portal;
const SheetTitle = Dialog.Title;
const SheetDescription = Dialog.Description;

const SheetOverlay = forwardRef<
  ElementRef<typeof Dialog.Overlay>,
  ComponentPropsWithoutRef<typeof Dialog.Overlay>
>(({ className, ...props }, ref) => (
  <Dialog.Overlay
    ref={ref}
    className={cn(
      "fixed inset-x-0 bottom-0 top-[4.5rem] z-40 bg-slate-950/35 backdrop-blur-[1px]",
      "data-[state=closed]:animate-out data-[state=open]:animate-in",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = Dialog.Overlay.displayName;

type SheetContentProps = ComponentPropsWithoutRef<typeof Dialog.Content> & {
  children: ReactNode;
  exibirFechar?: boolean;
  overlayClassName?: string;
};

const SheetContent = forwardRef<
  ElementRef<typeof Dialog.Content>,
  SheetContentProps
>(
  (
    { className, children, exibirFechar = true, overlayClassName, ...props },
    ref,
  ) => (
  <SheetPortal>
    <SheetOverlay className={overlayClassName} />
    <Dialog.Content
      ref={ref}
      className={cn(
        "fixed bottom-0 left-0 top-[4.5rem] z-50 flex h-[calc(100vh-4.5rem)] w-[min(20rem,88vw)] flex-col border-r border-border bg-card text-card-foreground shadow-floating outline-none",
        "transition-transform duration-200 ease-out data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0",
        className,
      )}
      {...props}
    >
      {children}
      {exibirFechar && (
        <SheetClose className="secp-theme-action absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-md border p-0 shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <X
            className="size-4 text-[var(--secp-theme-accent)]"
            aria-hidden="true"
          />
          <span className="sr-only">Fechar menu</span>
        </SheetClose>
      )}
    </Dialog.Content>
  </SheetPortal>
  ),
);
SheetContent.displayName = Dialog.Content.displayName;

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
