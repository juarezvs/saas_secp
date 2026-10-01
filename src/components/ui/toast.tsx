"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import { CheckCircle2, Info, Loader2, TriangleAlert, X, XCircle } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "./utils";

export type ToastVariant = "default" | "success" | "info" | "warning" | "error";

type ToastInput = {
  title?: string;
  description: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastRecord = ToastInput & {
  id: string;
  open: boolean;
};

type PromiseMessages<T> = {
  loading: ToastInput | string;
  success: ToastInput | string | ((value: T) => ToastInput | string);
  error: ToastInput | string | ((error: unknown) => ToastInput | string);
};

type ToastApi = {
  show: (input: ToastInput) => string;
  update: (id: string, input: ToastInput) => void;
  dismiss: (id: string) => void;
  promise: <T>(promise: Promise<T>, messages: PromiseMessages<T>) => Promise<T>;
};

const ToastContext = createContext<ToastApi | null>(null);
const listeners = new Set<(input: ToastInput) => string>();
const updateListeners = new Set<(id: string, input: ToastInput) => void>();
const dismissListeners = new Set<(id: string) => void>();

function normalize(input: ToastInput | string): ToastInput {
  return typeof input === "string" ? { description: input } : input;
}

function resolveMessage<T>(
  input: ToastInput | string | ((value: T) => ToastInput | string),
  value: T,
) {
  return normalize(typeof input === "function" ? input(value) : input);
}

export const toast = {
  show(input: ToastInput) {
    let id = "";
    listeners.forEach((listener) => {
      id = listener(input);
    });
    return id;
  },
  update(id: string, input: ToastInput) {
    updateListeners.forEach((listener) => {
      listener(id, input);
    });
  },
  dismiss(id: string) {
    dismissListeners.forEach((listener) => {
      listener(id);
    });
  },
  success(description: string, title = "Concluído") {
    return toast.show({ title, description, variant: "success" });
  },
  info(description: string, title = "Informação") {
    return toast.show({ title, description, variant: "info" });
  },
  warning(description: string, title = "Atenção") {
    return toast.show({ title, description, variant: "warning" });
  },
  error(description: string, title = "Erro") {
    return toast.show({ title, description, variant: "error" });
  },
  promise<T>(promise: Promise<T>, messages: PromiseMessages<T>) {
    const id = toast.show({
      variant: "info",
      duration: 100000,
      ...normalize(messages.loading),
    });

    return promise.then(
      (value) => {
        updateListeners.forEach((listener) =>
          listener(id, {
            variant: "success",
            ...resolveMessage(messages.success, value),
          }),
        );
        return value;
      },
      (error) => {
        updateListeners.forEach((listener) =>
          listener(id, {
            variant: "error",
            ...resolveMessage(messages.error, error),
          }),
        );
        throw error;
      },
    );
  },
};

const variantStyles: Record<ToastVariant, string> = {
  default: "border-border bg-[var(--card)] text-[var(--card-foreground)]",
  success: "border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100",
  info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100",
  warning: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100",
  error: "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100",
};

const variantIcons = {
  default: Info,
  success: CheckCircle2,
  info: Info,
  warning: TriangleAlert,
  error: XCircle,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastRecord[]>([]);

  const api = useMemo<ToastApi>(
    () => ({
      show(input) {
        const id = crypto.randomUUID();
        setItems((current) => [
          ...current,
          {
            id,
            title: input.title,
            description: input.description,
            variant: input.variant ?? "default",
            duration: input.duration ?? 5000,
            open: true,
          },
        ]);
        return id;
      },
      update(id, input) {
        setItems((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...input,
                  variant: input.variant ?? item.variant,
                  duration: input.duration ?? 5000,
                  open: true,
                }
              : item,
          ),
        );
      },
      dismiss(id) {
        setItems((current) =>
          current.map((item) =>
            item.id === id ? { ...item, open: false } : item,
          ),
        );
      },
      promise(promise, messages) {
        return toast.promise(promise, messages);
      },
    }),
    [],
  );

  useEffect(() => {
    listeners.add(api.show);
    updateListeners.add(api.update);
    dismissListeners.add(api.dismiss);
    return () => {
      listeners.delete(api.show);
      updateListeners.delete(api.update);
      dismissListeners.delete(api.dismiss);
    };
  }, [api]);

  useEffect(() => {
    const timeouts = items
      .filter((item) => item.open && item.duration !== 100000)
      .map((item) =>
        window.setTimeout(() => {
          setItems((current) =>
            current.map((toastItem) =>
              toastItem.id === item.id
                ? { ...toastItem, open: false }
                : toastItem,
            ),
          );
        }, item.duration ?? 5000),
      );

    return () => {
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
    };
  }, [items]);

  useEffect(() => {
    if (items.every((item) => item.open)) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.open));
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [items]);

  return (
    <ToastContext.Provider value={api}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {items.map((item) => {
          const Icon = item.duration === 100000 ? Loader2 : variantIcons[item.variant ?? "default"];

          return (
            <ToastPrimitive.Root
              key={item.id}
              open={item.open}
              duration={item.duration}
              onOpenChange={(open) => {
                setItems((current) =>
                  open
                    ? current
                    : current.map((toastItem) =>
                        toastItem.id === item.id
                          ? { ...toastItem, open: false }
                          : toastItem,
                      ),
                );
              }}
              className={cn(
                "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-lg border p-4 shadow-lg",
                "data-[state=open]:animate-in data-[state=closed]:animate-out",
                variantStyles[item.variant ?? "default"],
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 size-5 shrink-0",
                  item.duration === 100000 && "animate-spin",
                )}
                aria-hidden="true"
              />
              <div className="min-w-0">
                {item.title ? (
                  <ToastPrimitive.Title className="font-semibold">
                    {item.title}
                  </ToastPrimitive.Title>
                ) : null}
                <ToastPrimitive.Description className="text-sm leading-5">
                  {item.description}
                </ToastPrimitive.Description>
              </div>
              <ToastPrimitive.Close className="rounded p-1 opacity-70 transition hover:opacity-100">
                <X className="size-4" aria-hidden="true" />
                <span className="sr-only">Fechar</span>
              </ToastPrimitive.Close>
            </ToastPrimitive.Root>
          );
        })}
        <ToastPrimitive.Viewport className="fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    return toast;
  }

  return context;
}

export function ActionStateToast({
  state,
  successTitle = "Concluído",
  errorTitle = "Não foi possível concluir",
}: {
  state?: {
    mensagem?: string | null;
    sucesso?: boolean | string | null;
    erro?: string | null;
  } | null;
  successTitle?: string;
  errorTitle?: string;
}) {
  const api = useToast();

  useEffect(() => {
    const sucessoTexto =
      typeof state?.sucesso === "string" ? state.sucesso : null;
    const sucesso = state?.sucesso === true || Boolean(sucessoTexto);
    const mensagem = state?.mensagem ?? state?.erro ?? sucessoTexto;
    if (!mensagem) return;

    api.show({
      title: sucesso ? successTitle : errorTitle,
      description: mensagem,
      variant: sucesso ? "success" : "error",
    });
  }, [api, errorTitle, state?.erro, state?.mensagem, state?.sucesso, successTitle]);

  return null;
}
