"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DriverCard, DriverHeader, DriverIconView, DriverPill, DriverShell } from "../driver-ui";

type SubscriptionState = "active" | "expiring" | "expired";

const stateCopy = {
  active: {
    title: "Subscription active",
    status: "Active",
    tone: "success" as const,
    days: "18 days remaining",
    cta: "Renew subscription",
    help: "Publishing and new request acceptance are enabled.",
  },
  expiring: {
    title: "Expiring soon",
    status: "3 days left",
    tone: "warning" as const,
    days: "Renew before 24 Aug",
    cta: "Renew now",
    help: "Operations continue. Renew to avoid access interruption.",
  },
  expired: {
    title: "Subscription expired",
    status: "Inactive",
    tone: "danger" as const,
    days: "Access limited",
    cta: "Activate subscription",
    help: "Confirmed rides remain accessible. New publishing and new request acceptance are locked.",
  },
};

export default function DriverSubscriptionPage() {
  const [state, setState] = useState<SubscriptionState>("active");

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("state");
    if (next === "expired" || next === "expiring") setState(next);
  }, []);

  const copy = stateCopy[state];
  const enabled = state !== "expired";

  return (
    <DriverShell active="profile">
      <DriverHeader
        title="Subscription"
        subtitle="Driver access and plan status"
        status={<DriverPill tone={copy.tone}>{copy.status}</DriverPill>}
      />

      <DriverCard className="mt-4 space-y-3" label="Driver subscription detail">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]">
            <DriverIconView name={enabled ? "briefcase" : "lock"} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-xs font-black uppercase tracking-[0.12em] text-[rgb(var(--primary))]">
              Nodex Driver
            </p>
            <h1 className="m-0 mt-1 text-2xl font-black">{copy.title}</h1>
            <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">
              {copy.help}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[18px] bg-[rgb(var(--canvas))] p-3">
            <div className="text-xs font-bold text-[rgb(var(--text-muted))]">Started</div>
            <div className="text-sm font-black">6 Aug 2026</div>
          </div>
          <div className="rounded-[18px] bg-[rgb(var(--surface-tint))] p-3">
            <div className="text-xs font-bold text-[rgb(var(--text-muted))]">Expires</div>
            <div className="text-sm font-black">
              {state === "expired" ? "3 Aug 2026" : "24 Aug 2026"}
            </div>
          </div>
        </div>
        <div className="rounded-[18px] bg-[rgb(var(--canvas))] p-3">
          <div className="text-xs font-bold text-[rgb(var(--text-muted))]">Access window</div>
          <div className="mt-1 text-lg font-black">{copy.days}</div>
        </div>
        <button
          className="min-h-12 w-full rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))]"
          type="button"
        >
          {copy.cta}
        </button>
      </DriverCard>

      <DriverCard className="mt-3 space-y-3" label="Driver subscription access rules">
        <h2 className="m-0 text-lg font-black">Access rules</h2>
        {[
          ["Publish trips", enabled],
          ["Accept passenger requests", enabled],
          ["Message confirmed passengers", true],
          ["Finish confirmed rides", true],
          ["Manage vehicle and profile", true],
        ].map(([label, allowed]) => (
          <div
            key={label as string}
            className="flex items-center justify-between gap-3 rounded-[16px] bg-[rgb(var(--canvas))] p-2.5"
          >
            <span className="text-sm font-black">{label}</span>
            <DriverPill tone={allowed ? "success" : "warning"}>
              {allowed ? "Enabled" : "Locked"}
            </DriverPill>
          </div>
        ))}
      </DriverCard>

      <DriverCard className="mt-3 space-y-3" label="Subscription history">
        <h2 className="m-0 text-lg font-black">History</h2>
        <div className="grid gap-2">
          {[
            ["Nodex Driver", "6 Aug 2026", "Active period"],
            ["Nodex Driver", "6 Jul 2026", "Completed period"],
          ].map(([plan, date, label]) => (
            <div
              key={`${plan}-${date}`}
              className="flex items-center justify-between gap-3 rounded-[16px] bg-[rgb(var(--canvas))] p-2.5"
            >
              <div>
                <div className="text-sm font-black">{plan}</div>
                <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">{date}</div>
              </div>
              <DriverPill tone="accent">{label}</DriverPill>
            </div>
          ))}
        </div>
      </DriverCard>

      <Link
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[rgb(var(--canvas))] px-4 text-sm font-black text-[rgb(var(--primary))] no-underline"
        href="/"
      >
        Back to driver home
      </Link>
    </DriverShell>
  );
}
