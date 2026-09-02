"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatUzs } from "@nodex/ui";
import { DriverCard, DriverHeader, DriverIconView, DriverPill, DriverShell } from "../driver-ui";

type PassengerStatus = "Confirmed" | "Boarded" | "No-show";
type ViewMode = "requests" | "boarding" | "passengers";

const requests = [
  {
    id: "request-front",
    initials: "NK",
    name: "Nodex Client",
    seat: "Front passenger",
    count: "1 passenger",
    trip: "Nukus → Urgench, tomorrow 08:30",
    totalMinor: 8500000,
    luggage: "Small luggage",
    note: "Can board at Nukus Central Station.",
    submitted: "4 min ago",
  },
  {
    id: "request-rear",
    initials: "AS",
    name: "Aziza Seitova",
    seat: "Rear left",
    count: "1 passenger",
    trip: "Nukus → Urgench, tomorrow 08:30",
    totalMinor: 8500000,
    luggage: "Backpack",
    note: "Travelling with parcel handoff.",
    submitted: "12 min ago",
  },
];

const passengers: Array<{
  id: string;
  initials: string;
  name: string;
  status: PassengerStatus;
  seat: string;
  boarding: string;
  note: string;
  totalMinor: number;
}> = [
  {
    id: "booking-1",
    initials: "AK",
    name: "A. Karimov",
    status: "Boarded",
    seat: "Front passenger",
    boarding: "Code verified",
    note: "Small luggage · cash with driver",
    totalMinor: 8500000,
  },
  {
    id: "booking-2",
    initials: "MS",
    name: "M. Seitov",
    status: "Confirmed",
    seat: "Rear left",
    boarding: "Waiting for code",
    note: "Manual transfer arranged directly",
    totalMinor: 8500000,
  },
  {
    id: "booking-3",
    initials: "DA",
    name: "D. Allamuratov",
    status: "No-show",
    seat: "Rear right",
    boarding: "Marked at 08:20",
    note: "No-show recorded by driver",
    totalMinor: 8500000,
  },
];

function passengerTone(status: PassengerStatus) {
  if (status === "Boarded") return "success";
  if (status === "No-show") return "danger";
  return "info";
}

