"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Bell,
  Car,
  ChevronLeft,
  Gift,
  Headphones,
  LayoutDashboard,
  Megaphone,
  Network,
  Route,
  Search,
  Settings,
  ShieldCheck,
  ShieldAlert,
  ShieldMinus,
  Ticket,
  UserRound,
  Users,
} from "lucide-react";
import { globalSearchItems } from "./admin-data";

type NavItem = { label: string; href: string; icon: ReactNode };

const groups: Array<{ label: string; items: NavItem[] }> = [
  { label: "Обзор", items: [{ label: "Панель", href: "/dashboard", icon: <LayoutDashboard size={16} /> }] },
  {
    label: "Операции",
    items: [
      { label: "Поездки", href: "/trips", icon: <Route size={16} /> },
      { label: "Бронирования", href: "/bookings", icon: <Ticket size={16} /> },
      { label: "Матчинг", href: "/matching", icon: <Network size={16} /> },
    ],
  },
  {
    label: "Люди",
    items: [
      { label: "Клиенты", href: "/users", icon: <UserRound size={16} /> },
      { label: "Водители", href: "/drivers", icon: <Users size={16} /> },
      { label: "Рефералы", href: "/referrals", icon: <Car size={16} /> },
    ],
  },
  {
    label: "Поддержка и безопасность",
    items: [
      { label: "Поддержка", href: "/support", icon: <Headphones size={16} /> },
      { label: "Надёжность", href: "/reliability", icon: <ShieldCheck size={16} /> },
      { label: "Антифрод", href: "/fraud", icon: <ShieldAlert size={16} /> },
      { label: "Не предлагать", href: "/avoid-match", icon: <ShieldMinus size={16} /> },
    ],
  },
  {
    label: "Рост",
    items: [
      { label: "Награды", href: "/rewards", icon: <Gift size={16} /> },
      { label: "Промо", href: "/promotions", icon: <Megaphone size={16} /> },
    ],
  },
  { label: "Система", items: [{ label: "Настройки", href: "/settings", icon: <Settings size={16} /> }] },
];

const extraSearchItems = [
  { label: "Очередь поддержки", detail: "Открытые обращения и диалоги", href: "/support" },
  { label: "ENVO Protection", detail: "Задержки, отмены и поиск замены", href: "/reliability" },
  { label: "Антифрод", detail: "Сигналы риска, награды и рефералы", href: "/fraud" },
  { label: "Промо кампании", detail: "Партнёры, баннеры и конверсия", href: "/promotions" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [currentSearch, setCurrentSearch] = useState("");

  useEffect(() => {
    setCurrentSearch(window.location.search);
    setQuery("");
  }, [pathname]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];
    return [...globalSearchItems, ...extraSearchItems]
      .filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [query]);

  const isActive = (href: string) => {
    const [hrefPath = href, hrefSearch = ""] = href.split("?");
    if (hrefSearch) return pathname === hrefPath && currentSearch === `?${hrefSearch}`;
    if (hrefPath === "/dashboard") return pathname === "/" || pathname === "/dashboard";
    return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
  };

  const currentLabel = pathname === "/" ? "Панель" : pathname.split("/").filter(Boolean).join(" / ");

  return (
    <div className={`admin-shell min-h-screen bg-[rgb(var(--canvas))] text-[rgb(var(--foreground))] ${collapsed ? "admin-shell-collapsed" : ""}`}>
      <aside className="admin-sidebar border-r border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.98)] px-3 py-4">
        <div className="mb-5 flex items-center justify-between gap-2 px-2">
          <Link className="min-w-0 text-[rgb(var(--foreground))] no-underline" href="/dashboard">
            <div className="text-xs font-black uppercase text-[rgb(var(--primary))]">ENVO</div>
            {!collapsed ? <><div className="text-xl font-black leading-tight">Control Center</div><div className="text-xs font-semibold text-[rgb(var(--text-muted))]">Операции без шума</div></> : null}
          </Link>
          <button aria-label="Свернуть меню" className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))]" onClick={() => setCollapsed((value) => !value)} type="button">
            <ChevronLeft className={collapsed ? "rotate-180" : ""} size={15} />
          </button>
        </div>
        <nav className="space-y-4" aria-label="Admin navigation">
          {groups.map((group) => (
            <div key={group.label}>
              {!collapsed ? <div className="mb-1 px-2 text-[10px] font-bold uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">{group.label}</div> : null}
              <div className="grid gap-0.5">
                {group.items.map((item) => (
                  <Link
                    key={`${group.label}-${item.label}`}
                    title={item.label}
                    className={`grid min-h-9 items-center gap-2 rounded-[8px] px-2 text-sm font-semibold no-underline ${collapsed ? "grid-cols-1 place-items-center" : "grid-cols-[20px_1fr]"} ${isActive(item.href) ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]"}`}
                    href={item.href}
                  >
                    {item.icon}
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-[var(--z-nav)] flex min-h-14 items-center justify-between gap-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.94)] px-5 backdrop-blur-xl">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">Admin / {currentLabel}</div>
            <div className="truncate text-sm font-black">Операционный центр ENVO</div>
          </div>
          <div className="relative flex items-center gap-2">
            <label className="hidden min-h-9 w-[390px] grid-cols-[18px_1fr] items-center gap-2 rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm text-[rgb(var(--text-muted))] lg:grid">
              <Search size={15} />
              <input className="min-w-0 border-0 bg-transparent text-sm outline-none" onChange={(event) => setQuery(event.target.value)} placeholder="Поиск: клиент, водитель, рейс, заявка" value={query} />
            </label>
            {results.length > 0 ? (
              <div className="absolute right-14 top-11 z-40 w-[420px] overflow-hidden rounded-[12px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-[var(--shadow-lg)]">
                {results.map((item) => (
                  <button key={item.href} className="block w-full border-b border-[rgb(var(--border))] px-3 py-2 text-left hover:bg-[rgb(var(--surface-muted))]" onClick={() => router.push(item.href)} type="button">
                    <span className="block text-sm font-black">{item.label}</span>
                    <span className="block text-xs text-[rgb(var(--text-muted))]">{item.detail}</span>
                  </button>
                ))}
              </div>
            ) : null}
            <button aria-label="Уведомления" className="grid h-9 w-9 place-items-center rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))]" type="button"><Bell size={16} /></button>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[rgb(var(--primary))] text-xs font-black text-[rgb(var(--primary-foreground))]">NA</div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

export function AdminPageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="m-0 text-[28px] font-black leading-tight text-[rgb(var(--foreground))]">{title}</h1>
        <p className="m-0 mt-1 max-w-[760px] text-sm font-semibold text-[rgb(var(--text-muted))]">{subtitle}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminPanel({ children, className = "", label }: { children: ReactNode; className?: string; label?: string }) {
  return <section aria-label={label} className={`min-w-0 rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-[var(--shadow-xs)] ${className}`}>{children}</section>;
}

export function AdminStatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  const classes = {
    neutral: "bg-[rgb(var(--surface-muted))] text-[rgb(var(--text-muted))]",
    success: "bg-[rgb(var(--success-soft))] text-[rgb(var(--success))]",
    warning: "bg-[rgb(var(--warning-soft))] text-[rgb(var(--warning))]",
    danger: "bg-[rgb(var(--destructive-soft))] text-[rgb(var(--destructive))]",
    info: "bg-[rgb(var(--info-soft))] text-[rgb(var(--info))]",
  };
  return <span className={`inline-flex min-h-6 items-center rounded-full px-2 text-xs font-bold ${classes[tone]}`}>{children}</span>;
}
