import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import {
  Bell,
  Car,
  Check,
  ChevronDown,
  Circle,
  Clock,
  Home,
  Inbox,
  LayoutDashboard,
  MapPin,
  MoreHorizontal,
  Navigation,
  Search,
  Settings,
  SlidersHorizontal,
  Star,
  User,
} from "lucide-react";
import { clsx } from "clsx";

export function cn(...inputs: Array<string | false | null | undefined>) {
  return clsx(inputs);
}

export type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "accent" | "gold";

const toneClasses: Record<Tone, string> = {
  neutral:
    "border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] text-[rgb(var(--foreground))]",
  success:
    "border-[rgb(var(--success)/0.28)] bg-[rgb(var(--success-soft))] text-[rgb(var(--success))]",
  warning:
    "border-[rgb(var(--warning)/0.28)] bg-[rgb(var(--warning-soft))] text-[rgb(var(--warning))]",
  danger:
    "border-[rgb(var(--destructive)/0.28)] bg-[rgb(var(--destructive-soft))] text-[rgb(var(--destructive))]",
  info: "border-[rgb(var(--info)/0.28)] bg-[rgb(var(--info-soft))] text-[rgb(var(--info))]",
  accent:
    "border-[rgb(var(--accent)/0.28)] bg-[rgb(var(--primary-soft))] text-[rgb(var(--accent))]",
  gold: "border-[rgb(var(--gold)/0.34)] bg-[rgb(var(--gold-soft))] text-[rgb(var(--gold))]",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "accent";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border text-sm font-bold shadow-none transition duration-[var(--duration-base)] ease-[var(--ease-standard)]",
        "disabled:pointer-events-none disabled:opacity-55",
        size === "sm" && "min-h-[var(--control-sm)] px-3",
        size === "md" && "min-h-[var(--control-md)] px-4",
        size === "lg" && "min-h-[var(--control-lg)] px-5 text-base",
        variant === "primary" &&
          "border-[rgb(var(--primary))] bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] shadow-[var(--shadow-md)] hover:brightness-105 active:translate-y-px",
        variant === "secondary" &&
          "border-transparent bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))] hover:bg-[rgb(var(--primary-soft))]",
        variant === "ghost" &&
          "border-transparent bg-transparent text-[rgb(var(--foreground))] hover:bg-[rgb(var(--surface-muted))]",
        variant === "danger" &&
          "border-[rgb(var(--destructive))] bg-[rgb(var(--destructive))] text-white hover:brightness-105",
        variant === "accent" &&
          "border-[rgb(var(--accent))] bg-[rgb(var(--accent))] text-[rgb(var(--accent-foreground))] hover:brightness-105",
        className,
      )}
      {...props}
    />
  );
}

export function IconButton({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        "grid min-h-[var(--control-md)] min-w-[var(--control-md)] place-items-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--foreground))] transition hover:bg-[rgb(var(--surface-warm))]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function FieldLabel({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    // eslint-disable-next-line jsx-a11y/label-has-associated-control
    <label
      className={cn("grid gap-1.5 text-sm font-semibold text-[rgb(var(--foreground))]", className)}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-[var(--control-md)] rounded-[var(--radius-md)] border border-transparent bg-[rgb(var(--canvas))] px-4 text-sm font-semibold text-[rgb(var(--foreground))] transition placeholder:text-[rgb(var(--text-subtle))] hover:bg-[rgb(var(--surface-muted))] focus:bg-[rgb(var(--surface))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus)/0.18)]",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm text-[rgb(var(--foreground))] transition placeholder:text-[rgb(var(--text-subtle))] hover:border-[rgb(var(--border-strong))] focus:border-[rgb(var(--focus))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus)/0.18)]",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative inline-grid">
      <select
        className={cn(
          "min-h-[var(--control-md)] appearance-none rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] py-0 pl-3 pr-9 text-sm font-medium text-[rgb(var(--foreground))] transition hover:border-[rgb(var(--border-strong))] focus:border-[rgb(var(--focus))] focus:outline-none focus:ring-2 focus:ring-[rgb(var(--focus)/0.18)]",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))]"
        size={16}
      />
    </span>
  );
}

export function SearchInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden="true"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-muted))]"
        size={17}
      />
      <Input className="w-full pl-9" type="search" {...props} />
    </div>
  );
}

