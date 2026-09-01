"use client";

import { useState } from "react";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "../admin-shell";
import { Breadcrumbs, QuickActionModal, Status } from "../admin-components";

type BadgeTone = "success" | "warning" | "danger" | "info";

const overview: Array<[string, string, BadgeTone]> = [
  ["Late trips", "6", "warning"],
  ["Driver cancellations", "3", "danger"],
  ["Replacement searches", "5", "info"],
  ["Replacement success", "80%", "success"],
  ["Critical cases", "2", "danger"],
 ];

const protectionCases = [
  { id: "PROT-1042", trip: "Nukus to Urgench", original: "Azizbek Karimov", event: "Late cancellation", reason: "Vehicle unavailable", timing: "25 min before departure", search: "Replacement found", replacement: "Madina Yusupova", resolution: "Client accepted", delay: "08:30 on time, 08:55 cancellation, 09:02 replacement" },
  { id: "PROT-1043", trip: "Nukus to Khiva", original: "Sherzod Rakhimov", event: "Critical delay", reason: "Traffic", timing: "35 min delay", search: "Searching", replacement: "Pending", resolution: "Support watching", delay: "08:50 +10, 09:05 +25, 09:14 critical" },
  { id: "PROT-1044", trip: "Urgench to Nukus", original: "Bekzod Driver", event: "No replacement", reason: "Driver cancelled", timing: "18 min before departure", search: "No suitable driver", replacement: "None", resolution: "Client changed time", delay: "17:40 cancellation, 17:47 no replacement" },
];

const driverEvents = [
  ["Azizbek Karimov", "ENVO Pro", "98%", "1.2%", "94%", "Late cancellation review"],
  ["Madina Yusupova", "Отличный", "96%", "2.1%", "91%", "Replacement accepted"],
  ["Sherzod Rakhimov", "Надёжный", "93%", "3.8%", "89%", "Critical delay reported"],
] as const;

export default function ReliabilityPage() {
  const [mode, setMode] = useState<"cases" | "drivers">("cases");
  return <main className="admin-main"><Breadcrumbs items={[{ label: "Admin", href: "/dashboard" }, { label: "Reliability" }]} /><AdminPageHeader title="Reliability / Protection" subtitle="Late trips, cancellations, replacement search and driver reliability visibility." />
    <section className="grid gap-3 xl:grid-cols-5 md:grid-cols-2">{overview.map(([label, value, tone]) => <AdminPanel key={label} className="p-4"><AdminStatusBadge tone={tone}>{label}</AdminStatusBadge><div className="mt-3 text-3xl font-black">{value}</div></AdminPanel>)}</section>
    <div className="mt-4 flex gap-2"><button className={`min-h-9 rounded-[10px] px-3 text-sm font-black ${mode === "cases" ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "border border-[rgb(var(--border))] bg-[rgb(var(--surface))]"}`} type="button" onClick={() => setMode("cases")}>Protection cases</button><button className={`min-h-9 rounded-[10px] px-3 text-sm font-black ${mode === "drivers" ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "border border-[rgb(var(--border))] bg-[rgb(var(--surface))]"}`} type="button" onClick={() => setMode("drivers")}>Driver reliability</button></div>
    {mode === "cases" ? <AdminPanel className="mt-3 overflow-hidden"><div className="grid min-w-[920px] grid-cols-[110px_1fr_1fr_1fr_1fr_1fr_auto] gap-3 border-b border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-4 py-3 text-xs font-black uppercase text-[rgb(var(--text-muted))]"><span>Case</span><span>Trip</span><span>Original driver</span><span>Cancellation</span><span>Replacement</span><span>Resolution</span><span>Action</span></div>{protectionCases.map((item) => <div key={item.id} className="grid min-w-[920px] grid-cols-[110px_1fr_1fr_1fr_1fr_1fr_auto] gap-3 border-b border-[rgb(var(--border))] px-4 py-3 text-sm"><strong>{item.id}</strong><span>{item.trip}</span><span>{item.original}</span><span>{item.reason} · {item.timing}</span><span>{item.search} · {item.replacement}</span><Status value={item.resolution} /><QuickActionModal label="Open" title="Protection case"><p>Original driver: {item.original}</p><p>Cancellation event: {item.event} · {item.reason} · {item.timing}</p><p>Replacement search: {item.search}</p><p>Replacement driver: {item.replacement}</p><p>Delay history: {item.delay}</p></QuickActionModal></div>)}</AdminPanel> : null}
    {mode === "drivers" ? <AdminPanel className="mt-3 overflow-hidden"><div className="grid min-w-[760px] grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1.4fr] gap-3 border-b border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-4 py-3 text-xs font-black uppercase text-[rgb(var(--text-muted))]"><span>Driver</span><span>Status</span><span>Completion</span><span>Cancel rate</span><span>Punctuality</span><span>Recent event</span></div>{driverEvents.map(([driver, status, completion, cancelRate, punctuality, event]) => <div key={driver} className="grid min-w-[760px] grid-cols-[1.2fr_1fr_1fr_1fr_1fr_1.4fr] gap-3 border-b border-[rgb(var(--border))] px-4 py-3 text-sm"><strong>{driver}</strong><Status value={status} /><span>{completion}</span><span>{cancelRate}</span><span>{punctuality}</span><span>{event}</span></div>)}</AdminPanel> : null}
  </main>;
}
