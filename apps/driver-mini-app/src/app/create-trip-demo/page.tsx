"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, formatUzs } from "@nodex/ui";
import { DriverCard, DriverHeader, DriverPill, DriverShell } from "../driver-ui";

const cities = ["Nukus", "Urgench", "Khiva", "Kungrad"];
const vehicles = ["Chevrolet Cobalt · 95 A 214 QA", "Chevrolet Tracker · 95 B 412 QA"];
const tariffs = ["Старт", "Комфорт", "Премиум"];
type Step = "route" | "details" | "published";

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
  const route = `${origin} → ${destination}`;
  const summary = useMemo(() => ({ route, departure, vehicle, seats, tariff, priceMinor, parcel }), [departure, parcel, priceMinor, route, seats, tariff, vehicle]);

  useEffect(() => { const params = new URLSearchParams(window.location.search); if (params.get("return") === "1") { setOrigin("Urgench"); setDestination("Nukus"); setDeparture("2026-09-03T17:30"); } }, []);

  return (
    <DriverShell active="trips">
      <DriverHeader title="Создать маршрут" subtitle={route} status={<DriverPill tone={canPublish ? "success" : "warning"}>{canPublish ? "Готово" : "Проверьте"}</DriverPill>} />

      {step !== "published" ? <section className="mt-6 grid gap-3"><DriverCard label="Маршрут"><h1 className="m-0 text-xl font-semibold">Маршрут и время</h1><div className="mt-4 grid gap-3"><Select label="Откуда" value={origin} options={cities} onChange={setOrigin} /><Select label="Куда" value={destination} options={cities} onChange={setDestination} /><label className="grid gap-1 text-sm"><span className="font-medium text-[rgb(var(--text-muted))]">Отправление</span><input className="min-h-11 rounded-[16px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3" type="datetime-local" value={departure} onChange={(event) => setDeparture(event.target.value)} /></label></div></DriverCard>

      <DriverCard label="Детали"><div className="grid gap-4"><div><p className="m-0 mb-2 text-sm text-[rgb(var(--text-muted))]">Места</p><div className="flex items-center justify-between rounded-[16px] bg-[rgb(var(--canvas))] p-2"><button className="h-9 w-9 rounded-full border-0 bg-[rgb(var(--surface))] text-lg" type="button" onClick={() => setSeats((value) => Math.max(1, value - 1))}>-</button><strong className="font-semibold">{seats}</strong><button className="h-9 w-9 rounded-full border-0 bg-[rgb(var(--primary))] text-lg text-[rgb(var(--primary-foreground))]" type="button" onClick={() => setSeats((value) => Math.min(7, value + 1))}>+</button></div></div><div><p className="m-0 mb-2 text-sm text-[rgb(var(--text-muted))]">Тариф</p><div className="grid grid-cols-3 gap-2">{tariffs.map((item) => <button key={item} className={["min-h-10 rounded-full border-0 text-sm font-semibold", tariff === item ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "bg-[rgb(var(--canvas))]"].join(" ")} type="button" onClick={() => setTariff(item)}>{item}</button>)}</div></div><label className="grid gap-1 text-sm"><span className="font-medium text-[rgb(var(--text-muted))]">Цена за место</span><input className="min-h-11 rounded-[16px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3" type="number" step={500000} min={1000000} value={priceMinor} onChange={(event) => setPriceMinor(Number(event.target.value))} /></label><Select label="Автомобиль" value={vehicle} options={vehicles} onChange={setVehicle} /><button className={["min-h-11 rounded-[16px] border-0 px-3 text-left text-sm font-semibold", parcel ? "bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]" : "bg-[rgb(var(--canvas))]"].join(" ")} type="button" onClick={() => setParcel((value) => !value)}>{parcel ? "Посылки можно брать" : "Без посылок"}</button></div></DriverCard>

      <section className="sticky bottom-[76px] rounded-[22px] bg-[rgb(var(--surface)/0.98)] p-3 shadow-[var(--shadow-floating)] backdrop-blur"><div className="mb-3 text-sm text-[rgb(var(--text-muted))]">{route} · {seats} места · {formatUzs(priceMinor)}</div><Button className="w-full" type="button" disabled={!canPublish} onClick={() => setStep("published")}>Опубликовать</Button></section></section> : null}

      {step === "published" ? <DriverCard className="mt-6" label="Маршрут опубликован"><DriverPill tone="success">Опубликовано</DriverPill><h1 className="m-0 mt-3 text-xl font-semibold">Маршрут виден пассажирам</h1><div className="mt-4 grid gap-2 text-sm"><Info label="Маршрут" value={route} /><Info label="Автомобиль" value={vehicle} /><Info label="Места" value={`${seats}`} /><Info label="Тариф" value={tariff} /><Info label="Цена" value={formatUzs(summary.priceMinor)} /></div><Link className="mt-4 flex min-h-11 w-full items-center justify-center rounded-[16px] bg-[rgb(var(--primary))] px-4 text-sm font-semibold text-[rgb(var(--primary-foreground))] no-underline" href="/trip-demo">Открыть поездку</Link></DriverCard> : null}
    </DriverShell>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <label className="grid gap-1 text-sm"><span className="font-medium text-[rgb(var(--text-muted))]">{label}</span><select className="min-h-11 rounded-[16px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((item) => <option key={item}>{item}</option>)}</select></label>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3"><span className="block text-xs text-[rgb(var(--text-muted))]">{label}</span><strong className="font-semibold">{value}</strong></div>; }