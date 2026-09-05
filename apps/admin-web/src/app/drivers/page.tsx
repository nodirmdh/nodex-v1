"use client";

import { useMemo, useState } from "react";
import { AdminPageHeader, AdminPanel } from "../admin-shell";
import { DataTable, Status, Toolbar } from "../admin-components";
import { drivers } from "../admin-data";

export default function DriversPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const rows = useMemo(() => drivers.filter((driver) => {
    const matchesQuery = `${driver.name} ${driver.phone} ${driver.plate} ${driver.id}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "All statuses" || driver.status === filter || driver.verification === filter || driver.risk === filter;
    return matchesQuery && matchesFilter;
  }), [filter, query]);
  return (
    <main className="admin-main">
      <AdminPageHeader title="Водители" subtitle="Проверка, автомобили, активность, награды и риск." />
      <AdminPanel className="overflow-hidden" label="Таблица водителей">
        <Toolbar query={query} onQuery={setQuery} filters={["All statuses", "Active", "Offline", "Restricted", "Approved", "Pending", "Needs action", "Low", "Medium", "High"]} activeFilter={filter} onFilter={setFilter} placeholder="Водитель, телефон, номер, ID водителя" count={rows.length} />
        <DataTable rows={rows} hrefFor={(row) => `/drivers/${row.id}`} columns={[
          { key: "driver", label: "Водитель", sortValue: (row) => row.name, render: (row) => <><strong>{row.name}</strong><span className="block text-xs text-[rgb(var(--text-muted))]">{row.telegram}</span></> },
          { key: "vehicle", label: "Автомобиль", sortValue: (row) => row.plate, render: (row) => <><strong>{row.vehicle}</strong><span className="block text-xs text-[rgb(var(--text-muted))]">{row.plate}</span></> },
          { key: "status", label: "Статус", sortValue: (row) => row.status, render: (row) => <Status value={row.status} /> },
          { key: "verification", label: "Проверка", render: (row) => <Status value={row.verification} /> },
          { key: "trips", label: "Поездки", sortValue: (row) => row.trips, render: (row) => row.trips },
          { key: "rating", label: "Рейтинг", render: (row) => row.rating },
          { key: "cancel", label: "Отмены", render: (row) => row.cancellations },
          { key: "rewards", label: "Награды", render: (row) => row.rewards },
          { key: "risk", label: "Риск", render: (row) => <Status value={row.risk} /> },
          { key: "action", label: "Действия", render: () => <span className="font-black text-[rgb(var(--primary))]">Открыть</span> },
        ]} />
      </AdminPanel>
    </main>
  );
}