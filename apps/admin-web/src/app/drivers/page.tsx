"use client";

import { useMemo, useState } from "react";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { Badge, Button, Panel, Timeline } from "@nodex/ui";

type VerificationRow = {
  id: string;
  driver: string;
  city: string;
  status:
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "CHANGES_REQUESTED"
    | "APPROVED"
    | "REJECTED"
    | "SUSPENDED";
  submittedAt: string;
  reviewer: string;
  duplicate: boolean;
  phoneMasked: string;
  licenseMasked: string;
  vehicle: string;
};

const rows: VerificationRow[] = [
  {
    id: "app_submitted",
    driver: "Phase2 Driver 2",
    city: "Tashkent",
    status: "SUBMITTED",
    submittedAt: "2026-07-30",
    reviewer: "Unassigned",
    duplicate: false,
    phoneMasked: "********0002",
    licenseMasked: "********RE-2",
    vehicle: "Chevrolet Cobalt",
  },
  {
    id: "app_review",
    driver: "Phase2 Driver 3",
    city: "Tashkent",
    status: "UNDER_REVIEW",
    submittedAt: "2026-07-30",
    reviewer: "Admin Mock",
    duplicate: true,
    phoneMasked: "********0003",
    licenseMasked: "********RE-3",
    vehicle: "Chevrolet Cobalt",
  },
  {
    id: "app_changes",
    driver: "Phase2 Driver 4",
    city: "Tashkent",
    status: "CHANGES_REQUESTED",
    submittedAt: "2026-07-30",
    reviewer: "Admin Mock",
    duplicate: false,
    phoneMasked: "********0004",
    licenseMasked: "********RE-4",
    vehicle: "Chevrolet Cobalt",
  },
];

function statusTone(status: VerificationRow["status"]) {
  if (status === "APPROVED") return "success";
  if (status === "REJECTED" || status === "SUSPENDED") return "danger";
  if (status === "UNDER_REVIEW" || status === "CHANGES_REQUESTED") return "warning";
  return "info";
}

export default function DriversPage() {
  const [selected, setSelected] = useState<VerificationRow>(rows[0]!);
  const [reason, setReason] = useState("DOCUMENT_UNREADABLE");
  const columns = useMemo<ColumnDef<VerificationRow>[]>(
    () => [
      { accessorKey: "driver", header: "Driver" },
      { accessorKey: "city", header: "City" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge tone={statusTone(row.original.status)}>{row.original.status}</Badge>
        ),
      },
      { accessorKey: "submittedAt", header: "Submitted" },
      { accessorKey: "reviewer", header: "Reviewer" },
      {
        accessorKey: "duplicate",
        header: "Risk",
        cell: ({ row }) =>
          row.original.duplicate ? <Badge tone="warning">Duplicate</Badge> : <Badge>Clear</Badge>,
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
            <h1 className="m-0 text-lg font-black">Driver verification</h1>
            <div className="text-sm text-slate-500">
              Queue, document review, decisions, and history
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              className="min-h-10 rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3 text-sm"
              placeholder="Search name, phone, plate"
            />
            <select
              aria-label="Filter driver verification status"
              className="min-h-10 rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3 text-sm"
            >
              <option>All statuses</option>
              <option>Submitted</option>
              <option>Under review</option>
              <option>Changes requested</option>
            </select>
          </div>
        </div>
        <div aria-label="Driver verification queue" role="region">
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
              <div className="text-lg font-black">{selected.driver}</div>
              <div className="text-sm text-slate-500">{selected.vehicle}</div>
            </div>
            <Badge tone={statusTone(selected.status)}>{selected.status}</Badge>
          </div>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Phone</span>
              <strong>{selected.phoneMasked}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">License</span>
              <strong>{selected.licenseMasked}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Duplicate</span>
              <strong>{selected.duplicate ? "Needs attention" : "No exact match"}</strong>
            </div>
          </div>
        </Panel>

        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Documents</h2>
          {["ID", "Driver license", "Vehicle registration", "Selfie", "Vehicle front"].map(
            (item) => (
              <div
                key={item}
                className="mb-2 flex min-h-12 items-center justify-between rounded-[var(--radius-md)] border border-[rgb(var(--border))] px-3 text-sm"
              >
                <span>{item}</span>
                <Button variant="secondary">View</Button>
              </div>
            ),
          )}
        </Panel>

        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Decision</h2>
          <div className="grid gap-3">
            <select
              aria-label="Driver verification decision reason"
              className="min-h-10 rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent px-3 text-sm"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            >
              <option>DOCUMENT_UNREADABLE</option>
              <option>DOCUMENT_EXPIRED</option>
              <option>DOCUMENT_MISMATCH</option>
              <option>INVALID_LICENSE_CATEGORY</option>
              <option>DUPLICATE_DRIVER</option>
              <option>OTHER</option>
            </select>
            <textarea
              className="min-h-24 rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-transparent p-3 text-sm"
              placeholder="Comment"
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
          <h2 className="m-0 mb-3 text-base font-bold">History</h2>
          <Timeline
            items={[
              { label: "Application submitted", time: selected.submittedAt, active: true },
              { label: "Review opened", time: selected.reviewer },
              { label: "Decision pending", time: "Now" },
            ]}
          />
        </Panel>
      </aside>
    </main>
  );
}
