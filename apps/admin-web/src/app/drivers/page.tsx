"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "../admin-shell";

type DriverStatus = "Approved" | "Pending" | "Needs action" | "Restricted";
type Subscription = string;

type DriverRow = {
  id: string;
  name: string;
  phone: string;
  city: string;
  verification: DriverStatus;
  vehicle: string;
  plate: string;
  vehicleStatus: "Approved" | "Pending";
  subscription: Subscription;
  trips: number;
  rating: string;
  status: "Active" | "Restricted";
  lastActivity: string;
  submittedAt: string;
  reviewer: string;
  duplicate: boolean;
};

const rows: DriverRow[] = [
  {
    id: "app_submitted",
    name: "Phase2 Driver 2",
    phone: "+998 ** *** 0002",
    city: "Tashkent",
    verification: "Pending",
    vehicle: "Chevrolet Cobalt",
    plate: "95 A 214 QA",
    vehicleStatus: "Approved",
    subscription: "Active · 18d",
    trips: 23,
    rating: "4.9",
    status: "Active",
    lastActivity: "8 min ago",
    submittedAt: "2026-07-30",
    reviewer: "Unassigned",
    duplicate: false,
  },
  {
    id: "app_review",
    name: "Phase2 Driver 3",
    phone: "+998 ** *** 0003",
    city: "Tashkent",
    verification: "Needs action",
    vehicle: "Chevrolet Cobalt",
    plate: "95 A 215 QA",
    vehicleStatus: "Pending",
    subscription: "Expiring · 3d",
    trips: 17,
    rating: "4.7",
    status: "Active",
    lastActivity: "22 min ago",
    submittedAt: "2026-07-30",
    reviewer: "Admin Mock",
    duplicate: true,
  },
  {
    id: "app_approved",
    name: "Phase2 Driver 4",
    phone: "+998 ** *** 0004",
    city: "Nukus",
    verification: "Approved",
    vehicle: "Chevrolet Tracker",
    plate: "95 B 412 QA",
    vehicleStatus: "Approved",
    subscription: "Expired",
    trips: 46,
    rating: "4.8",
    status: "Active",
    lastActivity: "1 h ago",
    submittedAt: "2026-07-29",
    reviewer: "Admin Mock",
    duplicate: false,
  },
  {
    id: "app_restricted",
    name: "Phase2 Driver 5",
    phone: "+998 ** *** 0005",
    city: "Urgench",
    verification: "Approved",
    vehicle: "Kia K5",
    plate: "95 C 118 QA",
    vehicleStatus: "Approved",
    subscription: "Active · 12d",
    trips: 4,
    rating: "4.3",
    status: "Restricted",
    lastActivity: "Yesterday",
    submittedAt: "2026-07-28",
    reviewer: "Admin Mock",
    duplicate: false,
  },
];

function tone(status: string) {
  if (status === "Approved" || status === "Active") return "success";
  if (status === "Pending" || status.includes("Expiring")) return "warning";
  if (status === "Needs action" || status === "Restricted" || status === "Expired") return "danger";
  return "info";
}

