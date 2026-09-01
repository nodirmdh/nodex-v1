"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  BarChart3,
  Bell,
  Car,
  CreditCard,
  Headphones,
  LayoutDashboard,
  MessageSquare,
  Package,
  Route,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Ticket,
  UserCheck,
  Users,
} from "lucide-react";

type NavItem = { label: string; href: string; icon: ReactNode };

const groups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/", icon: <LayoutDashboard size={15} /> }],
  },
  {
    label: "Operations",
    items: [
      { label: "Drivers", href: "/drivers", icon: <Users size={15} /> },
      { label: "Vehicles", href: "/vehicles", icon: <Car size={15} /> },
      { label: "Routes", href: "/routes", icon: <Route size={15} /> },
      { label: "Trips", href: "/trips", icon: <Ticket size={15} /> },
      { label: "Seat Requests", href: "/bookings", icon: <UserCheck size={15} /> },
      { label: "Matching", href: "/matching", icon: <Star size={15} /> },
      { label: "Parcels", href: "/parcels", icon: <Package size={15} /> },
    ],
  },
  {
    label: "Communication",
    items: [
      { label: "Messages", href: "/communications", icon: <MessageSquare size={15} /> },
      { label: "Support", href: "/support", icon: <Headphones size={15} /> },
    ],
  },
  {
    label: "Trust & Safety",
    items: [
      { label: "Verification", href: "/verification", icon: <ShieldCheck size={15} /> },
      { label: "Reviews", href: "/trust-safety?view=reviews", icon: <Star size={15} /> },
      { label: "Safety", href: "/trust-safety?view=safety", icon: <ShieldCheck size={15} /> },
    ],
  },
  {
    label: "Business",
    items: [
      {
        label: "Subscriptions",
        href: "/finance?view=subscriptions",
        icon: <CreditCard size={15} />,
      },
      { label: "Finance", href: "/finance?view=finance", icon: <CreditCard size={15} /> },
      { label: "Analytics", href: "/analytics", icon: <BarChart3 size={15} /> },
    ],
  },
  {
    label: "System",
    items: [{ label: "Settings", href: "/design-system", icon: <Settings size={15} /> }],
  },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [currentSearch, setCurrentSearch] = useState("");

  useEffect(() => {
    setCurrentSearch(window.location.search);
  }, [pathname]);

  const isActive = (href: string) => {
    const [hrefPath = href, hrefSearch = ""] = href.split("?");
    if (hrefSearch) {
      return pathname === hrefPath && currentSearch === `?${hrefSearch}`;
    }
    return hrefPath === "/" ? pathname === "/" : pathname === hrefPath;
  };

  return (
    <div className="admin-shell min-h-screen bg-[rgb(var(--canvas))] text-[rgb(var(--foreground))]">
      <aside className="admin-sidebar border-r border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.96)] px-3 py-4">
        <div className="mb-4 px-2">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-[rgb(var(--primary))]">
            Nodex
          </div>
          <div className="text-xl font-black leading-tight">Nodex Admin</div>
          <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">
            Operations console
          </div>
        </div>
        <nav className="space-y-4" aria-label="Admin navigation">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="mb-1 px-2 text-[10px] font-black uppercase tracking-[0.12em] text-[rgb(var(--text-muted))]">
                {group.label}
              </div>
              <div className="grid gap-0.5">
                {group.items.map((item) => (
                  <Link
                    key={`${group.label}-${item.label}`}
                    className={[
                      "grid min-h-9 grid-cols-[18px_1fr] items-center gap-2 rounded-[10px] px-2 text-sm font-semibold no-underline",
                      isActive(item.href)
                        ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                        : "text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))] hover:text-[rgb(var(--foreground))]",
                    ].join(" ")}
                    href={item.href}
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-[var(--z-nav)] flex min-h-14 items-center justify-between gap-4 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.9)] px-5 backdrop-blur-xl">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">
              Operations /{" "}
              {pathname === "/" ? "Dashboard" : pathname.split("/").filter(Boolean).join(" / ")}
            </div>
            <div className="truncate text-sm font-black">Modern mobility operations console</div>
          </div>
          <div className="flex items-center gap-2">
            <label className="hidden min-h-9 w-[320px] grid-cols-[18px_1fr] items-center gap-2 rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm text-[rgb(var(--text-muted))] lg:grid">
              <Search size={15} />
              <input
                className="min-w-0 border-0 bg-transparent text-sm outline-none"
                placeholder="Search driver, phone, plate"
              />
            </label>
            <button
              aria-label="Notifications"
              className="grid h-9 w-9 place-items-center rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))]"
              type="button"
            >
              <Bell size={16} />
            </button>
            <button
              aria-label="Open command palette"
              className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black"
              type="button"
            >
              ⌘K
            </button>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[rgb(var(--primary))] text-xs font-black text-[rgb(var(--primary-foreground))]">
              NA
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

export function AdminPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="m-0 text-[30px] font-black leading-tight">{title}</h1>
        <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">{subtitle}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function AdminPanel({
  children,
  className = "",
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <section
      aria-label={label}
      className={`rounded-[14px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-[var(--shadow-xs)] ${className}`}
    >
      {children}
    </section>
  );
}

export function AdminStatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const classes = {
    neutral: "bg-[rgb(var(--surface-muted))] text-[rgb(var(--text-muted))]",
    success: "bg-[rgb(var(--success-soft))] text-[rgb(var(--success))]",
    warning: "bg-[rgb(var(--warning-soft))] text-[rgb(var(--warning))]",
    danger: "bg-[rgb(var(--destructive-soft))] text-[rgb(var(--destructive))]",
    info: "bg-[rgb(var(--info-soft))] text-[rgb(var(--info))]",
  };
  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-full px-2 text-xs font-black ${classes[tone]}`}
    >
      {children}
    </span>
  );
}
