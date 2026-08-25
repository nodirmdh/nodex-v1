"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUzs } from "@nodex/ui";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "../admin-shell";

type View = "subscriptions" | "finance";
type SubscriptionStatus = "Active" | "Expiring soon" | "Expired" | "Pending renewal";

const subscriptions = [
  {
    id: "SUB-301",
    driver: "Azizbek Karimov",
    plan: "Monthly Pro",
    start: "2026-08-01",
    expiry: "2026-08-31",
    remaining: "10 days",
    status: "Active" as SubscriptionStatus,
    event: "Renewed by admin audit",
    vehicle: "Chevrolet Cobalt · approved",
  },
  {
    id: "SUB-299",
    driver: "Madina Yusupova",
    plan: "Monthly Pro",
    start: "2026-07-25",
    expiry: "2026-08-24",
    remaining: "3 days",
    status: "Expiring soon" as SubscriptionStatus,
    event: "Renewal reminder sent",
    vehicle: "Chevrolet Tracker · approved",
  },
  {
    id: "SUB-288",
    driver: "Sherzod Rakhimov",
    plan: "Monthly Pro",
    start: "2026-07-01",
    expiry: "2026-07-31",
    remaining: "Expired",
    status: "Expired" as SubscriptionStatus,
    event: "Publish access restricted",
    vehicle: "Kia K5 · approved",
  },
];

const revenueRows = [
  { day: "Aug 18", renewals: 8, revenueMinor: 240000000 },
  { day: "Aug 19", renewals: 11, revenueMinor: 330000000 },
  { day: "Aug 20", renewals: 9, revenueMinor: 270000000 },
  { day: "Aug 21", renewals: 13, revenueMinor: 390000000 },
];

function statusTone(status: SubscriptionStatus) {
  if (status === "Active") return "success";
  if (status === "Expiring soon" || status === "Pending renewal") return "warning";
  return "danger";
}

