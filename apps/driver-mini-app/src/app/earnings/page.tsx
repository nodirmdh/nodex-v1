"use client";

import { useEffect, useState } from "react";
import { AppHeader, Badge, BottomNav, Button, Panel, formatUzs } from "@nodex/ui";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3103";

type EarningsResponse = {
  summary: { pendingMinor: string; availableMinor: string; paidMinor: string };
  earnings: Array<{
    id: string;
    status: string;
    netMinor: string;
    currency: string;
    createdAt: string;
  }>;
  settlements: Array<{ id: string; status: string; expectedMinor: string; receivedMinor: string }>;
};

export default function DriverEarningsPage() {
  const [data, setData] = useState<EarningsResponse | null>(null);
  const [message, setMessage] = useState("Loading earnings");

  async function load() {
    const response = await fetch(`${apiBase}/api/v1/driver/earnings`, { cache: "no-store" });
    if (!response.ok) {
      setMessage(`Earnings unavailable: ${response.status}`);
      return;
    }
    setData((await response.json()) as EarningsResponse);
    setMessage("Earnings loaded");
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="nodex-app mobile-shell pb-24">
      <AppHeader
        title="Earnings"
        subtitle="Cash declarations, payout balance, and settlement status"
      />
      <div className="space-y-4 px-4">
        <Panel className="space-y-3" aria-label="Driver earnings summary">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="m-0 text-lg font-black">Driver earnings</h1>
              <p className="m-0 text-sm text-slate-500">{message}</p>
            </div>
            <Button type="button" variant="secondary" onClick={load}>
              Refresh
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
              <strong>{formatUzs(Number(data?.summary.pendingMinor ?? 0))}</strong>
              <span className="block text-slate-500">Pending</span>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
              <strong>{formatUzs(Number(data?.summary.availableMinor ?? 0))}</strong>
              <span className="block text-slate-500">Available</span>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
              <strong>{formatUzs(Number(data?.summary.paidMinor ?? 0))}</strong>
              <span className="block text-slate-500">Paid</span>
            </div>
          </div>
        </Panel>

        <Panel className="space-y-3" aria-label="Cash settlements">
          <h2 className="m-0 text-base font-bold">Cash settlements</h2>
          {(data?.settlements ?? []).map((settlement) => (
            <div
              key={settlement.id}
              className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <strong>{formatUzs(Number(settlement.expectedMinor))}</strong>
                <Badge tone={settlement.status === "CONFIRMED" ? "success" : "warning"}>
                  {settlement.status}
                </Badge>
              </div>
              <p className="m-0 text-sm text-slate-500">
                Received {formatUzs(Number(settlement.receivedMinor))}
              </p>
            </div>
          ))}
          {(data?.settlements.length ?? 0) === 0 && (
            <p className="m-0 text-sm text-slate-500">No open cash settlements.</p>
          )}
        </Panel>

        <Panel className="space-y-3" aria-label="Earning list">
          <h2 className="m-0 text-base font-bold">Earning history</h2>
          {(data?.earnings ?? []).map((earning) => (
            <div
              key={earning.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3"
            >
              <span>{formatUzs(Number(earning.netMinor))}</span>
              <Badge tone={earning.status === "PAID" ? "success" : "info"}>{earning.status}</Badge>
            </div>
          ))}
        </Panel>
      </div>
      <BottomNav
        items={[
          { label: "Trips" },
          { label: "Parcels" },
          { label: "Earnings", active: true },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}
