"use client";

import { useMemo, useState } from "react";
import { AdminPageHeader, AdminPanel } from "../admin-shell";
import { DataTable, Status, Toolbar } from "../admin-components";
import { trips } from "../admin-data";

export default function TripsPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const rows = useMemo(() => trips.filter((trip) => {
    const matchesQuery = `${trip.route} ${trip.driver} ${trip.id}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "All statuses" || trip.status === filter || trip.risk === filter;
    return matchesQuery && matchesFilter;
  }), [filter, query]);
  return <main className="admin-main"><AdminPageHeader title="Поездки" subtitle="Trip supply, seats, whole-car requests, risk and live state." /><AdminPanel className="overflow-hidden"><Toolbar query={query} onQuery={setQuery} filters={["All statuses", "Active", "Boarding", "Scheduled", "Completed", "Cancelled", "Low", "Medium", "High"]} activeFilter={filter} onFilter={setFilter} placeholder="Route, driver, trip ID" count={rows.length} /><DataTable rows={rows} hrefFor={(row) => `/trips/${row.id}`} columns={[{ key: "route", label: "Route", sortValue: (row) => row.route, render: (row) => <strong>{row.route}</strong> }, { key: "driver", label: "Driver", render: (row) => row.driver }, { key: "departure", label: "Departure", sortValue: (row) => row.departure, render: (row) => row.departure }, { key: "status", label: "Status", render: (row) => <Status value={row.status} /> }, { key: "seats", label: "Seats", render: (row) => row.seats }, { key: "bookings", label: "Bookings", render: (row) => row.bookings }, { key: "whole", label: "Whole-car", render: (row) => row.wholeCar }, { key: "risk", label: "Risk", render: (row) => <Status value={row.risk} /> }, { key: "actions", label: "Actions", render: () => <span className="font-black text-[rgb(var(--primary))]">Open</span> }]} /></AdminPanel></main>;
}