export default function AdminFinancePage() {
  const [view, setView] = useState<View>("finance");
  const [selectedId, setSelectedId] = useState(subscriptions[0]!.id);
  const selected = useMemo(
    () => subscriptions.find((subscription) => subscription.id === selectedId) ?? subscriptions[0]!,
    [selectedId],
  );

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("view") === "subscriptions") {
      setView("subscriptions");
    }
  }, []);

  return (
    <main className="p-5">
      <AdminPageHeader
        title={view === "subscriptions" ? "Driver subscriptions" : "Finance"}
        subtitle={
          view === "subscriptions"
            ? "Primary platform monetization: subscription access for drivers, renewal health, and expiry rules."
            : "Platform business finance centered on driver subscriptions, renewals, expirations, and audit."
        }
        actions={
          <div className="flex gap-2">
            <button
              className={[
                "rounded-[10px] px-3 py-2 text-sm font-black",
                view === "subscriptions"
                  ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                  : "border border-[rgb(var(--border))] bg-[rgb(var(--surface))]",
              ].join(" ")}
              onClick={() => setView("subscriptions")}
              type="button"
            >
              Subscriptions
            </button>
            <button
              className={[
                "rounded-[10px] px-3 py-2 text-sm font-black",
                view === "finance"
                  ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                  : "border border-[rgb(var(--border))] bg-[rgb(var(--surface))]",
              ].join(" ")}
              onClick={() => setView("finance")}
              type="button"
            >
              Finance
            </button>
          </div>
        }
      />

      {view === "subscriptions" ? (
        <div className="grid gap-4 min-[1380px]:grid-cols-[minmax(0,1fr)_470px]">
          <AdminPanel className="overflow-hidden" label="Driver subscription operations">
            <div className="grid gap-3 border-b border-[rgb(var(--border))] p-4 sm:grid-cols-5">
              {[
                ["Active subscriptions", "412"],
                ["Expiring 7 days", "36"],
                ["Expired", "18"],
                ["Renewals today", "13"],
                ["Est. MRR", formatUzs(12360000000)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-[116px] rounded-[12px] bg-[rgb(var(--surface-muted))] p-3"
                >
                  <div className="text-lg font-black">{value}</div>
                  <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">{label}</div>
                </div>
              ))}
            </div>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] font-black uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Driver</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Plan</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Expiry</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Remaining</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Status</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Last event</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((subscription) => (
                  <tr
                    key={subscription.id}
                    className={[
                      "cursor-pointer border-b border-[rgb(var(--border))] hover:bg-[rgb(var(--surface-muted))]",
                      selected.id === subscription.id ? "bg-[rgb(var(--info-soft))]" : "",
                    ].join(" ")}
                    onClick={() => setSelectedId(subscription.id)}
                  >
                    <td className="px-4 py-3 font-semibold">{subscription.driver}</td>
                    <td className="px-4 py-3">{subscription.plan}</td>
                    <td className="px-4 py-3">{subscription.expiry}</td>
                    <td className="px-4 py-3">{subscription.remaining}</td>
                    <td className="px-4 py-3">
                      <AdminStatusBadge tone={statusTone(subscription.status)}>
                        {subscription.status}
                      </AdminStatusBadge>
                    </td>
                    <td className="px-4 py-3 text-[rgb(var(--text-muted))]">
                      {subscription.event}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminPanel>
          <AdminPanel className="overflow-hidden" label="Subscription detail">
            <div className="border-b border-[rgb(var(--border))] p-4">
              <h2 className="m-0 text-xl font-black">{selected.driver}</h2>
              <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                {selected.plan} · {selected.vehicle}
              </p>
            </div>
            <div className="space-y-4 p-4">
              <section className="grid gap-2 text-sm">
                {[
                  ["Verification", "Approved"],
                  ["Start", selected.start],
                  ["Expiry", selected.expiry],
                  ["Remaining", selected.remaining],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-[rgb(var(--text-muted))]">{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </section>
              <section>
                <h3 className="m-0 mb-2 text-sm font-black">Expired subscription access rules</h3>
                <div className="grid gap-2 text-sm">
                  {[
                    ["Publish new trips", "Blocked when expired"],
                    ["Accept new passenger requests", "Blocked when expired"],
                    ["Already confirmed trips", "Remain operational"],
                    ["Message confirmed passengers", "Allowed"],
                    ["Finish confirmed obligations", "Allowed"],
                    ["Manage profile / vehicle", "Allowed"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex justify-between gap-4 rounded-[10px] bg-[rgb(var(--surface-muted))] px-3 py-2"
                    >
                      <span>{label}</span>
                      <strong className="text-right">{value}</strong>
                    </div>
                  ))}
                </div>
              </section>
              <div className="grid grid-cols-2 gap-2">
                {["Activate", "Renew", "Extend", "Audit"].map((action) => (
                  <button
                    key={action}
                    className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </AdminPanel>
        </div>
      ) : (
        <div className="grid gap-4 min-[1380px]:grid-cols-[minmax(0,1fr)_420px]">
          <AdminPanel className="overflow-hidden" label="Finance overview">
            <div className="grid gap-3 border-b border-[rgb(var(--border))] p-4 sm:grid-cols-4">
              {[
                ["Subscription revenue", formatUzs(390000000)],
                ["Active plans", "412"],
                ["Renewals", "13 today"],
                ["Expirations", "18 expired"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-[130px] rounded-[12px] bg-[rgb(var(--surface-muted))] p-3"
                >
                  <div className="text-lg font-black">{value}</div>
                  <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">{label}</div>
                </div>
              ))}
            </div>
            <div className="p-4">
              <h2 className="m-0 mb-3 text-base font-black">Subscription revenue timeline</h2>
              <div className="grid gap-2">
                {revenueRows.map((row) => (
                  <div
                    key={row.day}
                    className="grid grid-cols-[72px_1fr_120px] items-center gap-3 text-sm"
                  >
                    <strong>{row.day}</strong>
                    <div className="h-3 overflow-hidden rounded-full bg-[rgb(var(--surface-muted))]">
                      <div
                        className="h-full rounded-full bg-[rgb(var(--primary))]"
                        style={{ width: `${Math.min(100, row.renewals * 7)}%` }}
                      />
                    </div>
                    <span className="text-right font-black">{formatUzs(row.revenueMinor)}</span>
                  </div>
                ))}
              </div>
            </div>
          </AdminPanel>
          <AdminPanel className="space-y-4 p-4" label="Finance policy">
            <section>
              <h2 className="m-0 text-base font-black">Money model</h2>
              <p className="m-0 mt-2 text-sm text-[rgb(var(--text-muted))]">
                Platform money is driver subscription revenue. Listed ride fare is negotiated and
                paid directly between passenger and driver.
              </p>
            </section>
            <section className="rounded-[12px] border border-[rgb(var(--border))] p-3">
              <h3 className="m-0 mb-2 text-sm font-black">Operational audit log</h3>
              <div className="grid gap-2 text-sm">
                <span>Renewal recorded · SUB-301</span>
                <span>Expiry restriction applied · SUB-288</span>
                <span>Reminder sent · SUB-299</span>
              </div>
            </section>
            <section className="rounded-[12px] bg-[rgb(var(--surface-muted))] p-3">
              <strong>No passenger wallet or ride checkout revenue</strong>
              <p className="m-0 mt-1 text-sm text-[rgb(var(--text-muted))]">
                Ride fares remain informational for operations and are not platform-held balances.
              </p>
            </section>
          </AdminPanel>
        </div>
      )}
    </main>
  );
}
