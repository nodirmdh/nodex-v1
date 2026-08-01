"use client";

import { useMemo, useState } from "react";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { Badge, Button, Panel, Timeline } from "@nodex/ui";

type VehicleRow = {
  id: string;
  vehicle: string;
  plate: string;
  driver: string;
  city: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "SUSPENDED";
  submittedAt: string;
  risk: string;
};

const rows: VehicleRow[] = [
  {
    id: "vehicle-submitted",
    vehicle: "Chevrolet Lacetti",
    plate: "01 V 102 AA",
    driver: "Driver Mock",
    city: "Tashkent",
    status: "SUBMITTED",
    submittedAt: "2026-08-01",
    risk: "Clear",
  },
  {
    id: "vehicle-review",
    vehicle: "BYD Chazor",
    plate: "01 V 103 AA",
    driver: "Driver Mock",
    city: "Tashkent",
    status: "UNDER_REVIEW",
    submittedAt: "2026-08-01",
    risk: "Photo check",
  },
  {
    id: "vehicle-approved",
    vehicle: "Chevrolet Tracker",
    plate: "01 V 104 AA",
    driver: "Driver Mock",
    city: "Tashkent",
    status: "APPROVED",
    submittedAt: "2026-08-01",
    risk: "Clear",
  },
];

function statusTone(status: VehicleRow["status"]) {
  if (status === "APPROVED") return "success";
  if (status === "SUSPENDED") return "danger";
  if (status === "UNDER_REVIEW" || status === "CHANGES_REQUESTED") return "warning";
  return "info";
}

export default function AdminVehiclesPage() {
  const [selected, setSelected] = useState<VehicleRow>(rows[0]!);
  const [reason, setReason] = useState("INVALID_VEHICLE_DATA");
  const columns = useMemo<ColumnDef<VehicleRow>[]>(
    () => [
      { accessorKey: "vehicle", header: "Vehicle" },
      { accessorKey: "plate", header: "Plate" },
      { accessorKey: "driver", header: "Driver" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge tone={statusTone(row.original.status)}>{row.original.status}</Badge>
        ),
      },
      { accessorKey: "submittedAt", header: "Submitted" },
      { accessorKey: "risk", header: "Risk" },
    ],
    [],
  );
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <main className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_430px]">
      <Panel className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--border))] p-4">
          <div>
            <h1 className="m-0 text-lg font-black">Vehicle moderation</h1>
            <div className="text-sm text-slate-500">
              Queue, documents, photos, decisions, and audit trail
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className="min-h-10 rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3 text-sm"
              placeholder="Search plate, make, model, owner"
            />
            <select className="min-h-10 rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3 text-sm">
              <option>All statuses</option>
              <option>Submitted</option>
              <option>Under review</option>
              <option>Approved</option>
            </select>
            <select className="min-h-10 rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3 text-sm">
              <option>All regions</option>
              <option>Tashkent</option>
              <option>Nukus</option>
            </select>
          </div>
        </div>
        <div aria-label="Vehicle moderation queue" role="region">
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
              <div className="text-lg font-black">{selected.vehicle}</div>
              <div className="text-sm text-slate-500">{selected.plate}</div>
            </div>
            <Badge tone={statusTone(selected.status)}>{selected.status}</Badge>
          </div>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Driver</span>
              <strong>{selected.driver}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Driver verification</span>
              <strong>APPROVED</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Risk</span>
              <strong>{selected.risk}</strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Documents</h2>
          {["Registration certificate", "Insurance", "Technical inspection"].map((item) => (
            <div
              key={item}
              className="mb-2 flex min-h-12 items-center justify-between rounded-[var(--radius-md)] border border-[rgb(var(--border))] px-3 text-sm"
            >
              <span>{item}</span>
              <Button variant="secondary">View</Button>
            </div>
          ))}
        </Panel>

        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Photo gallery</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {["Front", "Rear", "Left side", "Interior", "Plate"].map((item) => (
              <div
                key={item}
                className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] p-3"
              >
                {item}
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Decision</h2>
          <div className="grid gap-3">
            <select
              className="min-h-10 rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3 text-sm"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            >
              <option>INVALID_VEHICLE_DATA</option>
              <option>DOCUMENT_UNREADABLE</option>
              <option>PLATE_MISMATCH</option>
              <option>DUPLICATE_PLATE</option>
              <option>OTHER</option>
            </select>
            <textarea
              className="min-h-24 rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent p-3 text-sm"
              placeholder="Required reason for sensitive decisions"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button>Approve</Button>
              <Button variant="secondary">Request changes</Button>
              <Button variant="secondary">Reject</Button>
              <Button variant="secondary">Suspend</Button>
            </div>
          </div>
        </Panel>

        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Audit timeline</h2>
          <Timeline
            items={[
              { label: "Vehicle submitted", time: selected.submittedAt, active: true },
              { label: "Review opened", time: selected.status },
              { label: "Decision pending", time: "Now" },
            ]}
          />
        </Panel>
      </aside>
    </main>
  );
}
