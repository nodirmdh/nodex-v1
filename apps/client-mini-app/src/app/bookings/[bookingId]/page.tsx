"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatUzs } from "@nodex/ui";
import { Avatar, Card, ClientHeader, ClientShell, Icon, StatusPill } from "../../client-ui";

type DetailState = "upcoming" | "active" | "completed" | "cancelled";

const stateCopy = {
  upcoming: {
    title: "Trip confirmed",
    status: "Upcoming",
    tone: "success" as const,
    body: "Your request is confirmed. Show the boarding code at pickup.",
  },
  active: {
    title: "Trip in progress",
    status: "In progress",
    tone: "info" as const,
    body: "You are on the way to Urgench. Keep trip details available until arrival.",
  },
  completed: {
    title: "Trip completed",
    status: "Completed",
    tone: "accent" as const,
    body: "Thanks for riding. You can leave a review for the driver.",
  },
  cancelled: {
    title: "Request cancelled",
    status: "Cancelled",
    tone: "danger" as const,
    body: "Your seat request is no longer active. You can search again when ready.",
  },
};

export default function BookingDetailPage() {
  const [state, setState] = useState<DetailState>("upcoming");

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("state");
    if (next === "active" || next === "completed" || next === "cancelled") setState(next);
  }, []);

  const copy = stateCopy[state];

  return (
    <ClientShell active="trips">
      <ClientHeader
        backHref="/bookings"
        level="secondary"
        title="Trip status"
        subtitle="Nukus to Urgench"
      />

      <Card className="mt-4 space-y-3" compact label="Booking summary">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="m-0 text-xs font-black uppercase tracking-[0.12em] text-[rgb(var(--primary))]">
              {copy.status}
            </p>
            <h1 className="m-0 mt-1 text-[22px] font-black leading-tight">{copy.title}</h1>
            <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">
              {copy.body}
            </p>
          </div>
          <StatusPill tone={copy.tone}>{copy.status}</StatusPill>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-[22px] bg-[rgb(var(--canvas))] p-3">
          <div>
            <div className="text-2xl font-black">08:30</div>
            <div className="text-sm font-bold text-[rgb(var(--text-muted))]">Nukus</div>
          </div>
          <div className="grid place-items-center text-[rgb(var(--primary))]">
            <Icon name="car" className="h-5 w-5" />
            <span className="text-[11px] font-black text-[rgb(var(--text-muted))]">3h</span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black">11:30</div>
            <div className="text-sm font-bold text-[rgb(var(--text-muted))]">Urgench</div>
          </div>
        </div>
      </Card>

      <Card className="mt-3 space-y-3" compact label="Boarding state">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-black">
              {state === "completed" || state === "cancelled" ? "Trip summary" : "Boarding code"}
            </h2>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              {state === "completed"
                ? "Ride price was arranged directly with the driver."
                : state === "cancelled"
                  ? "This request was cancelled before driver confirmation."
                  : "Show this code to the driver at Nukus Central Station."}
            </p>
          </div>
          <StatusPill tone={state === "active" ? "info" : "warning"}>
            {state === "completed" || state === "cancelled" ? "Archived" : "Expires 10:25"}
          </StatusPill>
        </div>

        {state === "completed" || state === "cancelled" ? (
          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[22px] bg-[rgb(var(--canvas))] p-3">
                <div className="text-xs font-bold text-[rgb(var(--text-muted))]">Seat</div>
                <div className="text-base font-black">Front passenger</div>
              </div>
              <div className="rounded-[22px] bg-[rgb(var(--surface-tint))] p-3">
                <div className="text-xs font-bold text-[rgb(var(--text-muted))]">Listed price</div>
                <div className="text-base font-black">{formatUzs(8500000)}</div>
              </div>
            </div>
            <Link
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline"
              href="/reviews"
            >
              Review driver
            </Link>
          </div>
        ) : (
          <div className="rounded-[22px] border border-dashed border-[rgb(var(--primary)/0.3)] bg-[rgb(var(--surface-tint))] p-3 text-center text-4xl font-black tracking-[0.26em] text-[rgb(var(--primary))]">
            482913
          </div>
        )}
      </Card>

      <Card className="mt-3 space-y-3" compact>
        <div className="flex items-center gap-3">
          <Avatar name="Azizbek Karimov" />
          <div className="min-w-0 flex-1">
            <h2 className="m-0 truncate text-base font-black">Azizbek Karimov</h2>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Chevrolet Cobalt · Front passenger
            </p>
          </div>
          <StatusPill tone="accent">4.9</StatusPill>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline"
            href="/messages/driver-azizbek"
          >
            Message driver
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--canvas))] px-4 text-sm font-black text-[rgb(var(--primary))] no-underline"
            href="/safety"
          >
            Safety
          </Link>
        </div>
      </Card>

      <Card className="mt-3 space-y-2.5" compact label="Trip operation status">
        <h2 className="m-0 text-base font-black">Route progress</h2>
        {[
          ["Pickup", "Nukus Central Station", true],
          ["In progress", "Estimated arrival 11:30", state === "active" || state === "completed"],
          ["Completed", "Summary and review ready after arrival", state === "completed"],
        ].map(([label, text, active]) => (
          <div key={label as string} className="grid grid-cols-[20px_1fr_auto] gap-3">
            <span
              className={[
                "mt-1 h-3 w-3 rounded-full",
                active ? "bg-[rgb(var(--primary))]" : "bg-[rgb(var(--border-strong))]",
              ].join(" ")}
            />
            <div>
              <div className="text-sm font-black">{label}</div>
              <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">{text}</div>
            </div>
            {active ? <Icon name="check" className="h-4 w-4 text-[rgb(var(--primary))]" /> : null}
          </div>
        ))}
      </Card>

      <Card className="mt-3 space-y-3" compact>
        <h2 className="m-0 text-base font-black">Next action</h2>
        {state === "completed" ? (
          <Link
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline"
            href="/reviews"
          >
            Review driver
          </Link>
        ) : (
          <button
            className="min-h-11 w-full rounded-full bg-[rgb(var(--canvas))] px-4 text-sm font-black text-[rgb(var(--text-muted))]"
            type="button"
            onClick={() => setState("cancelled")}
          >
            Cancel request
          </button>
        )}
      </Card>
    </ClientShell>
  );
}
