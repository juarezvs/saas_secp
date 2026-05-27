import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        data-font-size="normal"
        data-dyslexia-font="false"
      >
        {children}

        <div vw="" className="enabled">
          <div vw-access-button="" className="active" />
          <div vw-plugin-wrapper="">
            <div className="vw-plugin-top-wrapper" />
          </div>
        </div>

        <Script
          id="vlibras-plugin"
          src="https://vlibras.gov.br/app/vlibras-plugin.js"
          strategy="beforeInteractive"
        />

        <Script
          id="vlibras-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function iniciarVLibras() {
                function start() {
                  if (window.VLibras && window.VLibras.Widget && !window.__secpVLibrasWidget) {
                    window.__secpVLibrasWidget = new window.VLibras.Widget('https://vlibras.gov.br/app');
                  }
                }

                if (document.readyState === 'complete' || document.readyState === 'interactive') {
                  setTimeout(start, 300);
                } else {
                  document.addEventListener('DOMContentLoaded', function () {
                    setTimeout(start, 300);
                  });
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
