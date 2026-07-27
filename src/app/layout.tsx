import type { Metadata } from "next";
import { VlibrasGlobal } from "@/components/accessibility/vlibras-global";
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
try {
  var tema = window.localStorage.getItem("secp-color-theme");
  if (tema === "azul" || tema === "verde" || tema === "cinza") {
    document.documentElement.dataset.secpColorTheme = tema;
  }
} catch {}
            `.trim(),
          }}
        />
      </head>
      <body className="antialiased" data-dyslexia-font="false">
        {children}
        <VlibrasGlobal />
      </body>
    </html>
  );
}
