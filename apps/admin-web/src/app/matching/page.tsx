"use client";

import { useState } from "react";
import { AdminPageHeader, AdminPanel } from "../admin-shell";
import { QuickActionModal, Status } from "../admin-components";
import { trips, waitlists } from "../admin-data";

export default function MatchingPage() {
  const [tab, setTab] = useState("Active waitlists");
  const tabs = ["Active waitlists", "Matches", "Matched trips", "Fill demand", "Return activity", "Expired/cancelled"];
  return <main className="admin-main"><AdminPageHeader title="Matching" subtitle="Waitlists, matches, Fill demand and Return activity." /><AdminPanel className="overflow-hidden"><div className="flex gap-1 overflow-x-auto border-b border-[rgb(var(--border))] p-2">{tabs.map((item) => <button key={item} className={`min-h-9 rounded-[10px] px-3 text-sm font-black ${tab === item ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))]"}`} onClick={() => setTab(item)} type="button">{item}</button>)}</div><div className="overflow-x-auto"><table className="w-full min-w-[720px] table-fixed border-collapse text-sm"><thead className="sticky top-0 bg-[rgb(var(--canvas))]"><tr>{["Item", "Route", "Status", "Demand", "Match", "Action"].map((h) => <th className="border-b border-[rgb(var(--border))] px-4 py-3 text-left text-[11px] font-black uppercase text-[rgb(var(--text-muted))]" key={h}>{h}</th>)}</tr></thead><tbody>{waitlists.map((item) => <tr className="border-b border-[rgb(var(--border))] hover:bg-[rgb(var(--surface-muted))]" key={item.id}><td className="px-4 py-3 font-black">{item.id}</td><td className="truncate px-4 py-3">{item.route}</td><td className="truncate px-4 py-3"><Status value={item.status} /></td><td className="truncate px-4 py-3">{item.demand}</td><td className="truncate px-4 py-3">{item.match}</td><td className="truncate px-4 py-3"><QuickActionModal label="Details" title="Waitlist match detail"><p>{item.client} · {item.route}</p><p>Related trips: {trips.map((trip) => trip.id).join(", ")}</p></QuickActionModal></td></tr>)}</tbody></table></div></AdminPanel></main>;
}