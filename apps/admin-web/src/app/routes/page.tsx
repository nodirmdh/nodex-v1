"use client";

import { useMemo, useState } from "react";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { Badge, Button, Panel } from "@nodex/ui";

type RouteRow = {
  id: string;
  origin: string;
  destination: string;
  distance: string;
  duration: string;
  active: boolean;
};

const routes: RouteRow[] = [
  {
    id: "nukus-urgench",
    origin: "Nukus",
    destination: "Urgench",
    distance: "170 km",
    duration: "3h",
    active: true,
  },
  {
    id: "nukus-khiva",
    origin: "Nukus",
    destination: "Khiva",
    distance: "190 km",
    duration: "3h 30m",
    active: true,
  },
  {
    id: "nukus-bukhara",
    origin: "Nukus",
    destination: "Bukhara",
    distance: "550 km",
    duration: "8h 30m",
    active: true,
  },
];

export default function AdminRoutesPage() {
  const [selected, setSelected] = useState<RouteRow>(routes[0]!);
  const columns = useMemo<ColumnDef<RouteRow>[]>(
    () => [
      { accessorKey: "origin", header: "Origin" },
      { accessorKey: "destination", header: "Destination" },
      { accessorKey: "distance", header: "Distance" },
      { accessorKey: "duration", header: "Duration" },
      {
        accessorKey: "active",
        header: "Status",
        cell: ({ row }) => (
          <Badge tone={row.original.active ? "success" : "danger"}>
            {row.original.active ? "ACTIVE" : "INACTIVE"}
          </Badge>
        ),
      },
    ],
    [],
  );
  const table = useReactTable({ data: routes, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <main className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_430px]">
      <Panel className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--border))] p-4">
          <div>
            <h1 className="m-0 text-lg font-black">Route directory</h1>
            <div className="text-sm text-slate-500">
              Regions, cities, pickup points, and active intercity pairs
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button>Create route</Button>
            <Button variant="secondary">Create city</Button>
          </div>
        </div>
        <div aria-label="Route directory table" role="region">
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
          <h2 className="m-0 mb-3 text-base font-bold">Directory controls</h2>
          <div className="grid gap-2 text-sm">
            {[
              "Republic of Karakalpakstan",
              "Khorezm Region",
              "Bukhara Region",
              "Navoiy Region",
            ].map((item) => (
              <div
                key={item}
                className="flex min-h-11 items-center justify-between rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] px-3"
              >
                <span>{item}</span>
                <Badge tone="success">ACTIVE</Badge>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Pickup points</h2>
          {["City center", "Bus station", "Railway station", "Airport where applicable"].map(
            (item) => (
              <div
                key={item}
                className="mb-2 rounded-[var(--radius-md)] border border-[rgb(var(--border))] p-3 text-sm"
              >
                {item}
              </div>
            ),
          )}
        </Panel>
        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Route detail</h2>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Origin</span>
              <strong>{selected.origin}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Destination</span>
              <strong>{selected.destination}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Distance</span>
              <strong>{selected.distance}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Duration</span>
              <strong>{selected.duration}</strong>
            </div>
          </div>
        </Panel>
      </aside>
    </main>
  );
}
