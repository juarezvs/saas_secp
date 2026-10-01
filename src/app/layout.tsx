import type { Metadata } from "next";
import { VlibrasGlobal } from "@/components/accessibility/vlibras-global";
import { ThemeBootstrap } from "@/components/layout/theme-bootstrap";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SECP — Sistema Eletrônico de Controle de Ponto",
    template: "%s | SECP",
  },
  description:
    "Sistema Eletrônico de Controle de Ponto da Justiça Federal do Amazonas.",
  icons: {
    icon: "/secp-symbol.png",
    shortcut: "/secp-symbol.png",
    apple: "/secp-symbol.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" data-font-size="16" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className="antialiased" data-dyslexia-font="false">
        <ThemeBootstrap />
        <ToastProvider>
          {children}
          <VlibrasGlobal />
        </ToastProvider>
      </body>
    </html>
  );
}
