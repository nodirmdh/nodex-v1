"use client";

import { useMemo, useState } from "react";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { Badge, Button, Panel, Timeline } from "@nodex/ui";

type TripStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "BOARDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "UNPUBLISHED"
  | "CANCELLED"
  | "BLOCKED";

type TripRow = {
  id: string;
  route: string;
  departure: string;
  driver: string;
  vehicle: string;
  seats: string;
  price: string;
  parcel: boolean;
  status: TripStatus;
};

const rows: TripRow[] = [
  {
    id: "trip-published",
    route: "Nukus -> Khiva",
    departure: "2026-08-10 10:00",
    driver: "Driver Mock",
    vehicle: "Chevrolet Tracker",
    seats: "4 / 4",
    price: "95 000 UZS",
    parcel: true,
    status: "PUBLISHED",
  },
  {
    id: "trip-boarding",
    route: "Nukus -> Urgench",
    departure: "2026-08-08 08:30",
    driver: "Driver Mock",
    vehicle: "Chevrolet Cobalt",
    seats: "3 / 4",
    price: "85 000 UZS",
    parcel: false,
    status: "BOARDING",
  },
  {
    id: "trip-progress",
    route: "Nukus -> Tashkent",
    departure: "2026-08-08 07:00",
    driver: "Route partner",
    vehicle: "Chevrolet Tracker",
    seats: "4 / 4",
    price: "250 000 UZS",
    parcel: false,
    status: "IN_PROGRESS",
  },
  {
    id: "trip-draft",
    route: "Nukus -> Urgench",
    departure: "Draft",
    driver: "Driver Mock",
    vehicle: "Chevrolet Tracker",
    seats: "3 / 3",
    price: "85 000 UZS",
    parcel: true,
    status: "DRAFT",
  },
  {
    id: "trip-unpublished",
    route: "Nukus -> Bukhara",
    departure: "2026-08-12 09:00",
    driver: "Driver Mock",
    vehicle: "Chevrolet Tracker",
    seats: "4 / 4",
    price: "180 000 UZS",
    parcel: true,
    status: "UNPUBLISHED",
  },
];

function statusTone(status: TripStatus) {
  if (status === "PUBLISHED" || status === "COMPLETED") return "success";
  if (status === "BOARDING" || status === "IN_PROGRESS") return "info";
  if (status === "CANCELLED" || status === "BLOCKED") return "danger";
  if (status === "UNPUBLISHED") return "warning";
  return "info";
}

export default function AdminTripsPage() {
  const [selected, setSelected] = useState<TripRow>(rows[0]!);
  const columns = useMemo<ColumnDef<TripRow>[]>(
    () => [
      { accessorKey: "route", header: "Route" },
      { accessorKey: "departure", header: "Departure" },
      { accessorKey: "driver", header: "Driver" },
      { accessorKey: "vehicle", header: "Vehicle" },
      { accessorKey: "seats", header: "Seats" },
      { accessorKey: "price", header: "Price" },
      {
        accessorKey: "parcel",
        header: "Parcel",
        cell: ({ row }) => (row.original.parcel ? "Yes" : "No"),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge tone={statusTone(row.original.status)}>{row.original.status}</Badge>
        ),
      },
    ],
    [],
  );
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <main className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_430px]">
      <Panel className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--border))] p-4">
          <div>
            <h1 className="m-0 text-lg font-black">Trip supply</h1>
            <div className="text-sm text-slate-500">
              Driver-published routes, capacity, pricing, parcels, and moderation actions
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <select className="min-h-10 rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3 text-sm">
              <option>All statuses</option>
              <option>Published</option>
              <option>Boarding</option>
              <option>In progress</option>
              <option>Completed</option>
              <option>Draft</option>
              <option>Blocked</option>
            </select>
            <input
              className="min-h-10 rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3 text-sm"
              placeholder="Driver, vehicle, route"
            />
          </div>
        </div>
        <div aria-label="Admin trips table" role="region">
          <table className="w-full border-collapse text-sm">
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id}>
                  {group.headers.map((header) => (
                    <th
                      key={header.id}
                      className="border-b border-[rgb(var(--border))] px-4 py-3 text-left text-xs uppercase text-slate-500"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer hover:bg-[rgb(var(--surface-muted))]"
                  onClick={() => setSelected(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="border-b border-[rgb(var(--border))] px-4 py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <aside className="space-y-4">
        <Panel>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-black">{selected.route}</div>
              <div className="text-sm text-slate-500">{selected.departure}</div>
            </div>
            <Badge tone={statusTone(selected.status)}>{selected.status}</Badge>
          </div>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Driver</span>
              <strong>{selected.driver}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Vehicle</span>
              <strong>{selected.vehicle}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Seats</span>
              <strong>{selected.seats}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Parcel</span>
              <strong>{selected.parcel ? "Supported" : "No"}</strong>
            </div>
          </div>
        </Panel>

        <Panel className="space-y-3" aria-label="Trip operation detail">
          <h2 className="m-0 text-base font-bold">Operations</h2>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
              <strong>3</strong>
              <span className="block text-xs text-slate-500">Booked</span>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
              <strong>1</strong>
              <span className="block text-xs text-slate-500">Boarded</span>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
              <strong>1</strong>
              <span className="block text-xs text-slate-500">No-show</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary">Admin cancel</Button>
            <Button variant="secondary">Driver no-show</Button>
          </div>
        </Panel>

        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Moderation</h2>
          <textarea
            className="mb-3 min-h-24 w-full rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent p-3 text-sm"
            placeholder="Required reason for block or cancel"
          />
          <div className="grid grid-cols-2 gap-2">
            <Button>Block</Button>
            <Button variant="secondary">Unblock</Button>
            <Button variant="secondary">Cancel</Button>
            <Button variant="secondary">Open history</Button>
          </div>
        </Panel>

        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Audit timeline</h2>
          <Timeline
            items={[
              { label: "Trip draft created", time: "Driver", active: true },
              { label: "Publication validation", time: selected.status },
              { label: "Boarding code generated", time: "Operation" },
              { label: "Passenger boarded or no-show", time: "Operation" },
              { label: "Latest moderation action", time: "Reason required" },
            ]}
          />
        </Panel>
      </aside>
    </main>
  );
}
