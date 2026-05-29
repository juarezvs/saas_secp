/* eslint-disable @typescript-eslint/no-unused-vars */

import "react";

declare module "react" {
  interface HTMLAttributes<T> {
    vw?: string;
    "vw-access-button"?: string;
    "vw-plugin-wrapper"?: string;
  }
}

declare global {
  interface Window {
    __secpVLibrasWidget?: unknown;
    VLibras?: {
      Widget: new (url: string) => unknown;
    };
  }
}

export {};
