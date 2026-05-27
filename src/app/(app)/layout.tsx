import { AppShell } from "@/components/layout/app-shell";
import { SessionProvider } from "@/components/layout/session-provider";

export default function AuthenticatedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SessionProvider>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
