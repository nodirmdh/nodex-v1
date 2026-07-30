import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";

export function cn(...inputs: Array<string | false | null | undefined>) {
  return clsx(inputs);
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 text-sm font-semibold transition",
        variant === "primary" &&
          "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] shadow-[var(--shadow-soft)]",
        variant === "secondary" &&
          "border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-[rgb(var(--foreground))]",
        variant === "ghost" && "text-[rgb(var(--foreground))] hover:bg-[rgb(var(--surface-muted))]",
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
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  return (
    <span
      className={cn(
        "status-chip",
        tone === "success" &&
          "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300",
        tone === "warning" &&
          "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        tone === "danger" && "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
        tone === "info" && "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
        tone === "neutral" &&
          "border-[rgb(var(--border))] bg-[rgb(var(--surface-muted))] text-[rgb(var(--foreground))]",
        className,
      )}
      {...props}
    />
  );
}

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <section className={cn("surface rounded-[var(--radius-lg)] p-4", className)} {...props} />;
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
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[rgb(var(--border))] p-6 text-center">
      <h3 className="m-0 text-base font-semibold">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">{body}</p>
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
