"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DriverCard, DriverHeader, DriverIconView, DriverPill, DriverShell } from "../driver-ui";

type TripState = "boarding" | "active" | "completed";

const passengers = [
  { name: "A. Karimov", initials: "AK", seat: "Front passenger", status: "Boarded" },
  { name: "M. Seitov", initials: "MS", seat: "Rear left", status: "Confirmed" },
  { name: "D. Allamuratov", initials: "DA", seat: "Rear right", status: "No-show" },
];

const parcels = [
  {
    title: "Small parcel",
    detail: "Nukus Central Station → Urgench Bus Station",
    status: "Accepted",
  },
];

export default function TripOperationDemo() {
  const [state, setState] = useState<TripState>("boarding");
  const [finishSheet, setFinishSheet] = useState(false);
  const [startPin, setStartPin] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextState = params.get("state");
    if (nextState === "active" || nextState === "completed") setState(nextState);
    setFinishSheet(params.get("sheet") === "finish");
  }, []);

  const isActive = state === "active";
  const isCompleted = state === "completed";
  const boarded = 2;

  return (
    <DriverShell active="trips">
      <DriverHeader
        title={isActive ? "In progress" : isCompleted ? "Completed" : "Trip detail"}
        subtitle="Nukus → Urgench · Chevrolet Cobalt"
        status={
          <DriverPill tone={isCompleted ? "success" : isActive ? "warning" : "info"}>
            {isCompleted ? "Completed" : isActive ? "In progress" : "Boarding"}
          </DriverPill>
        }
      />

      <DriverCard
        className={[
          "mt-4 space-y-3",
          isActive ? "ring-2 ring-[rgb(var(--primary)/0.24)]" : "",
        ].join(" ")}
        label="Trip operation detail"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-2xl font-black">Nukus → Urgench</h1>
            <p
              className={[
                "m-0 mt-1 text-sm font-semibold",
                isActive ? "text-[rgb(var(--primary))]" : "text-[rgb(var(--text-muted))]",
              ].join(" ")}
            >
              Today, 08:30 · 95 A 214 QA
            </p>
          </div>
          <DriverIconView name={isActive ? "car" : "route"} className="h-6 w-6" />
        </div>
        <div
          className={[
            "grid grid-cols-3 gap-2 rounded-[20px] p-3 text-center",
            isActive ? "bg-[rgb(var(--surface-tint))]" : "bg-[rgb(var(--canvas))]",
          ].join(" ")}
        >
          <Metric label="Reserved" value="3/4" active={isActive} />
          <Metric label="Boarded" value={`${boarded}/3`} active={isActive} />
          <Metric label="Pending" value={isCompleted ? "0" : "1"} active={isActive} />
        </div>
        {isActive ? (
          <p className="m-0 text-sm font-semibold opacity-80">
            Trip is underway. Keep passenger contact and parcel handoff visible until arrival.
          </p>
        ) : isCompleted ? (
          <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
            Trip completed with 2 passengers carried and no-show history preserved.
          </p>
        ) : (
          <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
            Confirm boarding before starting. Existing confirmed passengers remain accessible.
          </p>
        )}
      </DriverCard>

      {!isCompleted && (
        <DriverCard className="mt-3 space-y-3" label="Trip next operation">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-lg font-black">
                {isActive ? "Finish when arrived" : "Start trip to Urgench?"}
              </h2>
              <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                {isActive
                  ? "Confirm passengers and parcels before completing."
                  : "2 of 3 boarded · 1 passenger unresolved."}
              </p>
            </div>
            <DriverPill tone={isActive ? "warning" : "info"}>
              {isActive ? "Arrival" : "Ready"}
            </DriverPill>
          </div>
          {!isActive ? (
            <div className="grid gap-2 rounded-[20px] bg-[rgb(var(--canvas))] p-3">
              <label
                className="text-xs font-black uppercase tracking-[0.12em] text-[rgb(var(--primary))]"
                htmlFor="trip-start-pin"
              >
                Passenger start PIN
              </label>
              <input
                id="trip-start-pin"
                className="min-h-12 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 text-center text-xl font-black tracking-[0.25em] outline-none"
                inputMode="numeric"
                maxLength={4}
                onChange={(event) => setStartPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                value={startPin}
              />
              <p className="m-0 text-xs font-semibold text-[rgb(var(--text-muted))]">
                Start is enabled after the passenger PIN is verified by the API.
              </p>
            </div>
          ) : null}
          <button
            className="min-h-12 w-full rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] disabled:opacity-50"
            disabled={!isActive && startPin.length !== 4}
            onClick={() => (isActive ? setFinishSheet(true) : setState("active"))}
            type="button"
          >
            {isActive ? "Finish trip" : "Verify PIN and start trip"}
          </button>
          {finishSheet && (
            <FinishSheet
              onFinish={() => {
                setState("completed");
                setFinishSheet(false);
              }}
            />
          )}
        </DriverCard>
      )}

      <DriverCard className="mt-3 space-y-3" label="Seat occupancy">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-black">Seat occupancy</h2>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              4 passenger seats · 3 reserved · 1 available
            </p>
          </div>
          <DriverPill tone="accent">75%</DriverPill>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            ["Front", "Boarded"],
            ["Rear L", isCompleted ? "Boarded" : "Confirmed"],
            ["Rear R", "No-show"],
            ["Rear C", "Available"],
          ].map(([seat, status]) => (
            <div
              key={seat}
              className={[
                "rounded-[16px] p-2 text-center text-[10px] font-black",
                status === "Boarded"
                  ? "bg-[rgb(var(--success-soft))] text-[rgb(var(--success))]"
                  : status === "No-show"
                    ? "bg-[rgb(var(--destructive-soft))] text-[rgb(var(--destructive))]"
                    : status === "Confirmed"
                      ? "bg-[rgb(var(--info-soft))] text-[rgb(var(--info))]"
                      : "bg-[rgb(var(--canvas))] text-[rgb(var(--text-muted))]",
              ].join(" ")}
            >
              <div>{seat}</div>
              <div className="mt-1 font-bold">{status}</div>
            </div>
          ))}
        </div>
      </DriverCard>

      <DriverCard className="mt-3 space-y-3" label="Passenger operations">
        <div className="flex items-center justify-between gap-3">
          <h2 className="m-0 text-lg font-black">Passengers</h2>
          <Link
            className="text-sm font-black text-[rgb(var(--primary))] no-underline"
            href="/passengers-demo?view=passengers"
          >
            Manage
          </Link>
        </div>
        {passengers.map((passenger) => (
          <div
            key={passenger.name}
            className="flex items-center gap-3 rounded-[18px] bg-[rgb(var(--canvas))] p-3"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-xs font-black text-[rgb(var(--primary))]">
              {passenger.initials}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-black">{passenger.name}</div>
              <div className="truncate text-xs font-semibold text-[rgb(var(--text-muted))]">
                {passenger.seat}
              </div>
            </div>
            <PassengerStatusPill
              status={
                isCompleted && passenger.status === "Confirmed" ? "Boarded" : passenger.status
              }
            />
          </div>
        ))}
      </DriverCard>

      <DriverCard className="mt-3 space-y-3" label="Parcel context">
        <div className="flex items-center justify-between gap-3">
          <h2 className="m-0 text-lg font-black">Parcels</h2>
          <DriverPill tone="info">1 item</DriverPill>
        </div>
        {parcels.map((parcel) => (
          <div key={parcel.title} className="rounded-[18px] bg-[rgb(var(--canvas))] p-3">
            <div className="text-sm font-black">{parcel.title}</div>
            <div className="mt-1 text-xs font-semibold text-[rgb(var(--text-muted))]">
              {parcel.detail}
            </div>
            <div className="mt-2 text-xs font-black text-[rgb(var(--primary))]">
              {parcel.status}
            </div>
          </div>
        ))}
      </DriverCard>
    </DriverShell>
  );
}

function FinishSheet({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="rounded-[22px] bg-[rgb(var(--foreground))] p-4 text-[rgb(var(--primary-foreground))] shadow-[var(--shadow-floating)]">
      <h3 className="m-0 text-lg font-black">Finish trip?</h3>
      <p className="m-0 mt-1 text-sm font-semibold opacity-80">
        Nukus → Urgench · 3 passengers · 1 parcel
      </p>
      <button
        className="mt-3 min-h-11 w-full rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))]"
        type="button"
        onClick={onFinish}
      >
        Confirm finish trip
      </button>
    </div>
  );
}

function PassengerStatusPill({ status }: { status: string }) {
  return (
    <DriverPill tone={status === "Boarded" ? "success" : status === "No-show" ? "danger" : "info"}>
      {status}
    </DriverPill>
  );
}

function Metric({
  label,
  value,
  active = false,
}: {
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div>
      <div className="text-sm font-black">{value}</div>
      <div
        className={[
          "text-[10px] font-bold",
          active ? "opacity-70" : "text-[rgb(var(--text-muted))]",
        ].join(" ")}
      >
        {label}
      </div>
    </div>
  );
}
