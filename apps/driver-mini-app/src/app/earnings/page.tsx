"use client";

import { useState } from "react";
import { Button, formatUzs } from "@nodex/ui";
import { DriverCard, DriverHeader, DriverPill, DriverShell } from "../driver-ui";

const weekly = [2, 3, 2, 4, 5, 3, 4];

export default function DriverEarningsPage() {
  const [modal, setModal] = useState<"progress" | "history" | "milestone" | null>(null);

  return (
    <DriverShell active="profile">
      <DriverHeader
        title="Statistics"
        subtitle="Estimated ride revenue and utilization"
        status={<DriverPill tone="info">This week</DriverPill>}
      />

      <DriverCard className="mt-4 space-y-3" label="Driver earnings summary">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-xl font-black">Driver earnings</h1>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Estimated from your listed trip prices. Ride payment is arranged directly with
              passengers.
            </p>
          </div>
          <DriverPill tone="accent">Estimate</DriverPill>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Today" value={formatUzs(25500000)} />
          <Metric label="Week" value={formatUzs(132000000)} />
          <Metric label="Month" value={formatUzs(486000000)} />
        </div>
      </DriverCard>

      <DriverCard className="mt-3 space-y-3" label="Cash settlements">
        <h2 className="m-0 text-lg font-black">Direct payment notes</h2>
        <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
          Nodex does not hold ride payments for drivers. Use this page for trip-price estimates and
          operational statistics.
        </p>
      </DriverCard>

      <DriverCard className="mt-3 space-y-3" label="Driver rewards progress">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-black">Rewards progress</h2>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">Complete 3 more verified trips to unlock the next driver milestone.</p>
          </div>
          <DriverPill tone="accent">7/10</DriverPill>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-[rgb(var(--canvas))]"><div className="h-full w-[70%] rounded-full bg-[rgb(var(--primary))]" /></div>
        <div className="grid grid-cols-3 gap-2">
          <Button type="button" onClick={() => setModal("progress")}>Progress</Button>
          <Button type="button" variant="secondary" onClick={() => setModal("milestone")}>Milestone</Button>
          <Button type="button" variant="secondary" onClick={() => setModal("history")}>History</Button>
        </div>
      </DriverCard>

      <DriverCard className="mt-3 space-y-3" label="Earning list">
        <h2 className="m-0 text-lg font-black">Completed trips</h2>
        <div className="flex h-24 items-end gap-2 rounded-[18px] bg-[rgb(var(--canvas))] p-3">
          {weekly.map((value, index) => (
            <div key={index} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t-full bg-[rgb(var(--primary))]"
                style={{ height: `${value * 12}px` }}
              />
              <span className="text-[9px] font-bold text-[rgb(var(--text-muted))]">{value}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Metric label="Completed trips" value="23" />
          <Metric label="Seat utilization" value="82%" />
        </div>
      </DriverCard>
      {modal ? <RewardModal title={modal === "progress" ? "Reward progress" : modal === "milestone" ? "Next milestone" : "Reward history"} onClose={() => setModal(null)} /> : null}
    </DriverShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3">
      <div className="text-sm font-black">{value}</div>
      <div className="mt-1 text-[10px] font-bold text-[rgb(var(--text-muted))]">{label}</div>
    </div>
  );
}

function RewardModal({ title, onClose }: { title: string; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[rgb(var(--foreground)/0.28)] p-4" role="dialog" aria-modal="true"><section className="w-full max-w-[360px] rounded-[26px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-floating)]"><div className="mb-3 flex items-center justify-between gap-3"><h2 className="m-0 text-lg font-black">{title}</h2><button className="h-9 w-9 rounded-full border-0 bg-[rgb(var(--canvas))] text-lg font-black" type="button" onClick={onClose}>×</button></div><div className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-muted))]"><div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3">7 verified trips · 3 remaining</div><div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3">Next reward: priority matching visibility</div><div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3">Latest: Nukus → Urgench completed</div></div><Button className="mt-4 w-full" type="button" onClick={onClose}>Close</Button></section></div>;
}