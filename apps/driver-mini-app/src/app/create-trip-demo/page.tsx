"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, formatUzs } from "@nodex/ui";
import { DriverCard, DriverHeader, DriverPill, DriverShell } from "../driver-ui";

const cities = ["Nukus", "Urgench", "Khiva", "Kungrad"];
const vehicles = ["Chevrolet Cobalt · 95 A 214 QA", "Chevrolet Tracker · 95 B 412 QA"];
const tariffs = ["Стандарт", "Комфорт", "Премиум"];

type Step = "route" | "vehicle" | "seats" | "price" | "published";

export default function CreateTripDemo() {
  const [step, setStep] = useState<Step>("route");
  const [origin, setOrigin] = useState("Nukus");
  const [destination, setDestination] = useState("Urgench");
  const [departure, setDeparture] = useState("2026-09-03T08:30");
  const [vehicle, setVehicle] = useState(vehicles[0]!);
  const [seats, setSeats] = useState(4);
  const [tariff, setTariff] = useState(tariffs[1]!);
  const [priceMinor, setPriceMinor] = useState(8500000);
  const [parcel, setParcel] = useState(true);
  const canPublish = origin !== destination && departure && seats > 0 && priceMinor > 0;
  const route = `${origin} -> ${destination}`;
  const steps: Step[] = ["route", "vehicle", "seats", "price"];
  const stepIndex = Math.max(steps.indexOf(step), 0);
  const summary = useMemo(() => ({ route, departure, vehicle, seats, tariff, priceMinor, parcel }), [departure, parcel, priceMinor, route, seats, tariff, vehicle]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("return") === "1") {
      setOrigin("Urgench");
      setDestination("Nukus");
      setDeparture("2026-09-03T17:30");
      setStep("price");
    }
  }, []);

  function nextStep() {
    setStep(steps[Math.min(stepIndex + 1, steps.length - 1)]!);
  }

  return (
    <DriverShell active="trips">
      <DriverHeader title="Create trip" subtitle="Route, vehicle, seats and price" status={<DriverPill tone={canPublish ? "success" : "warning"}>{canPublish ? "Ready" : "Check"}</DriverPill>} />

      <DriverCard className="mt-4 space-y-3" label="Create trip steps">
        <div className="grid grid-cols-4 gap-1 rounded-full bg-[rgb(var(--canvas))] p-1">
          {steps.map((item, index) => (
            <button key={item} className={["min-h-9 rounded-full text-[11px] font-black", step === item ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : index < stepIndex ? "bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]" : "text-[rgb(var(--text-muted))]"].join(" ")} type="button" onClick={() => setStep(item)}>
              {item === "route" ? "Route" : item === "vehicle" ? "Vehicle" : item === "seats" ? "Seats" : "Price"}
            </button>
          ))}
        </div>
      </DriverCard>

      {step === "route" ? (
        <DriverCard className="mt-3 space-y-3" label="Route selection">
          <Select label="Origin" value={origin} options={cities} onChange={setOrigin} />
          <Select label="Destination" value={destination} options={cities} onChange={setDestination} />
          <label className="grid gap-1 text-sm font-black">Departure<input className="min-h-11 rounded-[18px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3" type="datetime-local" value={departure} onChange={(event) => setDeparture(event.target.value)} /></label>
          <Button className="w-full" type="button" onClick={nextStep}>Continue</Button>
        </DriverCard>
      ) : null}

      {step === "vehicle" ? (
        <DriverCard className="mt-3 space-y-3" label="Vehicle selection">
          {vehicles.map((item) => <button key={item} className={["min-h-14 rounded-[18px] px-3 text-left text-sm font-black", vehicle === item ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "bg-[rgb(var(--canvas))]"].join(" ")} type="button" onClick={() => setVehicle(item)}>{item}</button>)}
          <Button className="w-full" type="button" onClick={nextStep}>Continue</Button>
        </DriverCard>
      ) : null}

      {step === "seats" ? (
        <DriverCard className="mt-3 space-y-3" label="Seats and parcel options">
          <div className="flex items-center justify-between rounded-[18px] bg-[rgb(var(--canvas))] p-3"><span className="text-sm font-black">Seats</span><div className="flex items-center gap-2"><button className="h-9 w-9 rounded-full bg-[rgb(var(--surface))] text-lg font-black" type="button" onClick={() => setSeats((value) => Math.max(1, value - 1))}>-</button><strong>{seats}</strong><button className="h-9 w-9 rounded-full bg-[rgb(var(--primary))] text-lg font-black text-[rgb(var(--primary-foreground))]" type="button" onClick={() => setSeats((value) => Math.min(7, value + 1))}>+</button></div></div>
          <button className={["min-h-12 rounded-[18px] px-3 text-left text-sm font-black", parcel ? "bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]" : "bg-[rgb(var(--canvas))]"].join(" ")} type="button" onClick={() => setParcel((value) => !value)}>{parcel ? "Parcel enabled" : "Parcel disabled"}</button>
          <Button className="w-full" type="button" onClick={nextStep}>Continue</Button>
        </DriverCard>
      ) : null}

      {step === "price" ? (
        <DriverCard className="mt-3 space-y-3" label="Tariff and price">
          <div className="grid grid-cols-3 gap-2">{tariffs.map((item) => <button key={item} className={["min-h-11 rounded-full text-xs font-black", tariff === item ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "bg-[rgb(var(--canvas))]"].join(" ")} type="button" onClick={() => setTariff(item)}>{item}</button>)}</div>
          <label className="grid gap-1 text-sm font-black">Price per seat<input className="min-h-11 rounded-[18px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3" type="number" step={500000} min={1000000} value={priceMinor} onChange={(event) => setPriceMinor(Number(event.target.value))} /></label>
          <div className="rounded-[18px] bg-[rgb(var(--canvas))] p-3 text-sm font-semibold text-[rgb(var(--text-muted))]">{route} · {vehicle} · {seats} seats · {formatUzs(priceMinor)}</div>
          <Button className="w-full" type="button" disabled={!canPublish} onClick={() => setStep("published")}>Publish demo trip</Button>
        </DriverCard>
      ) : null}

      {step === "published" ? (
        <DriverCard className="mt-3 space-y-3" label="Trip published">
          <DriverPill tone="success">Published</DriverPill>
          <h2 className="m-0 text-xl font-black">Trip is visible in preview</h2>
          <pre className="max-h-44 overflow-auto rounded-[18px] bg-[rgb(var(--canvas))] p-3 text-xs">{JSON.stringify(summary, null, 2)}</pre>
          <Link className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline" href="/trip-demo">Open active trip</Link>
        </DriverCard>
      ) : null}
    </DriverShell>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-sm font-black">{label}<select className="min-h-11 rounded-[18px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((item) => <option key={item}>{item}</option>)}</select></label>;
}