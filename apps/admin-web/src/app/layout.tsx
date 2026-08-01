import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Nodex Admin",
  description: "Nodex Intercity admin shell",
};

const nav: Array<[string, string]> = [
  ["Dashboard", "/"],
  ["Drivers", "/drivers"],
  ["Vehicles", "/vehicles"],
  ["Trips", "/trips"],
  ["Bookings", "/bookings"],
  ["Support", "/support"],
  ["Design", "/design-system"],
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="nodex-app">
        <div className="admin-shell">
          <aside className="admin-sidebar border-r border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.88)] p-4 backdrop-blur">
            <div className="mb-6 text-xl font-black">Nodex Admin</div>
            <nav className="grid gap-1">
              {nav.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-[var(--radius-md)] px-3 py-2 text-sm font-semibold hover:bg-[rgb(var(--surface-muted))]"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </aside>
          <div>
            <header className="flex items-center justify-between border-b border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.72)] px-5 py-3 backdrop-blur">
              <div>
                <div className="text-xs text-slate-500">Operations / local mock</div>
                <div className="font-bold">Foundation shell</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  aria-label="Open command palette"
                  className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] px-3 py-2 text-sm"
                >
                  ⌘K
                </button>
                <button className="rounded-full bg-[rgb(var(--primary))] px-3 py-2 text-sm font-bold text-[rgb(var(--primary-foreground))]">
                  Admin
                </button>
              </div>
            </header>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
