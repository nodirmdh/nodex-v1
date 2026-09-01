"use client";

import { useState } from "react";
import { Button, formatUzs } from "@nodex/ui";
import { DriverCard, DriverHeader, DriverPill, DriverShell } from "../driver-ui";

const weekly = [2, 3, 2, 4, 5, 3, 4];
const history = [
  ["Completed trip", "Nukus to Urgench", "+2 tickets", "Approved"],
  ["No-cancel streak", "7 days", "+50 points", "Approved"],
  ["Quality bonus", "4.9 rating", "+80 points", "Pending"],
  ["Driver referral", "Otabek onboarded", "+3 tickets", "Verification"],
  ["Milestone", "30 qualifying trips", formatUzs(20000000), "Pending"],
  ["Rejected", "Cancelled late", "0", "Rejected"],
];
const referrals = [
  ["Otabek", "onboarding", "Documents submitted"],
  ["Jasur", "verification", "Vehicle check pending"],
  ["Sardor", "first qualifying trip", "Trip completed, under review"],
  ["Nodira", "reward issued", "Referral reward paid in demo state"],
];

type ModalKey = "progress" | "history" | "milestone" | "referral" | null;

export default function DriverEarningsPage() {
  const [modal, setModal] = useState<ModalKey>(null);
  const [shared, setShared] = useState(false);

  return (
    <DriverShell active="profile">
      <DriverHeader title="Rewards" subtitle="Driver milestones, quality and referrals" status={<DriverPill tone="info">This week</DriverPill>} />

      <DriverCard className="mt-4 space-y-3" label="Driver rewards overview">
        <div className="flex items-start justify-between gap-3"><div><h1 className="m-0 text-xl font-black">42 tickets · 640 points</h1><p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">30/50 qualifying trips toward the next milestone.</p></div><DriverPill tone="accent">60%</DriverPill></div>
        <div className="h-3 overflow-hidden rounded-full bg-[rgb(var(--canvas))]"><div className="h-full w-[60%] rounded-full bg-[rgb(var(--primary))]" /></div>
        <div className="grid grid-cols-3 gap-2"><Metric label="Qualifying" value="30" /><Metric label="No-cancel" value="7d" /><Metric label="Quality" value="4.9" /></div>
        <div className="grid grid-cols-3 gap-2"><Button type="button" onClick={() => setModal("progress")}>Progress</Button><Button type="button" variant="secondary" onClick={() => setModal("milestone")}>Milestone</Button><Button type="button" variant="secondary" onClick={() => setModal("history")}>History</Button></div>
      </DriverCard>

      <DriverCard className="mt-3 space-y-3" label="Driver milestone detail">
        <div className="flex items-start justify-between gap-3"><div><h2 className="m-0 text-lg font-black">50 trip milestone</h2><p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">200 000 UZS reward after review.</p></div><DriverPill tone="warning">Pending review</DriverPill></div>
        <div className="rounded-[18px] bg-[rgb(var(--canvas))] p-3 text-sm font-semibold text-[rgb(var(--text-muted))]">Counts completed intercity trips with verified passengers, no late cancel, and no safety escalation.</div>
        <Button className="w-full" type="button" onClick={() => setModal("milestone")}>View eligibility</Button>
      </DriverCard>

      <DriverCard className="mt-3 space-y-3" label="Driver referral">
        <h2 className="m-0 text-lg font-black">Referral</h2>
        <div className="flex items-center justify-between gap-3 rounded-[18px] bg-[rgb(var(--canvas))] p-3"><div><div className="text-xs font-bold text-[rgb(var(--text-muted))]">Driver code</div><div className="text-lg font-black">DRV-AZIZ-30</div></div><Button type="button" variant="secondary" onClick={() => setShared(true)}>{shared ? "Copied" : "Share"}</Button></div>
        <button className="w-full rounded-[18px] border-0 bg-[rgb(var(--surface-tint))] p-3 text-left text-sm font-black text-[rgb(var(--primary))]" type="button" onClick={() => setModal("referral")}>4 invited drivers · onboarding status</button>
      </DriverCard>

      <DriverCard className="mt-3 space-y-3" label="Earning list">
        <h2 className="m-0 text-lg font-black">Completed trips</h2>
        <div className="flex h-24 items-end gap-2 rounded-[18px] bg-[rgb(var(--canvas))] p-3">{weekly.map((value, index) => <div key={index} className="flex flex-1 flex-col items-center gap-1"><div className="w-full rounded-t-full bg-[rgb(var(--primary))]" style={{ height: `${value * 12}px` }} /><span className="text-[9px] font-bold text-[rgb(var(--text-muted))]">{value}</span></div>)}</div>
        <div className="grid grid-cols-2 gap-2"><Metric label="Completed trips" value="23" /><Metric label="Seat utilization" value="82%" /></div>
      </DriverCard>

      {modal ? <RewardModal title={modal === "progress" ? "Reward progress" : modal === "milestone" ? "Next milestone" : modal === "referral" ? "Driver referrals" : "Reward history"} onClose={() => setModal(null)}>{modal === "progress" ? <ProgressDetail /> : null}{modal === "milestone" ? <MilestoneDetail /> : null}{modal === "history" ? <HistoryDetail /> : null}{modal === "referral" ? <ReferralDetail /> : null}</RewardModal> : null}
    </DriverShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3"><div className="text-sm font-black">{value}</div><div className="mt-1 text-[10px] font-bold text-[rgb(var(--text-muted))]">{label}</div></div>; }
function ProgressDetail() { return <div className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-muted))]"><div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3">30 qualifying trips · 20 remaining</div><div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3">No-cancel streak: 7 days, active</div><div className="rounded-[16px] bg-[rgb(var(--warning-soft))] p-3 text-[rgb(var(--warning))]">Quality bonus waits for support/safety review</div></div>; }
function MilestoneDetail() { return <div className="grid gap-2 text-sm font-semibold text-[rgb(var(--text-muted))]"><div className="rounded-[16px] bg-[rgb(var(--surface-tint))] p-3 text-[rgb(var(--primary))]"><strong className="block text-base">30/50 qualifying trips to 200 000 UZS</strong>Current state is pending review.</div><div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3">Qualifying: completed verified passenger trips.</div><div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3">Non-qualifying: cancelled, disputed, safety escalated, or fraud-review trips.</div></div>; }
function HistoryDetail() { return <div className="grid gap-2">{history.map(([kind, label, value, status]) => <div key={`${kind}-${label}`} className="rounded-[16px] bg-[rgb(var(--canvas))] p-3 text-sm"><div className="flex items-center justify-between gap-2"><strong>{kind}</strong><DriverPill tone={status === "Approved" ? "success" : status === "Rejected" ? "danger" : "warning"}>{status}</DriverPill></div><div className="mt-1 text-xs font-semibold text-[rgb(var(--text-muted))]">{label} · {value}</div></div>)}</div>; }
function ReferralDetail() { return <div className="grid gap-2">{referrals.map(([name, state, note]) => <div key={name} className="rounded-[16px] bg-[rgb(var(--canvas))] p-3 text-sm"><div className="flex items-center justify-between gap-2"><strong>{name}</strong><DriverPill tone={state === "reward issued" ? "success" : state === "verification" ? "warning" : "neutral"}>{state}</DriverPill></div><div className="mt-1 text-xs font-semibold text-[rgb(var(--text-muted))]">{note}</div></div>)}</div>; }
function RewardModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-50 grid place-items-end bg-[rgb(var(--foreground)/0.28)] p-3 sm:place-items-center" role="dialog" aria-modal="true"><section className="w-full max-w-[390px] rounded-[26px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-floating)]"><div className="mb-3 flex items-center justify-between gap-3"><h2 className="m-0 text-lg font-black">{title}</h2><button className="h-9 w-9 rounded-full border-0 bg-[rgb(var(--canvas))] text-lg font-black" type="button" onClick={onClose}>x</button></div>{children}<Button className="mt-4 w-full" type="button" onClick={onClose}>Close</Button></section></div>; }
