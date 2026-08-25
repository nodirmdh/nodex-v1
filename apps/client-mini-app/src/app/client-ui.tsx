import Link from "next/link";
import type { ReactNode } from "react";

export type ClientNavKey = "home" | "trips" | "messages" | "profile";
export type ClientIcon =
  | "back"
  | "bell"
  | "car"
  | "chat"
  | "check"
  | "clock"
  | "help"
  | "home"
  | "profile"
  | "review"
  | "shield"
  | "star"
  | "ticket"
  | "warning";

const iconPaths: Record<ClientIcon, ReactNode> = {
  back: <path d="m15 6-6 6 6 6" />,
  bell: <path d="M8 17h8M9 17a3 3 0 0 0 6 0M6 14h12l-1.6-2.2V8.8a4.4 4.4 0 0 0-8.8 0v3L6 14Z" />,
  car: (
    <path d="M5 14h14l-1.8-4.2A2 2 0 0 0 15.4 8H8.6a2 2 0 0 0-1.8 1.2L5 14Zm1 0v4m12-4v4M7.5 18h.1m8.8 0h.1" />
  ),
  chat: <path d="M5 18v-4.5A7.5 7.5 0 1 1 9.5 20H6.8A1.8 1.8 0 0 1 5 18Z" />,
  check: <path d="m5 12 4 4L19 6" />,
  clock: <path d="M12 6v6l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  help: (
    <path d="M12 18h.01M9.1 9a3 3 0 1 1 4.9 2.3c-.9.7-1.7 1.2-1.9 2.7M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  ),
  home: <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-5v-5h-4v5H5a1 1 0 0 1-1-1v-7.5Z" />,
  profile: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" />,
  review: <path d="m12 4 2.2 4.7 5.1.6-3.8 3.5 1 5-4.5-2.5-4.5 2.5 1-5-3.8-3.5 5.1-.6L12 4Z" />,
  shield: <path d="M12 3 5 6v5c0 4.2 2.8 7.6 7 10 4.2-2.4 7-5.8 7-10V6l-7-3Z" />,
  star: <path d="m12 4 2.2 4.7 5.1.6-3.8 3.5 1 5-4.5-2.5-4.5 2.5 1-5-3.8-3.5 5.1-.6L12 4Z" />,
  ticket: <path d="M5 7h14v3a2 2 0 0 0 0 4v3H5v-3a2 2 0 0 0 0-4V7Z" />,
  warning: (
    <path d="M12 8v5m0 4h.01M10.3 4.7 2.8 18a1.5 1.5 0 0 0 1.3 2.2h15.8a1.5 1.5 0 0 0 1.3-2.2L13.7 4.7a2 2 0 0 0-3.4 0Z" />
  ),
};

export function Icon({ name, className = "" }: { name: ClientIcon; className?: string }) {
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

export function ClientShell({ active, children }: { active: ClientNavKey; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      <div className="mx-auto min-h-screen max-w-[430px] bg-[linear-gradient(180deg,rgb(var(--surface-tint))_0%,rgb(var(--background))_28%,rgb(var(--canvas))_100%)] px-4 pb-24 pt-3">
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
          aria-label="Back"
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
              ? "m-0 truncate text-[24px] font-black leading-none"
              : "m-0 truncate text-3xl font-black leading-none"
          }
        >
          {title}
        </h1>
        <p className="m-0 mt-1 truncate text-sm font-semibold text-[rgb(var(--text-muted))]">
          {subtitle}
        </p>
      </div>
      {action ?? (
        <Link
          aria-label="Notifications"
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
    { key: "home", label: "Home", href: "/", icon: "home" },
    { key: "trips", label: "Trips", href: "/bookings", icon: "car" },
    { key: "messages", label: "Messages", href: "/messages", icon: "chat" },
    { key: "profile", label: "Profile", href: "/profile", icon: "profile" },
  ];

  return (
    <nav className="fixed inset-x-4 bottom-3 z-[var(--z-nav)] mx-auto max-w-[386px] rounded-full bg-[rgb(var(--surface)/0.95)] p-1 shadow-[var(--shadow-floating)] backdrop-blur-xl">
      <div className="grid grid-cols-4 gap-1">
        {items.map((item) => (
          <Link
            key={item.key}
            className={[
              "grid min-h-[48px] place-items-center rounded-full px-2 text-[10px] font-bold no-underline",
              active === item.key
                ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] shadow-[var(--shadow-sm)]"
                : "text-[rgb(var(--text-muted))]",
            ].join(" ")}
            href={item.href}
          >
            <Icon name={item.icon} className="h-4 w-4" />
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
      className={`rounded-[24px] bg-[rgb(var(--surface))] ${compact ? "p-3" : "p-4"} shadow-[var(--shadow-md)] ${className}`}
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
      className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-[11px] font-black ${subtle ? "opacity-85" : ""} ${classes[tone]}`}
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
        <span className="block truncate text-sm font-black">{title}</span>
        <span className="block truncate text-xs font-semibold text-[rgb(var(--text-muted))]">
          {subtitle}
        </span>
      </span>
      <span className="text-base font-black text-[rgb(var(--text-muted))]">›</span>
    </Link>
  );
}
