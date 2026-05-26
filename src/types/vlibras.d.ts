import type { HTMLAttributes } from "react";

declare module "react" {
  interface HTMLAttributes<T> {
    vw?: string;
    "vw-access-button"?: string;
    "vw-plugin-wrapper"?: string;
  }
}

declare global {
  interface Window {
    VLibras?: {
      Widget: new (url: string) => unknown;
    };
    __secpVlibrasInicializado?: boolean;
  }
}

export {};