export default function DriversPage() {
  const [selected, setSelected] = useState<DriverRow>(rows[0]!);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [confirmApprove, setConfirmApprove] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextFilter = params.get("filter");
    if (nextFilter === "pending" || nextFilter === "approved") {
      setFilter(nextFilter === "pending" ? "Pending" : "Approved");
    }
  }, []);

  const visibleRows = useMemo(
    () =>
      rows.filter((row) => {
        const matchesQuery = `${row.name} ${row.phone} ${row.plate}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesFilter = filter === "All" || row.verification === filter;
        return matchesQuery && matchesFilter;
      }),
    [filter, query],
  );

  return (
    <main className="p-5">
      <AdminPageHeader
        title="Drivers"
        subtitle="Manage verification, vehicles, subscriptions, and driver access."
        actions={
          <>
            <button className="min-h-9 rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm font-black">
              Export
            </button>
            <Link
              className="inline-flex min-h-9 items-center rounded-[10px] bg-[rgb(var(--primary))] px-3 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline"
              href="/verification"
            >
              Verification queue
            </Link>
          </>
        }
      />

      <div className="grid gap-4 min-[1380px]:grid-cols-[minmax(0,1fr)_460px]">
        <AdminPanel className="overflow-hidden" label="Drivers management table">
          <div className="border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                aria-label="Search drivers"
                className="min-h-10 min-w-[260px] rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search driver, phone, plate"
                value={query}
              />
              <select
                aria-label="Filter driver verification status"
                className="min-h-10 rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm"
                onChange={(event) => setFilter(event.target.value)}
                value={filter}
              >
                <option>All</option>
                <option>Pending</option>
                <option>Needs action</option>
                <option>Approved</option>
              </select>
              <AdminStatusBadge tone="info">{visibleRows.length} drivers</AdminStatusBadge>
            </div>
          </div>

          <div aria-label="Driver verification queue" role="region">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-[rgb(var(--canvas))]">
                <tr>
                  {[
                    "Driver",
                    "Verification",
                    "Vehicle",
                    "Subscription",
                    "Trips",
                    "Rating",
                    "Last activity",
                  ].map((header) => (
                    <th
                      key={header}
                      className="border-b border-[rgb(var(--border))] px-3 py-2 text-left text-[11px] font-black uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr
                    key={row.id}
                    className={[
                      "cursor-pointer hover:bg-[rgb(var(--surface-muted))]",
                      row.id === selected.id ? "bg-[rgb(var(--surface-tint))]" : "",
                    ].join(" ")}
                    onClick={() => setSelected(row)}
                  >
                    <td className="border-b border-[rgb(var(--border))] px-3 py-3">
                      <div className="flex items-center gap-2">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-[rgb(var(--primary))] text-xs font-black text-[rgb(var(--primary-foreground))]">
                          {row.name.split(" ").slice(-1)[0]?.slice(-1) ?? "D"}
                        </span>
                        <span>
                          <span className="block font-black">{row.name}</span>
                          <span className="block text-xs text-[rgb(var(--text-muted))]">
                            {row.phone}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="border-b border-[rgb(var(--border))] px-3 py-3">
                      <AdminStatusBadge tone={tone(row.verification)}>
                        {row.verification}
                      </AdminStatusBadge>
                    </td>
                    <td className="border-b border-[rgb(var(--border))] px-3 py-3">
                      <span className="block font-semibold">{row.vehicle}</span>
                      <span className="text-xs text-[rgb(var(--text-muted))]">{row.plate}</span>
                    </td>
                    <td className="border-b border-[rgb(var(--border))] px-3 py-3">
                      <AdminStatusBadge tone={tone(row.subscription)}>
                        {row.subscription}
                      </AdminStatusBadge>
                    </td>
                    <td className="border-b border-[rgb(var(--border))] px-3 py-3 font-black">
                      {row.trips}
                    </td>
                    <td className="border-b border-[rgb(var(--border))] px-3 py-3">{row.rating}</td>
                    <td className="border-b border-[rgb(var(--border))] px-3 py-3 text-[rgb(var(--text-muted))]">
                      {row.lastActivity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <DriverDrawer
          confirmApprove={confirmApprove}
          driver={selected}
          onApprove={() => setConfirmApprove(true)}
          onCloseApprove={() => setConfirmApprove(false)}
        />
      </div>
    </main>
  );
}

function DriverDrawer({
  driver,
  confirmApprove,
  onApprove,
  onCloseApprove,
}: {
  driver: DriverRow;
  confirmApprove: boolean;
  onApprove: () => void;
  onCloseApprove: () => void;
}) {
  return (
    <aside className="space-y-3" aria-label="Driver detail drawer">
      <AdminPanel className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.12em] text-[rgb(var(--primary))]">
              Driver inspector
            </div>
            <h2 className="m-0 mt-1 text-xl font-black">{driver.name}</h2>
            <p className="m-0 text-sm text-[rgb(var(--text-muted))]">{driver.phone}</p>
          </div>
          <AdminStatusBadge tone={tone(driver.verification)}>
            {driver.verification}
          </AdminStatusBadge>
        </div>
      </AdminPanel>

      <AdminPanel className="p-4">
        <Section title="Identity">
          <Row label="City" value={driver.city} />
          <Row label="Telegram/phone" value={driver.phone} />
          <Row label="Verification" value={driver.verification} />
        </Section>
        <Section title="Vehicle">
          <Row label="Active vehicle" value={driver.vehicle} />
          <Row label="Plate" value={driver.plate} />
          <Row label="Approval" value={driver.vehicleStatus} />
        </Section>
        <Section title="Subscription">
          <Row label="Plan" value="Nodex Driver" />
          <Row label="Status" value={driver.subscription} />
        </Section>
        <Section title="Performance">
          <Row label="Rating" value={driver.rating} />
          <Row label="Completed trips" value={String(driver.trips)} />
        </Section>
      </AdminPanel>

      <AdminPanel className="p-4">
        <h2 className="m-0 mb-3 text-base font-black">Documents</h2>
        {["ID document", "Driver license", "Vehicle registration", "Selfie"].map((item) => (
          <div
            key={item}
            className="mb-2 flex items-center justify-between rounded-[10px] bg-[rgb(var(--canvas))] px-3 py-2 text-sm"
          >
            <span className="font-semibold">{item}</span>
            <AdminStatusBadge tone={driver.verification === "Approved" ? "success" : "warning"}>
              {driver.verification === "Approved" ? "Approved" : "Submitted"}
            </AdminStatusBadge>
          </div>
        ))}
      </AdminPanel>

      <AdminPanel className="p-4">
        <h2 className="m-0 mb-3 text-base font-black">Decision</h2>
        <div className="grid gap-2">
          <button
            className="min-h-10 rounded-[10px] border-0 bg-[rgb(var(--primary))] px-3 text-sm font-black text-[rgb(var(--primary-foreground))]"
            onClick={onApprove}
            type="button"
          >
            Approve
          </button>
          <button
            className="min-h-10 rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm font-black"
            type="button"
          >
            Request changes
          </button>
          <button className="min-h-10 rounded-[10px] border border-[rgb(var(--destructive))] bg-[rgb(var(--surface))] px-3 text-sm font-black text-[rgb(var(--destructive))]">
            Reject
          </button>
        </div>
        {confirmApprove && (
          <div className="mt-3 rounded-[12px] bg-[rgb(var(--foreground))] p-3 text-[rgb(var(--primary-foreground))]">
            <h3 className="m-0 text-base font-black">Approve driver verification?</h3>
            <p className="m-0 mt-1 text-sm opacity-80">{driver.name} · documents reviewed</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                className="min-h-9 rounded-[10px] border-0 bg-[rgb(var(--primary))] px-3 text-sm font-black text-[rgb(var(--primary-foreground))]"
                type="button"
              >
                Approve driver
              </button>
              <button
                className="min-h-9 rounded-[10px] border border-white/20 bg-transparent px-3 text-sm font-black"
                onClick={onCloseApprove}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </AdminPanel>

      <AdminPanel className="p-4">
        <h2 className="m-0 mb-3 text-base font-black">Recent activity</h2>
        {(
          [
            ["Application submitted", driver.submittedAt],
            ["Review opened", driver.reviewer],
            ["Last activity", driver.lastActivity],
          ] as Array<[string, string]>
        ).map(([label, value]) => (
          <Row key={label} label={label} value={value} />
        ))}
      </AdminPanel>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-b border-[rgb(var(--border))] py-3 first:pt-0 last:border-b-0 last:pb-0">
      <h3 className="m-0 mb-2 text-xs font-black uppercase tracking-[0.1em] text-[rgb(var(--primary))]">
        {title}
      </h3>
      <div className="grid gap-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 text-sm">
      <span className="text-[rgb(var(--text-muted))]">{label}</span>
      <strong className="min-w-0 truncate text-right">{value}</strong>
    </div>
  );
}
