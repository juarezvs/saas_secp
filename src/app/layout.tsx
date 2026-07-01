import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { VlibrasGlobal } from "@/components/accessibility/vlibras-global";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        data-dyslexia-font="false"
      >
        {children}
        <VlibrasGlobal />
      </body>
    </html>
  );
}
