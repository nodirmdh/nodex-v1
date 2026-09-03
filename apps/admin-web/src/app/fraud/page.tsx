"use client";

import { useMemo, useState } from "react";
import { AdminPageHeader, AdminPanel } from "../admin-shell";
import { DataTable, QuickActionModal, Status, Toolbar } from "../admin-components";
import { fraudCases } from "../admin-data";

export default function FraudPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const rows = useMemo(() => fraudCases.filter((item) => `${item.id} ${item.entity} ${item.type} ${item.flags} ${item.reason}`.toLowerCase().includes(query.toLowerCase()) && (filter === "All statuses" || item.status === filter || item.risk === filter)), [filter, query]);

  return (
    <main className="admin-main">
      <AdminPageHeader title="Антифрод" subtitle="Сигналы риска, GPS-доказательства, связь с наградами и история решений." />
      <AdminPanel className="overflow-hidden">
        <Toolbar query={query} onQuery={setQuery} filters={["All statuses", "Open", "Hold", "Approved", "Rejected", "Low", "Medium", "High"]} activeFilter={filter} onFilter={setFilter} placeholder="Пользователь, сигнал, флаг, причина" count={rows.length} />
        <DataTable rows={rows} hrefFor={() => "/fraud"} columns={[
          { key: "entity", label: "Объект", render: (item) => <strong>{item.entity} · {item.entityId}</strong> },
          { key: "type", label: "Тип", render: (item) => item.type },
          { key: "risk", label: "Риск", render: (item) => <Status value={item.risk} /> },
          { key: "flags", label: "Флаги", render: (item) => item.flags },
          { key: "reason", label: "Причина", render: (item) => item.reason },
          { key: "trip", label: "Рейс", render: (item) => item.tripId },
          { key: "status", label: "Статус", render: (item) => <Status value={item.status} /> },
          { key: "created", label: "Создано", render: (item) => item.created },
          { key: "action", label: "Решение", render: (item) => <QuickActionModal label="Решить" title="Антифрод решение"><p>{item.reason}</p><p>Одобрение, отклонение и удержание остаются demo-действиями до подключения существующих backend actions.</p></QuickActionModal> },
        ]} />
      </AdminPanel>
    </main>
  );
}
