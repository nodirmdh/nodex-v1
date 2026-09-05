import Link from "next/link";
import { EnvoIcon } from "@nodex/ui";
import type { EnvoIconName } from "@nodex/ui";
import type { ReactNode } from "react";

export type ClientNavKey = "home" | "trips" | "messages" | "profile";
export type ClientIcon =
  | EnvoIconName
  | "bell"
  | "car"
  | "chat"
  | "clock"
  | "help"
  | "review"
  | "shield"
  | "star"
  | "users"
  | "warning";

const clientIconAliases: Partial<Record<ClientIcon, EnvoIconName>> = {
  bell: "notification",
  car: "vehicle",
  chat: "message",
  clock: "time",
  help: "support",
  review: "favorite",
  shield: "safety",
  star: "favorite",
  users: "passenger",
  warning: "emergency",
};

export function Icon({ name, className = "" }: { name: ClientIcon; className?: string }) {
  const iconName = (clientIconAliases[name] ?? name) as EnvoIconName;
  return <EnvoIcon name={iconName} className={className} />;
}
export function ClientShell({ active, children }: { active: ClientNavKey; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      <div className="mx-auto min-h-screen max-w-[430px] bg-[linear-gradient(180deg,rgb(var(--surface-tint))_0%,rgb(var(--background))_22%,rgb(var(--canvas))_100%)] px-5 pb-24 pt-4">
        {children}
      </div>
      <ClientBottomNav active={active} />
    </main>
  );
}

export function ClientHeader({
  title,
  subtitle,
  backHref,
  action,
  level,
}: {
  title: string;
  subtitle: string;
  backHref?: string;
  action?: ReactNode;
  level?: "primary" | "secondary";
}) {
  const secondary = level === "secondary" || Boolean(backHref);

  return (
    <header
      className={
        secondary ? "flex min-h-[50px] items-center gap-3" : "flex min-h-[60px] items-center gap-3"
      }
    >
      {backHref ? (
        <Link
          aria-label="Назад"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[rgb(var(--surface)/0.94)] text-[rgb(var(--foreground))] shadow-[var(--shadow-xs)]"
          href={backHref}
        >
          <Icon name="back" />
        </Link>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1
          className={
            secondary
              ? "m-0 truncate text-[23px] font-semibold leading-tight"
              : "m-0 truncate text-[30px] font-semibold leading-tight"
          }
        >
          {title}
        </h1>
        <p className="m-0 mt-1 truncate text-sm font-medium text-[rgb(var(--text-muted))]">
          {subtitle}
        </p>
      </div>
      {action ?? (
        <Link
          aria-label="Уведомления"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[rgb(var(--surface)/0.94)] text-[rgb(var(--primary))] shadow-[var(--shadow-xs)]"
          href="/notifications"
        >
          <Icon name="bell" />
        </Link>
      )}
    </header>
  );
}

export function ClientBottomNav({ active }: { active: ClientNavKey }) {
  const items: Array<{ key: ClientNavKey; label: string; href: string; icon: ClientIcon }> = [
    { key: "home", label: "Главная", href: "/", icon: "home" },
    { key: "trips", label: "Поездки", href: "/bookings", icon: "car" },
    { key: "messages", label: "Сообщения", href: "/messages", icon: "chat" },
    { key: "profile", label: "Профиль", href: "/profile", icon: "profile" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[var(--z-nav)] mx-auto max-w-[430px] border-t border-[rgb(var(--border)/0.55)] bg-[rgb(var(--surface)/0.98)] px-3 pb-[calc(0.45rem+var(--safe-bottom))] pt-2 backdrop-blur-xl">
      <div className="grid grid-cols-4 gap-1">
        {items.map((item) => (
          <Link
            key={item.key}
            className={[
              "grid min-h-[52px] place-items-center rounded-[18px] px-2 text-[11px] font-semibold no-underline transition",
              active === item.key
                ? "bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]"
                : "text-[rgb(var(--text-muted))]",
            ].join(" ")}
            href={item.href}
          >
            <Icon name={item.icon} className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function Card({
  children,
  className = "",
  label,
  compact = false,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
  compact?: boolean;
}) {
  return (
    <section
      aria-label={label}
      className={`rounded-[22px] bg-[rgb(var(--surface))] ${compact ? "p-3" : "p-4"} shadow-[var(--shadow-sm)] ${className}`}
    >
      {children}
    </section>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
  subtle = false,
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info" | "accent";
  subtle?: boolean;
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
      className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-[11px] font-semibold ${subtle ? "opacity-85" : ""} ${classes[tone]}`}
    >
      {children}
    </span>
  );
}

export function Avatar({ name, tone = "accent" }: { name: string; tone?: "accent" | "neutral" }) {
  return (
    <span
      className={[
        "grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-black",
        tone === "accent"
          ? "bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]"
          : "bg-[rgb(var(--canvas))] text-[rgb(var(--text-muted))]",
      ].join(" ")}
    >
      {name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)}
    </span>
  );
}

export function SettingsRow({
  icon,
  title,
  subtitle,
  href,
}: {
  icon: ClientIcon;
  title: string;
  subtitle: string;
  href: string;
}) {
  return (
    <Link
      className="flex min-h-[56px] items-center gap-3 rounded-[18px] px-1 py-1.5 text-[rgb(var(--foreground))] no-underline"
      href={href}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]">
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs font-medium text-[rgb(var(--text-muted))]">
          {subtitle}
        </span>
      </span>
      <span className="text-base font-black text-[rgb(var(--text-muted))]">›</span>
    </Link>
  );
}