export function Combobox({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <button className="flex min-h-[var(--control-md)] w-full items-center justify-between rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-left text-sm transition hover:border-[rgb(var(--border-strong))]">
      <span>
        <span className="block text-xs font-semibold text-[rgb(var(--text-muted))]">{label}</span>
        <span className="block font-semibold">{value}</span>
        {hint ? <span className="block text-xs text-[rgb(var(--text-subtle))]">{hint}</span> : null}
      </span>
      <ChevronDown size={16} />
    </button>
  );
}

export function Panel({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("surface rounded-[var(--radius-lg)] p-4", className)} {...props} />;
}

export function Surface({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: "default" | "muted" | "pattern" }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border p-4",
        variant === "default" && "surface",
        variant === "muted" && "surface-muted",
        variant === "pattern" && "nodex-pattern border-[rgb(var(--border))]",
        className,
      )}
      {...props}
    />
  );
}

export function Section({
  title,
  description,
  action,
  className,
  children,
}: HTMLAttributes<HTMLElement> & {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="m-0 text-xl font-bold tracking-normal">{title}</h2>
          {description ? (
            <p className="m-0 mt-1 max-w-2xl text-sm text-[rgb(var(--text-muted))]">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function Card({
  className,
  interactive = false,
  variant = "surface",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  variant?: "surface" | "elevated" | "tinted" | "selected" | "compact";
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] bg-[rgb(var(--surface))] p-4",
        variant === "surface" && "shadow-[var(--shadow-sm)]",
        variant === "elevated" && "shadow-[var(--shadow-md)]",
        variant === "tinted" && "bg-[rgb(var(--surface-tint))] shadow-[var(--shadow-sm)]",
        variant === "selected" &&
          "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] shadow-[var(--shadow-md)]",
        variant === "compact" && "rounded-[var(--radius-md)] p-3 shadow-[var(--shadow-xs)]",
        interactive &&
          "transition duration-[var(--duration-base)] ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-floating)]",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn("status-chip", toneClasses[tone], className)} {...props} />;
}

export function StatusBadge({ status, tone = "neutral" }: { status: string; tone?: Tone }) {
  return (
    <Badge tone={tone}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </Badge>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <span
      aria-label={name}
      className={cn(
        "grid h-10 w-10 place-items-center rounded-full bg-[rgb(var(--primary-soft))] text-sm font-bold text-[rgb(var(--primary))]",
        className,
      )}
    >
      {initials || "N"}
    </span>
  );
}

export function Tabs({ items }: { items: Array<{ label: string; active?: boolean }> }) {
  return (
    <div className="inline-flex rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] p-1">
      {items.map((item) => (
        <button
          key={item.label}
          className={cn(
            "min-h-9 rounded-full px-3 text-sm font-semibold text-[rgb(var(--text-muted))] transition",
            item.active &&
              "bg-[rgb(var(--surface))] text-[rgb(var(--primary))] shadow-[var(--shadow-soft)]",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function SegmentedControl({
  items,
}: {
  items: Array<{ label: string; active?: boolean; icon?: ReactNode }>;
}) {
  return (
    <div className="grid gap-1 rounded-[var(--radius-lg)] border border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] p-1 sm:inline-grid sm:auto-cols-fr sm:grid-flow-col">
      {items.map((item) => (
        <button
          key={item.label}
          className={cn(
            "inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] px-3 text-sm font-semibold text-[rgb(var(--text-muted))] transition",
            item.active &&
              "bg-[rgb(var(--surface))] text-[rgb(var(--primary))] shadow-[var(--shadow-soft)]",
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function Sheet({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-raised)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="m-0 text-base font-bold">{title}</h3>
        <IconButton label="More">
          <MoreHorizontal size={18} />
        </IconButton>
      </div>
      {children}
    </div>
  );
}

export function BottomSheet({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-t-[24px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 pb-[calc(1rem+var(--safe-bottom))] shadow-[var(--shadow-raised)]">
      <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-[rgb(var(--border-strong))]" />
      <h3 className="m-0 text-base font-bold">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function Dialog({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-xl)] border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-5 shadow-[var(--shadow-raised)]">
      <h3 className="m-0 text-lg font-bold">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function Drawer({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="h-full rounded-l-[var(--radius-xl)] border-l border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-[var(--shadow-raised)]">
      <h3 className="m-0 text-lg font-bold">{title}</h3>
      <div className="mt-4">{children}</div>
    </aside>
  );
}

export function Popover({ children }: { children: ReactNode }) {
  return (
    <div className="w-64 rounded-[var(--radius-lg)] border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-3 shadow-[var(--shadow-raised)]">
      {children}
    </div>
  );
}

export function Tooltip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-[rgb(var(--foreground))] px-2 py-1 text-xs font-semibold text-[rgb(var(--background))]">
      {children}
    </span>
  );
}

export function DropdownMenu({ items }: { items: string[] }) {
  return (
    <div className="w-48 rounded-[var(--radius-lg)] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-1 shadow-[var(--shadow-raised)]">
      {items.map((item) => (
        <button
          key={item}
          className="block min-h-9 w-full rounded-[var(--radius-md)] px-3 text-left text-sm font-medium hover:bg-[rgb(var(--surface-muted))]"
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export function Accordion({
  items,
}: {
  items: Array<{ title: string; content: ReactNode; open?: boolean }>;
}) {
  return (
    <div className="divide-y divide-[rgb(var(--border))] rounded-[var(--radius-lg)] border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
      {items.map((item) => (
        <details key={item.title} open={item.open} className="group p-3">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold">
            {item.title}
            <ChevronDown size={16} className="transition group-open:rotate-180" />
          </summary>
          <div className="mt-2 text-sm text-[rgb(var(--text-muted))]">{item.content}</div>
        </details>
      ))}
    </div>
  );
}

export function Toast({
  title,
  body,
  tone = "success",
}: {
  title: string;
  body: string;
  tone?: Tone;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border p-3 shadow-[var(--shadow-raised)]",
        toneClasses[tone],
      )}
    >
      <div className="font-bold">{title}</div>
      <div className="text-sm opacity-80">{body}</div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-dashed border-[rgb(var(--border-strong)/0.64)] bg-[rgb(var(--surface-warm))] p-6 text-center">
      <div className="nodex-pattern mx-auto mb-4 h-16 w-16 rounded-full border border-[rgb(var(--border))]" />
      <h3 className="m-0 text-base font-bold">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[rgb(var(--text-muted))]">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))]",
        className,
      )}
    />
  );
}

export function Stat({
  label,
  value,
  trend,
  tone = "neutral",
}: {
  label: string;
  value: string;
  trend?: string;
  tone?: Tone;
}) {
  return (
    <Card className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-normal text-[rgb(var(--text-muted))]">
        {label}
      </div>
      <div className="text-2xl font-black">{value}</div>
      {trend ? <Badge tone={tone}>{trend}</Badge> : null}
    </Card>
  );
}

export function ListRow({
  title,
  meta,
  leading,
  trailing,
}: {
  title: string;
  meta?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex min-h-[var(--control-lg)] items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 hover:bg-[rgb(var(--surface-muted))]">
      {leading}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold">{title}</div>
        {meta ? <div className="truncate text-xs text-[rgb(var(--text-muted))]">{meta}</div> : null}
      </div>
      {trailing}
    </div>
  );
}

export function SettingsRow({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
}) {
  const rowProps = description
    ? { title, meta: description }
    : {
        title,
      };

  return (
    <ListRow
      {...rowProps}
      leading={
        <span className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] bg-[rgb(var(--primary-soft))] text-[rgb(var(--primary))]">
          {icon ?? <Settings size={18} />}
        </span>
      }
      trailing={<ChevronDown size={16} className="-rotate-90 text-[rgb(var(--text-muted))]" />}
    />
  );
}

export function MobileHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex min-h-16 items-center justify-between gap-3 px-1 py-3">
      <div>
        <h1 className="m-0 text-xl font-black tracking-normal">{title}</h1>
        {subtitle ? <p className="m-0 text-xs text-[rgb(var(--text-muted))]">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function DesktopPageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-6">
      <div>
        <h1 className="m-0 text-3xl font-black tracking-normal">{title}</h1>
        {subtitle ? (
          <p className="m-0 mt-1 text-sm text-[rgb(var(--text-muted))]">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}

export function BottomNavigation({
  items,
}: {
  items: Array<{ label: string; active?: boolean; icon?: ReactNode }>;
}) {
  const fallbackIcons = [Home, Inbox, Bell, User];

  return (
    <nav className="fixed inset-x-4 bottom-4 z-[var(--z-nav)] mx-auto max-w-[calc(var(--container-mobile)-32px)] rounded-full bg-[rgb(var(--surface)/0.94)] p-1.5 shadow-[var(--shadow-floating)] backdrop-blur-xl">
      <div className="grid grid-cols-4 gap-1">
        {items.map((item, index) => {
          const FallbackIcon = fallbackIcons[index] ?? Home;
          return (
            <button
              key={item.label}
              className={cn(
                "grid min-h-[52px] place-items-center rounded-[var(--radius-md)] px-2 text-[11px] font-bold text-[rgb(var(--text-muted))]",
                item.active &&
                  "rounded-full bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] shadow-[var(--shadow-sm)]",
              )}
            >
              {item.icon ?? <FallbackIcon size={18} />}
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function SidebarShell({
  groups,
}: {
  groups: Array<{ title: string; items: Array<{ label: string; active?: boolean }> }>;
}) {
  return (
    <aside className="w-64 border-r border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.86)] p-3">
      <div className="mb-5 flex items-center gap-2 px-2 py-1">
        <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-md)] bg-[rgb(var(--primary))] font-black text-[rgb(var(--primary-foreground))]">
          N
        </span>
        <span className="font-black">Nodex Admin</span>
      </div>
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.title}>
            <div className="px-2 text-[11px] font-black uppercase tracking-normal text-[rgb(var(--text-subtle))]">
              {group.title}
            </div>
            <div className="mt-1 space-y-1">
              {group.items.map((item) => (
                <button
                  key={item.label}
                  className={cn(
                    "flex min-h-9 w-full items-center gap-2 rounded-[var(--radius-md)] px-2 text-left text-sm font-semibold text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))]",
                    item.active && "bg-[rgb(var(--primary-soft))] text-[rgb(var(--primary))]",
                  )}
                >
                  <LayoutDashboard size={15} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-[var(--radius-lg)] border border-[rgb(var(--border))] bg-[rgb(var(--surface)/0.95)] p-2 shadow-[var(--shadow-soft)] backdrop-blur">
      <SlidersHorizontal size={18} className="text-[rgb(var(--text-muted))]" />
      {children}
    </div>
  );
}

export function TableToolbar({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--border))] p-3">
      <div className="font-bold">{title}</div>
      <div className="flex items-center gap-2">
        <SearchInput placeholder="Search" />
        {action}
      </div>
    </div>
  );
}

export function DetailDrawer({
  title,
  children,
  footer,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Drawer title={title}>
      <div className="space-y-3">{children}</div>
      {footer ? (
        <div className="mt-5 flex gap-2 border-t border-[rgb(var(--border))] pt-4">{footer}</div>
      ) : null}
    </Drawer>
  );
}

export function AppScreen({
  children,
  className,
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      className={cn(
        "relative min-h-[844px] overflow-hidden rounded-[32px] bg-[rgb(var(--background))] p-4 pb-28 shadow-[var(--shadow-floating)]",
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_20%_0%,rgb(var(--primary)/0.18),transparent_18rem)]" />
      <div className="relative z-10 space-y-4">{children}</div>
    </div>
  );
}

export function FloatingHeader({
  eyebrow,
  title,
  action,
  variant = "solid",
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  variant?: "solid" | "transparent" | "map";
}) {
  return (
    <header
      className={cn(
        "flex min-h-14 items-center justify-between gap-3 rounded-[var(--radius-lg)] px-1",
        variant === "solid" && "bg-transparent",
        variant === "map" &&
          "bg-[rgb(var(--surface)/0.78)] px-3 shadow-[var(--shadow-sm)] backdrop-blur-xl",
      )}
    >
      <div>
        {eyebrow ? (
          <div className="text-xs font-bold text-[rgb(var(--text-muted))]">{eyebrow}</div>
        ) : null}
        <h1 className="m-0 text-[1.55rem] font-black leading-tight tracking-normal">{title}</h1>
      </div>
      {action}
    </header>
  );
}

export function HeroCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  return (
    <Card variant="elevated" className="relative overflow-hidden rounded-[var(--radius-xl)] p-5">
      <div className="nodex-route-motif absolute inset-x-0 top-0 h-24 opacity-80" />
      <div className="relative pt-16">
        <h2 className="m-0 text-2xl font-black leading-tight">{title}</h2>
        <p className="m-0 mt-1 text-sm font-medium text-[rgb(var(--text-muted))]">{subtitle}</p>
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </Card>
  );
}

export function LocationField({
  label,
  value,
  tone = "origin",
}: {
  label: string;
  value: string;
  tone?: "origin" | "destination";
}) {
  return (
    <div className="flex min-h-[58px] items-center gap-3 rounded-[18px] bg-[rgb(var(--canvas))] px-3">
      <span
        className={cn(
          "grid h-9 w-9 place-items-center rounded-full",
          tone === "origin"
            ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
            : "bg-[rgb(var(--accent))] text-[rgb(var(--accent-foreground))]",
        )}
      >
        {tone === "origin" ? <Circle size={13} fill="currentColor" /> : <MapPin size={17} />}
      </span>
      <span>
        <span className="block text-xs font-black uppercase text-[rgb(var(--text-subtle))]">
          {label}
        </span>
        <span className="block text-base font-black">{value}</span>
      </span>
    </div>
  );
}

export function SearchCard() {
  return (
    <Card variant="elevated" className="rounded-[24px] p-3">
      <div className="grid gap-2">
        <LocationField label="From" value="Nukus" />
        <div className="relative mx-8 h-4">
          <div className="absolute left-4 top-[-8px] h-8 border-l-2 border-dashed border-[rgb(var(--primary)/0.28)]" />
        </div>
        <LocationField label="To" value="Urgench" tone="destination" />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <ActionPill icon={<Clock size={15} />} label="Tomorrow" />
        <ActionPill icon={<User size={15} />} label="2 passengers" />
      </div>
      <Button className="mt-4 w-full" size="lg">
        Search rides
      </Button>
    </Card>
  );
}

export function ActionPill({ icon, label }: { icon?: ReactNode; label: string }) {
  return (
    <span className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[rgb(var(--surface-tint))] px-3 text-sm font-bold text-[rgb(var(--primary))]">
      {icon}
      {label}
    </span>
  );
}

export function PriceBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex items-baseline rounded-full bg-[rgb(var(--primary))] px-3 py-2 text-sm font-black text-[rgb(var(--primary-foreground))] shadow-[var(--shadow-sm)]">
      {value}
    </span>
  );
}

export function SeatAvailability({ seatsLeft }: { seatsLeft: number }) {
  return (
    <Badge tone={seatsLeft <= 2 ? "warning" : "accent"}>
      {seatsLeft} {seatsLeft === 1 ? "seat" : "seats"} left
    </Badge>
  );
}

export function DriverCard({
  name,
  rating,
  trips,
  vehicle,
}: {
  name: string;
  rating: string;
  trips: string;
  vehicle: string;
}) {
  return (
    <Card variant="surface" className="flex items-center gap-3 rounded-[22px]">
      <Avatar name={name} className="h-12 w-12" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate font-black">{name}</div>
          <Badge tone="accent">
            <Check size={12} />
            Verified
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap gap-2 text-xs font-bold text-[rgb(var(--text-muted))]">
          <span className="inline-flex items-center gap-1">
            <Star size={13} fill="currentColor" /> {rating}
          </span>
          <span>{trips} trips</span>
          <span>{vehicle}</span>
        </div>
      </div>
    </Card>
  );
}

export function VehicleCard({
  model,
  meta,
  plate,
}: {
  model: string;
  meta: string;
  plate: string;
}) {
  return (
    <Card variant="tinted" className="overflow-hidden rounded-[24px]">
      <div className="flex items-center gap-4">
        <div className="relative h-20 w-28 rounded-[22px] bg-[rgb(var(--surface))] shadow-[var(--shadow-sm)]">
          <div className="absolute left-4 right-4 top-5 h-8 rounded-full bg-[rgb(var(--primary))]" />
          <div className="absolute left-7 right-7 top-3 h-7 rounded-t-full bg-[rgb(var(--accent))]" />
          <div className="absolute bottom-4 left-4 h-3 w-3 rounded-full bg-[rgb(var(--foreground))]" />
          <div className="absolute bottom-4 right-4 h-3 w-3 rounded-full bg-[rgb(var(--foreground))]" />
        </div>
        <div>
          <div className="text-lg font-black">{model}</div>
          <div className="text-sm font-medium text-[rgb(var(--text-muted))]">{meta}</div>
          <Badge className="mt-2" tone="neutral">
            {plate}
          </Badge>
        </div>
      </div>
    </Card>
  );
}

export function VehicleImage({
  src,
  alt = "Vehicle",
  className,
  fit = "contain",
}: {
  src?: string;
  alt?: string;
  className?: string;
  fit?: "contain" | "cover";
}) {
  return (
    <div
      className={cn(
        "grid aspect-[16/10] place-items-center overflow-hidden rounded-[24px] bg-[rgb(var(--surface-tint))] shadow-[var(--shadow-xs)]",
        className,
      )}
    >
      {src ? (
        <img
          alt={alt}
          className={cn("h-full w-full", fit === "contain" ? "object-contain" : "object-cover")}
          src={src}
        />
      ) : (
        <Car aria-hidden="true" className="h-10 w-10 text-[rgb(var(--primary))]" />
      )}
    </div>
  );
}

export function RouteTimeline({ from, to, time }: { from: string; to: string; time: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <div>
        <div className="text-2xl font-black">{from}</div>
        <div className="text-xs font-bold uppercase text-[rgb(var(--text-subtle))]">Origin</div>
      </div>
      <div className="flex min-w-24 items-center justify-center">
        <span className="h-2 w-2 rounded-full bg-[rgb(var(--primary))]" />
        <span className="h-px flex-1 bg-[rgb(var(--primary)/0.25)]" />
        <Navigation size={18} className="text-[rgb(var(--primary))]" />
        <span className="h-px flex-1 bg-[rgb(var(--primary)/0.25)]" />
        <span className="h-2 w-2 rounded-full bg-[rgb(var(--accent))]" />
      </div>
      <div className="text-right">
        <div className="text-2xl font-black">{to}</div>
        <div className="text-xs font-bold uppercase text-[rgb(var(--text-subtle))]">{time}</div>
      </div>
    </div>
  );
}

export function RouteCard({
  from,
  to,
  time,
  driver,
  vehicle,
  price,
  seatsLeft,
}: {
  from: string;
  to: string;
  time: string;
  driver: string;
  vehicle: string;
  price: string;
  seatsLeft: number;
}) {
  return (
    <Card interactive variant="elevated" className="rounded-[26px] p-5">
      <RouteTimeline from={from} to={to} time={time} />
      <div className="mt-5 flex items-center gap-3">
        <Avatar name={driver} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-black">{driver}</div>
          <div className="truncate text-sm font-medium text-[rgb(var(--text-muted))]">
            {vehicle}
          </div>
        </div>
        <SeatAvailability seatsLeft={seatsLeft} />
        <PriceBadge value={price} />
      </div>
    </Card>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="m-0 text-lg font-black">{title}</h2>
      {action}
    </div>
  );
}

export function ProfileRow({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] bg-[rgb(var(--surface))] p-3 shadow-[var(--shadow-xs)]">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-black">{title}</span>
        <span className="block truncate text-sm font-medium text-[rgb(var(--text-muted))]">
          {subtitle}
        </span>
      </span>
      <ChevronDown size={16} className="-rotate-90 text-[rgb(var(--text-subtle))]" />
    </div>
  );
}

export function StickyBottomAction({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-4 mt-4 bg-gradient-to-t from-[rgb(var(--background))] via-[rgb(var(--background))] to-transparent px-4 pb-[calc(1rem+var(--safe-bottom))] pt-8">
      {children}
    </div>
  );
}

export function SeatVisual({
  state = "available",
  label,
}: {
  state?: "driver" | "available" | "selected" | "occupied" | "disabled";
  label?: string;
}) {
  return (
    <button
      aria-label={label ?? state}
      className={cn(
        "relative h-16 w-14 rounded-[18px] transition duration-[var(--duration-base)]",
        "before:absolute before:inset-x-2 before:top-2 before:h-7 before:rounded-[14px] before:content-['']",
        "after:absolute after:bottom-2 after:left-1/2 after:h-6 after:w-10 after:-translate-x-1/2 after:rounded-[12px] after:content-['']",
        state === "available" &&
          "bg-[rgb(var(--surface))] shadow-[var(--shadow-sm)] before:bg-[rgb(var(--surface-tint))] after:bg-[rgb(var(--surface-muted))]",
        state === "selected" &&
          "scale-105 bg-[rgb(var(--primary))] shadow-[var(--shadow-md)] before:bg-[rgb(var(--accent))] after:bg-[rgb(var(--primary-foreground)/0.86)]",
        state === "occupied" &&
          "bg-[rgb(var(--surface-muted))] opacity-75 before:bg-[rgb(var(--border-strong)/0.45)] after:bg-[rgb(var(--border-strong)/0.35)]",
        state === "disabled" &&
          "bg-[rgb(var(--surface-muted))] opacity-45 before:bg-[rgb(var(--border))] after:bg-[rgb(var(--border))]",
        state === "driver" &&
          "bg-[rgb(var(--foreground))] text-[rgb(var(--background))] before:bg-[rgb(var(--text-muted))] after:bg-[rgb(var(--surface))]",
      )}
    >
      {label ? (
        <span
          className={cn(
            "absolute inset-x-0 bottom-1 z-10 text-center text-[10px] font-black",
            state === "selected" && "text-[rgb(var(--primary))]",
          )}
        >
          {label}
        </span>
      ) : null}
    </button>
  );
}
