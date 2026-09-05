import Link from "next/link";
import { EnvoIcon } from "@nodex/ui";
import type { EnvoIconName } from "@nodex/ui";
import type { ReactNode } from "react";

export type DriverNavKey = "home" | "trips" | "requests" | "messages" | "profile";
export type DriverIcon = EnvoIconName | "bell" | "briefcase" | "car" | "chat" | "clock" | "lock" | "shield";

const driverIconAliases: Partial<Record<DriverIcon, EnvoIconName>> = {
  bell: "notification",
  briefcase: "request",
  car: "vehicle",
  chat: "message",
  clock: "time",
  lock: "protection",
  shield: "safety",
};

export function DriverIconView({ name, className = "" }: { name: DriverIcon; className?: string }) {
  const iconName = (driverIconAliases[name] ?? name) as EnvoIconName;
  return <EnvoIcon name={iconName} className={className} />;
}
export function DriverShell({ active, children }: { active: DriverNavKey; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      <div className="mx-auto min-h-screen max-w-[430px] bg-[linear-gradient(180deg,rgb(var(--surface-tint))_0%,rgb(var(--background))_26%,rgb(var(--canvas))_100%)] px-5 pb-24 pt-4">
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
        <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">
          ENVO Driver
        </p>
        <h1 className="m-0 truncate text-2xl font-semibold leading-tight">{title}</h1>
        <p className="m-0 mt-1 truncate text-sm font-semibold text-[rgb(var(--text-muted))]">
          {subtitle}
        </p>
      </div>
      {status}
      <Link
        aria-label="Уведомления"
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
    { key: "home", label: "Главная", href: "/", icon: "home" },
    { key: "trips", label: "Поездки", href: "/trips", icon: "route" },
    { key: "requests", label: "Заявки", href: "/passengers-demo", icon: "ticket" },
    { key: "messages", label: "Сообщения", href: "/messages", icon: "chat" },
    { key: "profile", label: "Профиль", href: "/profile", icon: "profile" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[var(--z-nav)] mx-auto max-w-[430px] border-t border-[rgb(var(--border)/0.55)] bg-[rgb(var(--surface)/0.98)] px-3 pb-[calc(0.45rem+var(--safe-bottom))] pt-2 backdrop-blur-xl">
      <div className="grid grid-cols-5 gap-0.5">
        {items.map((item) => (
          <Link
            key={item.key}
            className={[
              "grid min-h-[52px] place-items-center rounded-[18px] px-1 text-[9px] font-medium no-underline",
              active === item.key
                ? "bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]"
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
      className={`rounded-[22px] bg-[rgb(var(--surface))] p-3 shadow-[var(--shadow-sm)] ${className}`}
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
      className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-[11px] font-semibold ${classes[tone]}`}
    >
      {children}
    </span>
  );
}
