import { CheckCircle2, Circle } from "lucide-react";

import { cn } from "./utils";

export type StepperStep = {
  id: string;
  title: string;
  description?: string;
};

type StepperProps = {
  steps: StepperStep[];
  currentStep: number;
  className?: string;
};

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <nav aria-label="Etapas do fluxo" className={cn("rounded-lg border border-border bg-card p-4 shadow-card", className)}>
      <ol className="grid gap-3 md:grid-cols-6">
        {steps.map((step, index) => {
          const completed = index < currentStep;
          const active = index === currentStep;
          const Icon = completed ? CheckCircle2 : Circle;

          return (
            <li
              key={step.id}
              className={cn(
                "rounded-md border p-3 text-sm",
                active && "border-[var(--secp-theme-accent)] bg-[var(--secp-theme-accent-soft)] text-[var(--secp-theme-accent)]",
                completed && "border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100",
                !active && !completed && "border-border bg-muted text-muted-foreground",
              )}
              aria-current={active ? "step" : undefined}
            >
              <Icon className="size-5" aria-hidden="true" />
              <p className="mt-2 font-semibold">{step.title}</p>
              {step.description && <p className="mt-1 text-xs leading-5">{step.description}</p>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

