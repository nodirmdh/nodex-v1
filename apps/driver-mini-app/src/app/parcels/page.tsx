"use client";

import { useState } from "react";
import { AppHeader, Badge, BottomNav, Button, Panel, Timeline } from "@nodex/ui";

const parcels = [
  {
    id: "phase8-parcel-accepted",
    title: "Small electronics",
    route: "Nukus to Khiva",
    sender: "A. Karimov",
    recipient: "M. Seitov",
    status: "ACCEPTED",
  },
  {
    id: "phase8-parcel-transit",
    title: "Documents envelope",
    route: "Nukus to Urgench",
    sender: "D. Allamuratov",
    recipient: "R. Matyakubov",
    status: "IN_TRANSIT",
  },
];

function tone(status: string) {
  if (status === "DELIVERED") return "success";
  if (status === "ACCEPTED") return "warning";
  if (status === "IN_TRANSIT" || status === "READY_FOR_PICKUP") return "info";
  return "neutral";
}

export default function DriverParcelsPage() {
  const [code, setCode] = useState("");
  const selected = parcels[0]!;

  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="Parcel operations" subtitle="Handover, transit, pickup, and issues" />
      <div className="space-y-4 px-4">
        <Panel className="space-y-3" aria-label="Driver parcel dashboard">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="m-0 text-xl font-black">Trip parcels</h1>
              <p className="m-0 text-sm text-slate-500">Only approved trip parcels are shown.</p>
            </div>
            <Badge tone="info">{parcels.length} active</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
              <strong>1</strong>
              <span className="block text-xs text-slate-500">Accepted</span>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
              <strong>1</strong>
              <span className="block text-xs text-slate-500">Transit</span>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[rgb(var(--surface-muted))] p-3">
              <strong>0</strong>
              <span className="block text-xs text-slate-500">Issues</span>
            </div>
          </div>
        </Panel>

        <section aria-label="Driver parcel list" className="space-y-3">
          {parcels.map((parcel) => (
            <Panel key={parcel.id} className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="m-0 text-base font-bold">{parcel.title}</h2>
                  <p className="m-0 text-sm text-slate-500">
                    {parcel.route} - {parcel.sender} to {parcel.recipient}
                  </p>
                </div>
                <Badge tone={tone(parcel.status)}>{parcel.status}</Badge>
              </div>
            </Panel>
          ))}
        </section>

        <Panel className="space-y-3" aria-label="Parcel code verification">
          <h2 className="m-0 text-base font-bold">Verify selected parcel</h2>
          <p className="m-0 text-sm text-slate-500">{selected.title}</p>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">Numeric code</span>
            <input
              className="min-h-12 rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-white px-3 text-center text-xl font-bold tracking-[0.2em]"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              value={code}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button disabled={code.length < 4} type="button">
              Confirm handover
            </Button>
            <Button type="button" variant="secondary">
              Ready for pickup
            </Button>
            <Button type="button" variant="secondary">
              Confirm delivery
            </Button>
            <Button type="button" variant="secondary">
              Report issue
            </Button>
          </div>
        </Panel>

        <Panel aria-label="Driver parcel timeline">
          <Timeline
            items={[
              { label: "Accepted", time: "Driver", active: true },
              { label: "Handover code required", time: "Sender", active: true },
              { label: "Pickup code required", time: "Recipient" },
            ]}
          />
        </Panel>
      </div>
      <BottomNav items={[{ label: "Trips" }, { label: "Parcels", active: true }, { label: "Vehicles" }, { label: "Profile" }]} />
    </main>
  );
}
