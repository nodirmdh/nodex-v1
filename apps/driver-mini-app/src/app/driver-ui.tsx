import Link from "next/link";
import type { ReactNode } from "react";

export type DriverNavKey = "home" | "trips" | "requests" | "messages" | "profile";
export type DriverIcon =
  | "bell"
  | "briefcase"
  | "car"
  | "chat"
  | "check"
  | "clock"
  | "home"
  | "lock"
  | "profile"
  | "route"
  | "shield"
  | "ticket"
  | "warning";

const iconPaths: Record<DriverIcon, ReactNode> = {
  bell: <path d="M8 17h8M9 17a3 3 0 0 0 6 0M6 14h12l-1.6-2.2V8.8a4.4 4.4 0 0 0-8.8 0v3L6 14Z" />,
  briefcase: (
    <path d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7m-9 4h12M5 7h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7Z" />
  ),
  car: (
    <path d="M5 14h14l-1.8-4.2A2 2 0 0 0 15.4 8H8.6a2 2 0 0 0-1.8 1.2L5 14Zm1 0v4m12-4v4M7.5 18h.1m8.8 0h.1" />
  ),
  chat: <path d="M5 18v-4.5A7.5 7.5 0 1 1 9.5 20H6.8A1.8 1.8 0 0 1 5 18Z" />,
  check: <path d="m5 12 4 4L19 6" />,
  clock: <path d="M12 6v6l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  home: <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-5v-5h-4v5H5a1 1 0 0 1-1-1v-7.5Z" />,
  lock: <path d="M7 11V8a5 5 0 0 1 10 0v3m-11 0h12v9H6v-9Z" />,
  profile: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" />,
  route: <path d="M6 6h.01M18 18h.01M6 6c8 0 12 2 12 6s-4 6-12 6" />,
  shield: <path d="M12 3 5 6v5c0 4.2 2.8 7.6 7 10 4.2-2.4 7-5.8 7-10V6l-7-3Z" />,
  ticket: <path d="M5 7h14v3a2 2 0 0 0 0 4v3H5v-3a2 2 0 0 0 0-4V7Z" />,
  warning: (
    <path d="M12 8v5m0 4h.01M10.3 4.7 2.8 18a1.5 1.5 0 0 0 1.3 2.2h15.8a1.5 1.5 0 0 0 1.3-2.2L13.7 4.7a2 2 0 0 0-3.4 0Z" />
  ),
};

export function DriverIconView({ name, className = "" }: { name: DriverIcon; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height="18"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="18"
    >
      {iconPaths[name]}
    </svg>
  );
}

export function DriverShell({ active, children }: { active: DriverNavKey; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      <div className="mx-auto min-h-screen max-w-[430px] bg-[linear-gradient(180deg,rgb(var(--surface-tint))_0%,rgb(var(--background))_26%,rgb(var(--canvas))_100%)] px-4 pb-24 pt-3">
        {children}
      </div>
      <DriverBottomNav active={active} />
    </main>
  );
}

export function DriverHeader({
  title,
  subtitle,
  status,
}: {
  title: string;
  subtitle: string;
  status?: ReactNode;
}) {
  return (
    <header className="flex min-h-[58px] items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="m-0 text-xs font-black uppercase tracking-[0.12em] text-[rgb(var(--primary))]">
          Nodex Driver
        </p>
        <h1 className="m-0 truncate text-2xl font-black leading-none">{title}</h1>
        <p className="m-0 mt-1 truncate text-sm font-semibold text-[rgb(var(--text-muted))]">
          {subtitle}
        </p>
      </div>
      {status}
      <Link
        aria-label="Notifications"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[rgb(var(--surface)/0.94)] text-[rgb(var(--primary))] shadow-[var(--shadow-xs)]"
        href="/notifications"
      >
        <DriverIconView name="bell" />
      </Link>
    </header>
  );
}

export function DriverBottomNav({ active }: { active: DriverNavKey }) {
  const items: Array<{ key: DriverNavKey; label: string; href: string; icon: DriverIcon }> = [
    { key: "home", label: "Home", href: "/", icon: "home" },
    { key: "trips", label: "Trips", href: "/trips", icon: "route" },
    { key: "requests", label: "Requests", href: "/passengers-demo", icon: "ticket" },
    { key: "messages", label: "Messages", href: "/messages", icon: "chat" },
    { key: "profile", label: "Profile", href: "/profile", icon: "profile" },
  ];

  return (
    <nav className="fixed inset-x-3 bottom-3 z-[var(--z-nav)] mx-auto max-w-[404px] rounded-full bg-[rgb(var(--surface)/0.95)] p-1 shadow-[var(--shadow-floating)] backdrop-blur-xl">
      <div className="grid grid-cols-5 gap-0.5">
        {items.map((item) => (
          <Link
            key={item.key}
            className={[
              "grid min-h-[48px] place-items-center rounded-full px-1 text-[9px] font-bold no-underline",
              active === item.key
                ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] shadow-[var(--shadow-sm)]"
                : "text-[rgb(var(--text-muted))]",
            ].join(" ")}
            href={item.href}
          >
            <DriverIconView name={item.icon} className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function DriverCard({
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
      className={`rounded-[22px] bg-[rgb(var(--surface))] p-3 shadow-[var(--shadow-md)] ${className}`}
    >
      {children}
    </section>
  );
}

export function DriverPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info" | "accent";
}) {
  const classes = {
    neutral: "bg-[rgb(var(--canvas))] text-[rgb(var(--text-muted))]",
    success: "bg-[rgb(var(--success-soft))] text-[rgb(var(--success))]",
    warning: "bg-[rgb(var(--warning-soft))] text-[rgb(var(--warning))]",
    danger: "bg-[rgb(var(--destructive-soft))] text-[rgb(var(--destructive))]",
    info: "bg-[rgb(var(--info-soft))] text-[rgb(var(--info))]",
    accent: "bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]",
  };

  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-[11px] font-black ${classes[tone]}`}
    >
      {children}
    </span>
  );
}
