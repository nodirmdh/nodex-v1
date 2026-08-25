"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatUzs } from "@nodex/ui";
import { DriverCard, DriverHeader, DriverIconView, DriverPill, DriverShell } from "./driver-ui";

type SubscriptionState = "active" | "expiring" | "expired";

const subscriptionCopy = {
  active: {
    title: "Subscription active",
    status: "Active",
    tone: "success" as const,
    days: "18 days remaining",
    body: "You can publish trips and accept new passenger requests.",
    cta: "Manage",
    createEnabled: true,
  },
  expiring: {
    title: "Subscription expiring soon",
    status: "3 days left",
    tone: "warning" as const,
    days: "Renews soon",
    body: "Renew before expiry to keep publishing trips without interruption.",
    cta: "Renew",
    createEnabled: true,
  },
  expired: {
    title: "Subscription inactive",
    status: "Inactive",
    tone: "danger" as const,
    days: "Access limited",
    body: "Activate subscription to publish new trips and accept new requests.",
    cta: "Activate",
    createEnabled: false,
  },
};

const statItems = [
  ["Today", "1 trip"],
  ["Passengers", "2 confirmed"],
  ["Requests", "3 new"],
  ["Messages", "2 unread"],
];

export default function DriverHome() {
  const [subscription, setSubscription] = useState<SubscriptionState>("active");

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("subscription");
    if (next === "expired" || next === "expiring") setSubscription(next);
  }, []);

  const copy = subscriptionCopy[subscription];

  return (
    <DriverShell active="home">
      <DriverHeader
        title="Good morning"
        subtitle="Azizbek · Ready to drive"
        status={<DriverPill tone="success">Verified</DriverPill>}
      />

      <DriverCard className="mt-4 space-y-3" label="Driver subscription status">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-xs font-black uppercase tracking-[0.12em] text-[rgb(var(--primary))]">
              Nodex Driver
            </p>
            <h2 className="m-0 mt-1 text-xl font-black">{copy.title}</h2>
            <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">
              {copy.body}
            </p>
          </div>
          <DriverPill tone={copy.tone}>{copy.status}</DriverPill>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-[18px] bg-[rgb(var(--canvas))] p-3">
          <div>
            <div className="text-xs font-bold text-[rgb(var(--text-muted))]">Plan access</div>
            <div className="text-sm font-black">{copy.days}</div>
          </div>
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline"
            href={`/subscription?state=${subscription}`}
          >
            {copy.cta}
          </Link>
        </div>
      </DriverCard>

      <DriverCard className="mt-3 space-y-3" label="Next driver trip">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-black">Nukus → Urgench</h2>
            <p className="m-0 mt-1 flex items-center gap-1 text-sm font-semibold text-[rgb(var(--text-muted))]">
              <DriverIconView name="clock" className="h-4 w-4" />
              Tomorrow, 08:30
            </p>
          </div>
          <DriverPill tone="info">Next trip</DriverPill>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-[18px] bg-[rgb(var(--canvas))] p-2.5">
          <div className="min-w-0">
            <div className="truncate text-sm font-black">Chevrolet Cobalt · 95 A 214 QA</div>
            <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">
              2 confirmed / 4 seats · 1 pending
            </div>
          </div>
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline"
            href="/trip-demo"
          >
            View
          </Link>
        </div>
      </DriverCard>

      <DriverCard
        className={
          copy.createEnabled
            ? "mt-3 space-y-3"
            : "mt-3 space-y-3 ring-1 ring-[rgb(var(--warning)/0.2)]"
        }
        label="Create trip access"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]">
            <DriverIconView name={copy.createEnabled ? "route" : "lock"} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="m-0 text-lg font-black">Create trip</h2>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              {copy.createEnabled
                ? "Publish a new route when your vehicle and plan are ready."
                : "Blocked until subscription is active."}
            </p>
          </div>
        </div>
        {copy.createEnabled ? (
          <Link
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline shadow-[var(--shadow-md)]"
            href="/trips"
          >
            + Create trip
          </Link>
        ) : (
          <Link
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[rgb(var(--warning-soft))] px-4 text-sm font-black text-[rgb(var(--warning))] no-underline"
            href="/subscription?state=expired"
          >
            Activate subscription to create trips
          </Link>
        )}
      </DriverCard>

      <DriverCard className="mt-3 space-y-3" label="New passenger requests">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-black">3 new seat requests</h2>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Review before accepting passengers.
            </p>
          </div>
          <DriverPill tone="warning">New</DriverPill>
        </div>
        <div className="rounded-[18px] bg-[rgb(var(--canvas))] p-2.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-black">Nodex Client</div>
              <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">
                Front passenger · Nukus to Urgench
              </div>
            </div>
            <DriverPill tone={copy.createEnabled ? "accent" : "warning"}>
              {copy.createEnabled ? formatUzs(8500000) : "Locked"}
            </DriverPill>
          </div>
        </div>
        <Link
          className={[
            "inline-flex min-h-11 w-full items-center justify-center rounded-full px-4 text-sm font-black no-underline",
            copy.createEnabled
              ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
              : "bg-[rgb(var(--warning-soft))] text-[rgb(var(--warning))]",
          ].join(" ")}
          href={copy.createEnabled ? "/passengers-demo" : "/subscription?state=expired"}
        >
          {copy.createEnabled ? "Review requests" : "Activate to accept new requests"}
        </Link>
      </DriverCard>

      <section className="mt-3 grid grid-cols-4 gap-2" aria-label="Driver quick status">
        {statItems.map(([label, value]) => (
          <div
            key={label}
            className="rounded-[18px] bg-[rgb(var(--surface)/0.8)] p-2 shadow-[var(--shadow-xs)]"
          >
            <div className="text-[11px] font-bold text-[rgb(var(--text-muted))]">{label}</div>
            <div className="mt-1 text-xs font-black">{value}</div>
          </div>
        ))}
      </section>
    </DriverShell>
  );
}