export default function PassengersDemo() {
  const [code, setCode] = useState("");
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [acceptSheet, setAcceptSheet] = useState<string | null>(null);
  const [acceptedRequest, setAcceptedRequest] = useState("");
  const [rejectedRequests, setRejectedRequests] = useState<string[]>([]);
  const [confirmedBoarding, setConfirmedBoarding] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("requests");
  const [avoidPassenger, setAvoidPassenger] = useState<typeof passengers[number] | null>(null);
  const [avoidReason, setAvoidReason] = useState("грубое общение");
  const [avoidedPassengerIds, setAvoidedPassengerIds] = useState<string[]>([]);
  const boardedCount = passengers.filter((passenger) => passenger.status === "Boarded").length;
  const noShowCount = passengers.filter((passenger) => passenger.status === "No-show").length;
  const pendingCount = passengers.filter((passenger) => passenger.status === "Confirmed").length;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSubscriptionExpired(params.get("subscription") === "expired");
    setAcceptSheet(params.get("sheet") === "accept" ? requests[0]!.id : null);
    const nextView = params.get("view");
    if (nextView === "boarding" || nextView === "passengers") setViewMode(nextView);
  }, []);

  return (
    <DriverShell active="requests">
      <DriverHeader
        title={viewMode === "requests" ? "Requests" : "Passengers"}
        subtitle="Seat requests and boarding"
        status={
          <DriverPill tone={subscriptionExpired ? "warning" : "success"}>
            {subscriptionExpired ? "Limited" : "Active"}
          </DriverPill>
        }
      />

      <DriverCard className="mt-4 space-y-3" label="Driver operation dashboard">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-xl font-black">Nukus → Urgench</h1>
            <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Boarding · Chevrolet Cobalt · 08:30
            </p>
          </div>
          <DriverPill tone="warning">Boarding</DriverPill>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <Metric label="Total" value={String(passengers.length)} />
          <Metric label="Boarded" value={String(boardedCount)} />
          <Metric label="Pending" value={String(pendingCount)} />
          <Metric label="No-show" value={String(noShowCount)} />
        </div>
      </DriverCard>

      {subscriptionExpired && (
        <DriverCard
          className="mt-3 space-y-2 ring-1 ring-[rgb(var(--warning)/0.22)]"
          label="Subscription request guard"
        >
          <div className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[rgb(var(--warning-soft))] text-[rgb(var(--warning))]">
              <DriverIconView name="lock" />
            </span>
            <div>
              <h2 className="m-0 text-base font-black">Accepting is paused</h2>
              <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                Activate subscription to accept new passenger requests.
              </p>
            </div>
          </div>
        </DriverCard>
      )}

      <div className="mt-3 grid grid-cols-3 gap-1 rounded-full bg-[rgb(var(--surface))] p-1 shadow-[var(--shadow-xs)]">
        {[
          ["requests", "Requests"],
          ["boarding", "Boarding"],
          ["passengers", "Passengers"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={viewMode === key}
            className={[
              "min-h-10 rounded-full border-0 text-xs font-black",
              viewMode === key
                ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                : "bg-transparent text-[rgb(var(--text-muted))]",
            ].join(" ")}
            onClick={() => setViewMode(key as ViewMode)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {viewMode === "requests" && (
        <section aria-label="Driver seat request list" className="mt-3 space-y-3">
          {requests.map((request) => {
            const rejected = rejectedRequests.includes(request.id);
            const accepted = acceptedRequest === request.id;

            return (
              <DriverCard
                key={request.id}
                className="space-y-3"
                label={`Passenger request ${request.name}`}
              >
                <div className="flex items-start gap-3">
                  <Avatar initials={request.initials} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="m-0 text-lg font-black">{request.name}</h2>
                        <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                          {request.count} · {request.submitted}
                        </p>
                      </div>
                      <DriverPill tone="accent">{formatUzs(request.totalMinor)}</DriverPill>
                    </div>
                    <div className="mt-3 rounded-[18px] bg-[rgb(var(--canvas))] p-3 text-sm">
                      <div className="font-black">{request.seat}</div>
                      <div className="mt-1 font-semibold text-[rgb(var(--text-muted))]">
                        {request.trip}
                      </div>
                      <div className="mt-2 text-xs font-bold text-[rgb(var(--text-muted))]">
                        {request.luggage} · {request.note}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_1fr] gap-2">
                  <button
                    className="min-h-11 rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] disabled:bg-[rgb(var(--warning-soft))] disabled:text-[rgb(var(--warning))]"
                    disabled={subscriptionExpired}
                    onClick={() => setAcceptSheet(request.id)}
                    type="button"
                  >
                    {subscriptionExpired
                      ? "Activation required"
                      : accepted
                        ? "Accepted"
                        : "Accept request"}
                  </button>
                  <button
                    className="min-h-11 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 text-sm font-black text-[rgb(var(--text-muted))]"
                    type="button"
                    onClick={() => {
                      setRejectedRequests((current) =>
                        current.includes(request.id) ? current : [...current, request.id],
                      );
                      setAcceptSheet(null);
                    }}
                  >
                    {rejected ? "Rejected" : "Reject"}
                  </button>
                </div>
                {acceptSheet === request.id && !subscriptionExpired && (
                  <AcceptSheet
                    onConfirm={() => {
                      setAcceptedRequest(request.id);
                      setAcceptSheet(null);
                      setViewMode("boarding");
                    }}
                  />
                )}
              </DriverCard>
            );
          })}
        </section>
      )}

      {viewMode === "boarding" && (
        <DriverCard className="mt-3 space-y-3" label="Boarding code verification">
          <div className="flex items-start gap-3">
            <Avatar initials="MS" />
            <div>
              <h2 className="m-0 text-lg font-black">M. Seitov</h2>
              <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                Rear left · waiting for boarding code
              </p>
            </div>
          </div>
          <label className="grid gap-1 text-sm">
            <span className="font-black">Code</span>
            <input
              aria-label="Boarding code"
              className="min-h-14 rounded-[18px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-center text-xl font-black tracking-[0.28em] text-[rgb(var(--foreground))]"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              placeholder="_ _ _ _ _ _"
              value={code}
            />
          </label>
          <button
            className="min-h-12 w-full rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] disabled:bg-[rgb(var(--canvas))] disabled:text-[rgb(var(--text-muted))]"
            disabled={code.length < 6}
            type="button"
            onClick={() => setConfirmedBoarding(true)}
          >
            {confirmedBoarding ? "Boarding confirmed" : "Confirm boarding"}
          </button>
          <p className="m-0 text-xs font-semibold text-[rgb(var(--text-muted))]">
            Enter the passenger code exactly as shown in their app.
          </p>
        </DriverCard>
      )}

      {viewMode === "passengers" && (
        <section aria-label="Driver booking list" className="mt-3 space-y-3">
          {passengers.map((passenger) => (
            <PassengerRow key={passenger.id} passenger={passenger} avoided={avoidedPassengerIds.includes(passenger.id)} onAvoid={() => setAvoidPassenger(passenger)} />
          ))}
        </section>
      )}

      {avoidPassenger ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/35 px-3 pb-3" role="dialog" aria-modal="true" aria-label="Не брать пассажира">
          <div className="w-full max-w-[430px] rounded-[28px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-floating)]">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[rgb(var(--border-strong))]" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="m-0 text-lg font-black">Не брать пассажира?</h3>
                <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">{avoidPassenger.name} · {avoidPassenger.seat}</p>
              </div>
              <button aria-label="Закрыть" className="grid h-9 w-9 place-items-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] text-sm font-black" onClick={() => setAvoidPassenger(null)} type="button">×</button>
            </div>
            <div className="mt-3 grid gap-2">
              {["грубое общение", "опоздание", "не понравилась поездка", "другое"].map((reason) => (
                <button key={reason} className={`min-h-10 rounded-[16px] border px-3 text-left text-sm font-black ${avoidReason === reason ? "border-[rgb(var(--primary))] bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]" : "border-[rgb(var(--border))] bg-[rgb(var(--canvas))] text-[rgb(var(--foreground))]"}`} onClick={() => setAvoidReason(reason)} type="button">
                  {reason}
                </button>
              ))}
            </div>
            <button className="mt-3 min-h-12 w-full rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))]" onClick={() => { setAvoidedPassengerIds((current) => current.includes(avoidPassenger.id) ? current : [...current, avoidPassenger.id]); setAvoidPassenger(null); }} type="button">
              Подтвердить
            </button>
          </div>
        </div>
      ) : null}

      <DriverCard className="mt-3 space-y-3" label="Trip operations">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-black">Next action</h2>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Confirm remaining passenger before departure.
            </p>
          </div>
          <Link
            className="inline-flex min-h-10 min-w-[96px] shrink-0 items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline"
            href="/trip-demo"
          >
            Open trip
          </Link>
        </div>
      </DriverCard>
    </DriverShell>
  );
}

function AcceptSheet({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="rounded-[22px] bg-[rgb(var(--foreground))] p-4 text-[rgb(var(--primary-foreground))] shadow-[var(--shadow-floating)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="m-0 text-lg font-black">Accept seat request?</h3>
          <p className="m-0 mt-1 text-sm font-semibold opacity-80">
            Nodex Client · Front passenger · Nukus → Urgench
          </p>
        </div>
        <DriverPill tone="accent">Reserve seat</DriverPill>
      </div>
      <p className="m-0 mt-3 text-sm font-semibold opacity-80">
        After acceptance the seat becomes reserved and confirmed passenger contact is available.
      </p>
      <button
        className="mt-3 min-h-11 w-full rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))]"
        type="button"
        onClick={onConfirm}
      >
        Confirm acceptance
      </button>
    </div>
  );
}

function PassengerRow({
  passenger,
  avoided,
  onAvoid,
}: {
  passenger: {
    initials: string;
    name: string;
    status: PassengerStatus;
    seat: string;
    boarding: string;
    note: string;
    totalMinor: number;
  };
  avoided: boolean;
  onAvoid: () => void;
}) {
  return (
    <DriverCard className="space-y-3" label={`Passenger ${passenger.name}`}>
      <div className="flex items-start gap-3">
        <Avatar initials={passenger.initials} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="m-0 text-base font-black">{passenger.name}</h2>
              <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                {passenger.seat} · {formatUzs(passenger.totalMinor)}
              </p>
            </div>
            <DriverPill tone={passengerTone(passenger.status)}>{passenger.status}</DriverPill>
          </div>
          <div className="mt-3 rounded-[18px] bg-[rgb(var(--canvas))] p-3 text-sm">
            <div className="font-black">{passenger.boarding}</div>
            <div className="mt-1 font-semibold text-[rgb(var(--text-muted))]">{passenger.note}</div>
          </div>
        </div>
      </div>
      {avoided ? <div className="rounded-[16px] bg-[rgb(var(--warning-soft))] p-3 text-xs font-black text-[rgb(var(--warning))]">Этот пассажир больше не будет предлагаться вам.</div> : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-full border-0 bg-[rgb(var(--canvas))] text-xs font-black text-[rgb(var(--primary))] no-underline"
          href="/messages/parcel-sender"
        >
          Chat
        </Link>
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-full border-0 bg-[rgb(var(--canvas))] text-xs font-black text-[rgb(var(--primary))] no-underline"
          href="/messages/parcel-sender"
        >
          Contact
        </Link>
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-xs font-black text-[rgb(var(--text-muted))] no-underline"
          href="/passengers-demo?view=passengers&marked=no-show"
        >
          No-show
        </Link>
        <button
          className="min-h-10 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-xs font-black text-[rgb(var(--text-muted))]"
          onClick={onAvoid}
          type="button"
        >
          Не брать
        </button>
      </div>
    </DriverCard>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-sm font-black text-[rgb(var(--primary))]">
      {initials}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-[rgb(var(--canvas))] p-2">
      <div className="text-sm font-black">{value}</div>
      <div className="text-[10px] font-bold text-[rgb(var(--text-muted))]">{label}</div>
    </div>
  );
}
