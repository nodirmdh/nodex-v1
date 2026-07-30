"use client";

import { useMemo, useState } from "react";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { Badge, Button, Panel, Timeline } from "@nodex/ui";

type DriverRow = {
  id: string;
  name: string;
  city: string;
  status: "APPROVED" | "UNDER_REVIEW" | "RECHECK_REQUIRED";
  trips: number;
  reliability: number;
};

const rows: DriverRow[] = [
  {
    id: "drv_1",
    name: "Driver A.",
    city: "Nukus",
    status: "APPROVED",
    trips: 182,
    reliability: 96,
  },
  {
    id: "drv_2",
    name: "Driver B.",
    city: "Urgench",
    status: "UNDER_REVIEW",
    trips: 0,
    reliability: 0,
  },
  {
    id: "drv_3",
    name: "Driver C.",
    city: "Kungrad",
    status: "RECHECK_REQUIRED",
    trips: 58,
    reliability: 89,
  },
];

export default function DriversPage() {
  const [selected, setSelected] = useState<DriverRow>(rows[0]!);
  const columns = useMemo<ColumnDef<DriverRow>[]>(
    () => [
      { accessorKey: "name", header: "Driver" },
      { accessorKey: "city", header: "City" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge tone={row.original.status === "APPROVED" ? "success" : "warning"}>
            {row.original.status}
          </Badge>
        ),
      },
      { accessorKey: "trips", header: "Trips" },
      { accessorKey: "reliability", header: "Reliability" },
    ],
    [],
  );
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <main className="grid gap-4 p-5 lg:grid-cols-[1fr_360px]">
      <Panel className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgb(var(--border))] p-4">
          <div>
            <h1 className="m-0 text-lg font-black">Drivers</h1>
            <div className="text-sm text-slate-500">Moderation queue and reliability overview</div>
          </div>
          <div className="flex gap-2">
            <input
              className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3 py-2 text-sm"
              placeholder="Search"
            />
            <Button variant="secondary">Bulk action</Button>
          </div>
        </div>
        <div aria-label="Drivers table area" role="region">
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
      <Panel>
        <div className="mb-4">
          <div className="text-lg font-black">{selected?.name}</div>
          <div className="text-sm text-slate-500">{selected?.city}</div>
        </div>
        <Timeline
          items={[
            { label: "Application submitted", time: "2026-07-20", active: true },
            { label: "Vehicle document uploaded", time: "2026-07-21" },
            { label: "Admin decision pending", time: "Now" },
          ]}
        />
      </Panel>
    </main>
  );
}
