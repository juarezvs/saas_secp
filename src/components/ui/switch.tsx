"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import { useId, useState } from "react";
import type { ComponentProps } from "react";

import { cn } from "./utils";

export function Switch({
  className,
  ...props
}: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-[var(--border)] bg-[var(--muted)] shadow-sm transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:!border-[var(--secp-theme-accent)] data-[state=checked]:!bg-[var(--secp-theme-accent)]",
        "data-[state=unchecked]:border-[var(--border)] data-[state=unchecked]:bg-[var(--muted)]",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-5 rounded-full bg-white shadow-lg ring-1 ring-black/10 transition-transform",
          "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

type SwitchFieldProps = Omit<ComponentProps<typeof Switch>, "name"> & {
  name: string;
  value?: string;
  defaultChecked?: boolean;
};

export function SwitchField({
  id,
  name,
  value = "on",
  defaultChecked = false,
  disabled,
  onCheckedChange,
  ...props
}: SwitchFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <>
      <input
        type="checkbox"
        hidden
        readOnly
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
      />
      <Switch
        id={inputId}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => {
          setChecked(next);
          onCheckedChange?.(next);
        }}
        {...props}
      />
    </>
  );
}
