"use client";

import { useMemo, useState } from "react";
import { AdminPageHeader, AdminPanel } from "../admin-shell";
import { DataTable, Status, Toolbar } from "../admin-components";
import { users } from "../admin-data";

export default function UsersPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const rows = useMemo(() => users.filter((user) => {
    const matchesQuery = `${user.name} ${user.telegram} ${user.phone} ${user.id}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "All statuses" || user.status === filter || user.risk === filter;
    return matchesQuery && matchesFilter;
  }), [filter, query]);

  return (
    <main className="admin-main">
      <AdminPageHeader title="Клиенты" subtitle="Search, filter, and open passenger profiles." />
      <AdminPanel className="overflow-hidden" label="Users table">
        <Toolbar query={query} onQuery={setQuery} filters={["All statuses", "Active", "Watch", "Blocked", "Low", "Medium", "High"]} activeFilter={filter} onFilter={setFilter} placeholder="Client name, Telegram, phone, internal ID" count={rows.length} />
        <DataTable rows={rows} hrefFor={(row) => `/users/${row.id}`} columns={[
          { key: "name", label: "Name", sortValue: (row) => row.name, render: (row) => <><strong>{row.name}</strong><span className="block text-xs text-[rgb(var(--text-muted))]">{row.telegram}</span></> },
          { key: "status", label: "Status", sortValue: (row) => row.status, render: (row) => <Status value={row.status} /> },
          { key: "trips", label: "Trips", sortValue: (row) => row.trips, render: (row) => row.trips },
          { key: "cancel", label: "Cancels", sortValue: (row) => row.cancellations, render: (row) => row.cancellations },
          { key: "rewards", label: "Rewards", render: (row) => row.rewards },
          { key: "risk", label: "Risk", sortValue: (row) => row.risk, render: (row) => <Status value={row.risk} /> },
          { key: "created", label: "Created", sortValue: (row) => row.created, render: (row) => row.created },
          { key: "action", label: "Action", render: () => <span className="font-black text-[rgb(var(--primary))]">Open</span> },
        ]} />
      </AdminPanel>
    </main>
  );
}