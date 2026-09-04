import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "./admin-shell";

export const metadata: Metadata = {
  title: "ENVO Admin",
  description: "ENVO Intercity admin shell",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="nodex-app">
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
