"use client";

import { useEffect, useState } from "react";
import { DriverCard, DriverHeader, DriverIconView, DriverPill, DriverShell } from "../driver-ui";

type VehicleState = "list" | "edit";

const vehicles = [
  {
    name: "Chevrolet Cobalt",
    plate: "95 A 214 QA",
    color: "White",
    seats: "4 passenger seats",
    layout: "Sedan",
    status: "Approved",
    tone: "success" as const,
    primary: true,
  },
  {
    name: "Chevrolet Tracker",
    plate: "95 B 412 QA",
    color: "Silver",
    seats: "4 passenger seats",
    layout: "SUV",
    status: "Under review",
    tone: "warning" as const,
    primary: false,
  },
];

export default function DriverVehiclesPage() {
  const [mode, setMode] = useState<VehicleState>("list");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "edit") setMode("edit");
  }, []);

  return (
    <DriverShell active="profile">
      <DriverHeader
        title="Vehicles"
        subtitle="Cars and capacity"
        status={<DriverPill tone="success">1 active</DriverPill>}
      />

      {mode === "list" ? (
        <>
          <DriverCard className="mt-4 space-y-3" label="Current vehicle">
            <div className="flex gap-3">
              <div className="grid h-24 w-28 shrink-0 place-items-center rounded-[22px] bg-[rgb(var(--canvas))] text-[rgb(var(--primary))]">
                <DriverIconView name="car" className="h-8 w-8" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h1 className="m-0 text-lg font-black">{vehicles[0]!.name}</h1>
                    <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                      {vehicles[0]!.plate} · {vehicles[0]!.color}
                    </p>
                  </div>
                  <DriverPill tone="success">Approved</DriverPill>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold">
                  <Info label="Layout" value={vehicles[0]!.layout} />
                  <Info label="Capacity" value={vehicles[0]!.seats} />
                </div>
              </div>
            </div>
            <button
              className="min-h-11 w-full rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))]"
              onClick={() => setMode("edit")}
              type="button"
            >
              Manage vehicle
            </button>
          </DriverCard>

          <section aria-label="Driver vehicle list" className="mt-3 space-y-3">
            {vehicles.map((vehicle) => (
              <DriverCard key={vehicle.plate}>
                <div className="flex items-center gap-3">
                  <div className="grid h-14 w-16 shrink-0 place-items-center rounded-[18px] bg-[rgb(var(--canvas))] text-[rgb(var(--primary))]">
                    <DriverIconView name="car" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="m-0 truncate text-base font-black">{vehicle.name}</h2>
                    <p className="m-0 truncate text-sm font-semibold text-[rgb(var(--text-muted))]">
                      {vehicle.plate} · {vehicle.layout} · {vehicle.seats}
                    </p>
                  </div>
                  <DriverPill tone={vehicle.tone}>{vehicle.status}</DriverPill>
                </div>
              </DriverCard>
            ))}
          </section>

          <button
            className="mt-3 min-h-12 w-full rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))]"
            type="button"
          >
            Add vehicle
          </button>
        </>
      ) : (
        <DriverVehicleEdit onBack={() => setMode("list")} />
      )}
    </DriverShell>
  );
}

function DriverVehicleEdit({ onBack }: { onBack: () => void }) {
  return (
    <section aria-label="Vehicle edit form" className="mt-4 space-y-3">
      <DriverCard className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="m-0 text-xl font-black">Edit vehicle</h1>
          <button
            className="border-0 bg-transparent text-sm font-black text-[rgb(var(--primary))]"
            onClick={onBack}
            type="button"
          >
            Done
          </button>
        </div>
        <FieldGroup
          title="Vehicle"
          fields={[
            ["Model", "Chevrolet Cobalt"],
            ["Color", "White"],
          ]}
        />
        <FieldGroup title="Registration" fields={[["Plate", "95 A 214 QA"]]} />
        <FieldGroup
          title="Capacity"
          fields={[
            ["Layout", "Sedan"],
            ["Passenger seats", "4"],
          ]}
        />
        <DriverCard className="bg-[rgb(var(--canvas))] shadow-none" label="Seat layout summary">
          <div className="text-sm font-black">Sedan</div>
          <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">
            4 passenger seats · front passenger + rear row
          </div>
        </DriverCard>
        <button
          className="min-h-12 w-full rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))]"
          type="button"
        >
          Save vehicle
        </button>
      </DriverCard>
    </section>
  );
}

function FieldGroup({ title, fields }: { title: string; fields: Array<[string, string]> }) {
  return (
    <div>
      <h2 className="m-0 mb-2 text-sm font-black">{title}</h2>
      <div className="grid gap-2">
        {fields.map(([label, value]) => (
          <label key={label} className="grid gap-1 text-xs font-bold text-[rgb(var(--text-muted))]">
            {label}
            <input
              className="min-h-11 rounded-[16px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm font-black text-[rgb(var(--foreground))]"
              defaultValue={value}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-[rgb(var(--canvas))] p-2">
      <div className="text-[10px] text-[rgb(var(--text-muted))]">{label}</div>
      <div className="mt-1 text-[11px] font-black">{value}</div>
    </div>
  );
}
