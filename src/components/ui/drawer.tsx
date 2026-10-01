"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentPropsWithoutRef, ElementRef, ReactNode } from "react";
import { forwardRef } from "react";

import { cn } from "@/components/ui/utils";

const Drawer = Dialog.Root;
const DrawerTrigger = Dialog.Trigger;
const DrawerClose = Dialog.Close;
const DrawerPortal = Dialog.Portal;
const DrawerTitle = Dialog.Title;
const DrawerDescription = Dialog.Description;

type SwipeDirection = "up" | "right" | "down" | "left";

const DrawerOverlay = forwardRef<
  ElementRef<typeof Dialog.Overlay>,
  ComponentPropsWithoutRef<typeof Dialog.Overlay>
>(({ className, ...props }, ref) => (
  <Dialog.Overlay
    ref={ref}
    data-slot="drawer-overlay"
    className={cn(
      "fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[1px]",
      "data-[state=closed]:animate-out data-[state=open]:animate-in",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DrawerOverlay.displayName = Dialog.Overlay.displayName;

type DrawerContentProps = ComponentPropsWithoutRef<typeof Dialog.Content> & {
  children: ReactNode;
  exibirFechar?: boolean;
  overlayClassName?: string;
  swipeDirection?: SwipeDirection;
};

function classesDirecao(swipeDirection: SwipeDirection) {
  if (swipeDirection === "right") {
    return "bottom-0 right-0 top-0 h-dvh w-[min(75vw,48rem)] border-l data-[state=closed]:translate-x-full data-[state=open]:translate-x-0";
  }

  if (swipeDirection === "left") {
    return "bottom-0 left-0 top-0 h-dvh w-[min(82vw,56rem)] border-r data-[state=closed]:-translate-x-full data-[state=open]:translate-x-0";
  }

  if (swipeDirection === "up") {
    return "inset-x-0 bottom-0 max-h-[calc(100dvh-6rem)] border-t data-[state=closed]:translate-y-full data-[state=open]:translate-y-0";
  }

  return "inset-x-0 top-0 max-h-[calc(100dvh-6rem)] border-b data-[state=closed]:-translate-y-full data-[state=open]:translate-y-0";
}

const DrawerContent = forwardRef<
  ElementRef<typeof Dialog.Content>,
  DrawerContentProps
>(
  (
    {
      className,
      children,
      exibirFechar = true,
      overlayClassName,
      swipeDirection = "down",
      ...props
    },
    ref,
  ) => (
    <DrawerPortal>
      <DrawerOverlay className={overlayClassName} />
      <Dialog.Content
        ref={ref}
        data-slot="drawer-content"
        data-swipe-direction={swipeDirection}
        data-swipe-axis={
          swipeDirection === "left" || swipeDirection === "right" ? "x" : "y"
        }
        className={cn(
          "fixed z-50 flex flex-col bg-card text-card-foreground shadow-2xl outline-none",
          "transition-transform duration-200 ease-out",
          classesDirecao(swipeDirection),
          className,
        )}
        {...props}
      >
        {children}
        {exibirFechar ? (
          <DrawerClose className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-md border bg-card text-muted-foreground shadow-sm transition hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">Fechar</span>
          </DrawerClose>
        ) : null}
      </Dialog.Content>
    </DrawerPortal>
  ),
);
DrawerContent.displayName = Dialog.Content.displayName;

function DrawerHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("border-b px-5 py-4 text-left", className)} {...props} />
  );
}

function DrawerFooter({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("mt-auto border-t px-5 py-4", className)} {...props} />
  );
}

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
};
