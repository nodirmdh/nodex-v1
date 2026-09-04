"use client";

import { useMemo, useState } from "react";
import { AdminPageHeader, AdminPanel } from "../admin-shell";
import { DataTable, QuickActionModal, Status, Toolbar } from "../admin-components";
import { referrals } from "../admin-data";

export default function ReferralsPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const rows = useMemo(() => referrals.filter((item) => `${item.id} ${item.inviter} ${item.invited} ${item.qualifyingTrip}`.toLowerCase().includes(query.toLowerCase()) && (filter === "All statuses" || item.status === filter || item.fraud === filter)), [filter, query]);

  return (
    <main className="admin-main">
      <AdminPageHeader title="Рефералы" subtitle="Кто пригласил, поездка для зачёта, награда и антифрод-состояние." />
      <AdminPanel className="overflow-hidden">
        <Toolbar query={query} onQuery={setQuery} filters={["All statuses", "Pending", "Qualified", "Blocked", "Clear", "Review"]} activeFilter={filter} onFilter={setFilter} placeholder="Кто пригласил, новый клиент, поездка для зачёта" count={rows.length} />
        <DataTable rows={rows} hrefFor={() => "/referrals"} columns={[
          { key: "id", label: "Реферал", render: (item) => <strong>{item.id}</strong> },
          { key: "inviter", label: "Пригласил", render: (item) => item.inviter },
          { key: "invited", label: "Клиент", render: (item) => item.invited },
          { key: "trip", label: "Поездка", render: (item) => item.qualifyingTrip },
          { key: "status", label: "Статус", render: (item) => <Status value={item.status} /> },
          { key: "reward", label: "Награда", render: (item) => item.reward },
          { key: "fraud", label: "Фрод", render: (item) => <Status value={item.fraud} /> },
          { key: "action", label: "Детали", render: (item) => <QuickActionModal label="Открыть" title="Детали реферала"><p>{item.inviter} пригласил {item.invited}</p><p>Награда: {item.reward}</p></QuickActionModal> },
        ]} />
      </AdminPanel>
    </main>
  );
}
