"use client";

import { useMemo, useState } from "react";
import { AdminPageHeader, AdminPanel } from "../admin-shell";
import { DataTable, Status, Toolbar } from "../admin-components";
import { tickets } from "../admin-data";

const tabs = ["Open", "In Progress", "Resolved", "Closed"];

export default function SupportPage() {
  const [active, setActive] = useState("Open");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All priorities");
  const rows = useMemo(() => tickets.filter((ticket) => {
    const matchesTab = ticket.status === active;
    const matchesQuery = `${ticket.id} ${ticket.requester} ${ticket.subject} ${ticket.category}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "All priorities" || ticket.priority === filter || ticket.category === filter;
    return matchesTab && matchesQuery && matchesFilter;
  }), [active, filter, query]);
  return <main className="admin-main"><AdminPageHeader title="Поддержка" subtitle="Inbox with trip context, requester, priority and status." /><AdminPanel className="overflow-hidden"><div className="flex gap-1 border-b border-[rgb(var(--border))] p-2">{tabs.map((tab) => <button className={`min-h-9 rounded-[10px] px-3 text-sm font-black ${tab === active ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))]"}`} key={tab} onClick={() => setActive(tab)} type="button">{tab}</button>)}</div><Toolbar query={query} onQuery={setQuery} filters={["All priorities", "Urgent", "High", "Normal", "Low", "Booking", "Safety", "Rewards", "Complaint"]} activeFilter={filter} onFilter={setFilter} placeholder="Ticket, requester, category, trip context" count={rows.length} /><DataTable rows={rows} hrefFor={(row) => `/support/${row.id}`} columns={[{ key: "id", label: "Ticket", render: (row) => <strong>{row.id}</strong> }, { key: "requester", label: "Requester", render: (row) => row.requester }, { key: "subject", label: "Subject", render: (row) => row.subject }, { key: "category", label: "Category", render: (row) => row.category }, { key: "priority", label: "Priority", render: (row) => <Status value={row.priority} /> }, { key: "trip", label: "Trip", render: (row) => row.tripId }, { key: "assigned", label: "Assigned", render: (row) => row.assigned }, { key: "updated", label: "Updated", render: (row) => row.updated }, { key: "action", label: "Action", render: () => <span className="font-black text-[rgb(var(--primary))]">Open</span> }]} /></AdminPanel></main>;
}