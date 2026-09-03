"use client";

import { useMemo, useState } from "react";
import { AdminPageHeader, AdminPanel } from "../admin-shell";
import { DataTable, Status, Toolbar } from "../admin-components";
import { bookings } from "../admin-data";

export default function BookingsPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const rows = useMemo(() => bookings.filter((booking) => {
    const matchesQuery = `${booking.id} ${booking.client} ${booking.trip} ${booking.tripId}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "All statuses" || booking.status === filter || booking.risk === filter || booking.wholeCar === filter;
    return matchesQuery && matchesFilter;
  }), [filter, query]);
  return <main className="admin-main"><AdminPageHeader title="Бронирования" subtitle="Заявки на места, багаж, посадка и статус бронирования." /><AdminPanel className="overflow-hidden"><Toolbar query={query} onQuery={setQuery} filters={["All statuses", "Pending", "Accepted", "Expired", "Cancelled", "Yes", "No", "Low", "Medium", "High"]} activeFilter={filter} onFilter={setFilter} placeholder="Бронирование, клиент, поездка" count={rows.length} /><DataTable rows={rows} hrefFor={(row) => `/bookings/${row.id}`} columns={[{ key: "id", label: "Бронь", render: (row) => <strong>{row.id}</strong> }, { key: "client", label: "Клиент", render: (row) => row.client }, { key: "trip", label: "Поездка", render: (row) => row.trip }, { key: "seats", label: "Места", render: (row) => row.seats }, { key: "baggage", label: "Багаж", render: (row) => row.baggage }, { key: "whole", label: "Весь авто", render: (row) => row.wholeCar }, { key: "status", label: "Статус", render: (row) => <Status value={row.status} /> }, { key: "requested", label: "Запрошено", render: (row) => row.requested }, { key: "actions", label: "Детали", render: () => <span className="font-black text-[rgb(var(--primary))]">Открыть</span> }]} /></AdminPanel></main>;
}