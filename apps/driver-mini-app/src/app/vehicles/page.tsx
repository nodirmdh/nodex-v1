"use client";

import { useMemo, useState } from "react";
import { AppHeader, Badge, BottomNav, Button, Panel, Timeline } from "@nodex/ui";

type VehicleStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "ARCHIVED";

type Vehicle = {
  id: string;
  name: string;
  plate: string;
  status: VehicleStatus;
  primary: boolean;
  seats: number;
  luggage: string;
};

const vehicles: Vehicle[] = [
  {
    id: "vehicle-approved",
    name: "Chevrolet Tracker",
    plate: "01 V 104 AA",
    status: "APPROVED",
    primary: true,
    seats: 4,
    luggage: "2 medium bags",
  },
  {
    id: "vehicle-draft",
    name: "Chevrolet Cobalt",
    plate: "Draft plate",
    status: "DRAFT",
    primary: false,
    seats: 4,
    luggage: "Not set",
  },
  {
    id: "vehicle-changes",
    name: "Kia K5",
    plate: "01 V 105 AA",
    status: "CHANGES_REQUESTED",
    primary: false,
    seats: 4,
    luggage: "1 large bag",
  },
];

function statusTone(status: VehicleStatus) {
  if (status === "APPROVED") return "success";
  if (status === "REJECTED" || status === "SUSPENDED" || status === "ARCHIVED") return "danger";
  if (status === "UNDER_REVIEW" || status === "CHANGES_REQUESTED") return "warning";
  return "info";
}

export default function DriverVehiclesPage() {
  const [selected, setSelected] = useState<Vehicle>(vehicles[0]!);
  const missing = useMemo(
    () =>
      selected.status === "DRAFT"
        ? ["Registration certificate", "Front photo", "Plate photo"]
        : selected.status === "CHANGES_REQUESTED"
          ? ["Insurance document needs replacement"]
          : [],
    [selected.status],
  );

  return (
    <main className="nodex-app mobile-shell pb-24">
      <AppHeader title="My vehicles" subtitle="Drafts, documents, photos, and moderation" />
      <div className="space-y-4 px-4">
        <Panel className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="m-0 text-lg font-black">Vehicles</h1>
              <div className="text-sm text-slate-500">
                Approved drivers can submit several cars.
              </div>
            </div>
            <Button>Add vehicle</Button>
          </div>
          <div className="grid gap-2" aria-label="Driver vehicle list">
            {vehicles.map((vehicle) => (
              <button
                key={vehicle.id}
                className="rounded-[var(--radius-md)] border border-[rgb(var(--border))] p-3 text-left"
                onClick={() => setSelected(vehicle)}
                type="button"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold">{vehicle.name}</div>
                    <div className="text-sm text-slate-500">{vehicle.plate}</div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    {vehicle.primary && <Badge tone="success">Primary</Badge>}
                    <Badge tone={statusTone(vehicle.status)}>{vehicle.status}</Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="m-0 text-base font-bold">{selected.name}</h2>
              <div className="text-sm text-slate-500">{selected.plate}</div>
            </div>
            <Badge tone={statusTone(selected.status)}>{selected.status}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
              <span className="block text-slate-500">Seats</span>
              <strong>{selected.seats}</strong>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
              <span className="block text-slate-500">Luggage</span>
              <strong>{selected.luggage}</strong>
            </div>
          </div>
          <div className="grid gap-2">
            <Button>{selected.status === "DRAFT" ? "Continue draft" : "Edit vehicle"}</Button>
            <Button variant="secondary">Upload documents</Button>
            <Button variant="secondary">Upload photos</Button>
            {selected.status === "DRAFT" && <Button variant="secondary">Submit for review</Button>}
            {selected.status === "APPROVED" && !selected.primary && (
              <Button variant="secondary">Set as primary</Button>
            )}
            {selected.status !== "ARCHIVED" && <Button variant="secondary">Archive vehicle</Button>}
          </div>
        </Panel>

        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Review status</h2>
          {missing.length > 0 ? (
            <ul className="m-0 grid gap-2 p-0 text-sm">
              {missing.map((item) => (
                <li
                  key={item}
                  className="list-none rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3"
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-[var(--radius-md)] bg-emerald-50 p-3 text-sm text-emerald-900">
              Vehicle can be used after moderation approval.
            </div>
          )}
        </Panel>

        <Panel>
          <h2 className="m-0 mb-3 text-base font-bold">Decision history</h2>
          <Timeline
            items={[
              { label: "Vehicle draft created", time: "Today", active: true },
              {
                label: "Documents uploaded",
                time: selected.status === "DRAFT" ? "Missing" : "Done",
              },
              { label: "Admin decision", time: selected.status },
            ]}
          />
        </Panel>
      </div>
      <BottomNav
        items={[
          { label: "Verify" },
          { label: "Vehicles", active: true },
          { label: "Trips" },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}
