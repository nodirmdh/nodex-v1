"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, formatUzs } from "@nodex/ui";
import { DriverCard, DriverHeader, DriverPill, DriverShell } from "../driver-ui";

const cities = ["Nukus", "Urgench", "Khiva", "Kungrad"];
const vehicleOptions = [
  { label: "Chevrolet Cobalt · 95 A 214 QA", model: "Chevrolet Cobalt", capacity: 4 },
  { label: "Chevrolet Tracker · 95 B 412 QA", model: "Chevrolet Tracker", capacity: 4 },
  { label: "Hyundai Staria · 95 C 818 QA", model: "Hyundai Staria", capacity: 7 },
];
const tariffs = ["Старт", "Комфорт", "Премиум"];
type Step = "route" | "details" | "published";

function standardSeatPrice(basePriceMinor: number) {
  return Math.max(0, Math.round(basePriceMinor));
}

function discountSeatPrice(basePriceMinor: number) {
  return Math.max(0, Math.round(basePriceMinor * 0.8));
}

function frontSeatPrice(basePriceMinor: number) {
  return Math.max(0, Math.round(basePriceMinor * 1.2));
}

export default function CreateTripDemo() {
  const [step, setStep] = useState<Step>("route");
  const [origin, setOrigin] = useState("Nukus");
  const [destination, setDestination] = useState("Urgench");
  const [departure, setDeparture] = useState("2026-09-03T08:30");
  const [vehicle, setVehicle] = useState(vehicleOptions[0]!.label);
  const [seats, setSeats] = useState(4);
  const [tariff, setTariff] = useState(tariffs[0]!);
  const [priceMinor, setPriceMinor] = useState(5000000);
  const [parcel, setParcel] = useState(true);
  const selectedVehicle = vehicleOptions.find((item) => item.label === vehicle) ?? vehicleOptions[0]!;
  const capacity = selectedVehicle.capacity;
  const canPublish = origin !== destination && departure && seats > 0 && seats <= capacity && priceMinor > 0;
  const route = `${origin} → ${destination}`;
  const summary = useMemo(() => ({ route, departure, vehicle, seats, tariff, priceMinor, parcel }), [departure, parcel, priceMinor, route, seats, tariff, vehicle]);

  useEffect(() => { const params = new URLSearchParams(window.location.search); if (params.get("return") === "1") { setOrigin("Urgench"); setDestination("Nukus"); setDeparture("2026-09-03T17:30"); } }, []);
  useEffect(() => { setSeats((value) => Math.min(value, capacity)); }, [capacity]);

  return (
    <DriverShell active="trips">
      <DriverHeader title="Создать маршрут" subtitle={route} status={<DriverPill tone={canPublish ? "success" : "warning"}>{canPublish ? "Готово" : "Проверьте"}</DriverPill>} />

      {step !== "published" ? <section className="mt-6 grid gap-3"><DriverCard label="Маршрут"><h1 className="m-0 text-xl font-semibold">Маршрут и время</h1><div className="mt-4 grid gap-3"><Select label="Откуда" value={origin} options={cities} onChange={setOrigin} /><Select label="Куда" value={destination} options={cities} onChange={setDestination} /><label className="grid gap-1 text-sm"><span className="font-medium text-[rgb(var(--text-muted))]">Время выезда</span><input className="min-h-11 rounded-[16px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3" type="datetime-local" value={departure} onChange={(event) => setDeparture(event.target.value)} /></label></div></DriverCard>

      <DriverCard label="Детали"><div className="grid gap-4"><Select label="Автомобиль" value={vehicle} options={vehicleOptions.map((item) => item.label)} onChange={setVehicle} /><div><div className="mb-2 flex items-center justify-between gap-3"><p className="m-0 text-sm text-[rgb(var(--text-muted))]">Доступные места</p><span className="text-xs font-black text-[rgb(var(--primary))]">Доступно пассажирских мест: {capacity}</span></div><div className="flex items-center justify-between rounded-[16px] bg-[rgb(var(--canvas))] p-2"><button className="h-9 w-9 rounded-full border-0 bg-[rgb(var(--surface))] text-lg" type="button" onClick={() => setSeats((value) => Math.max(1, value - 1))}>-</button><strong className="font-semibold">{seats}</strong><button className="h-9 w-9 rounded-full border-0 bg-[rgb(var(--primary))] text-lg text-[rgb(var(--primary-foreground))] disabled:opacity-45" type="button" disabled={seats >= capacity} onClick={() => setSeats((value) => Math.min(capacity, value + 1))}>+</button></div>{seats >= capacity ? <p className="m-0 mt-2 text-xs font-semibold text-[rgb(var(--text-muted))]">Нельзя опубликовать больше мест, чем есть в выбранном автомобиле.</p> : null}</div><div><p className="m-0 mb-2 text-sm text-[rgb(var(--text-muted))]">Тариф</p><div className="grid grid-cols-3 gap-2">{tariffs.map((item) => <button key={item} className={["min-h-10 rounded-full border-0 text-sm font-semibold", tariff === item ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "bg-[rgb(var(--canvas))]"].join(" ")} type="button" onClick={() => setTariff(item)}>{item}</button>)}</div><p className="m-0 mt-2 text-xs font-semibold text-[rgb(var(--text-muted))]">Тариф — уровень поездки. Цена кресла считается отдельно.</p></div><label className="grid gap-1 text-sm"><span className="font-medium text-[rgb(var(--text-muted))]">Базовая цена места</span><input className="min-h-11 rounded-[16px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3" type="number" step={500000} min={1000000} value={priceMinor} onChange={(event) => setPriceMinor(Number(event.target.value))} /><span className="text-xs font-semibold text-[rgb(var(--text-muted))]">Цена для пассажира может отличаться в зависимости от выбранного кресла.</span></label><DriverCard className="bg-[rgb(var(--canvas))] shadow-none" label="Как увидит пассажир"><h2 className="m-0 text-base font-semibold">Как увидит пассажир</h2><div className="mt-2 grid gap-2 text-sm"><PriceRow label="Переднее пассажирское" note="+20% за повышенный комфорт" value={frontSeatPrice(priceMinor)} /><PriceRow label="Стандартное" note="Без изменения" value={standardSeatPrice(priceMinor)} /><PriceRow label="Среднее место" note="-20% специальная цена" value={discountSeatPrice(priceMinor)} /></div></DriverCard><button className={["min-h-11 rounded-[16px] border-0 px-3 text-left text-sm font-semibold", parcel ? "bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]" : "bg-[rgb(var(--canvas))]"].join(" ")} type="button" onClick={() => setParcel((value) => !value)}>{parcel ? "Посылки можно брать" : "Без посылок"}</button></div></DriverCard>

      <section className="sticky bottom-[76px] rounded-[22px] bg-[rgb(var(--surface)/0.98)] p-3 shadow-[var(--shadow-floating)] backdrop-blur"><div className="mb-3 text-sm text-[rgb(var(--text-muted))]">{route} · {seats} из {capacity} мест · базовая {formatUzs(priceMinor)}</div><Button className="w-full" type="button" disabled={!canPublish} onClick={() => setStep("published")}>Опубликовать</Button></section></section> : null}

      {step === "published" ? <DriverCard className="mt-6" label="Маршрут опубликован"><DriverPill tone="success">Опубликовано</DriverPill><h1 className="m-0 mt-3 text-xl font-semibold">Маршрут виден пассажирам</h1><div className="mt-4 grid gap-2 text-sm"><Info label="Маршрут" value={route} /><Info label="Автомобиль" value={vehicle} /><Info label="Места" value={`${seats} из ${capacity}`} /><Info label="Тариф" value={tariff} /><Info label="Базовая цена места" value={formatUzs(summary.priceMinor)} /></div><Link className="mt-4 flex min-h-11 w-full items-center justify-center rounded-[16px] bg-[rgb(var(--primary))] px-4 text-sm font-semibold text-[rgb(var(--primary-foreground))] no-underline" href="/trip-demo">Открыть поездку</Link></DriverCard> : null}
    </DriverShell>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <label className="grid gap-1 text-sm"><span className="font-medium text-[rgb(var(--text-muted))]">{label}</span><select className="min-h-11 rounded-[16px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((item) => <option key={item}>{item}</option>)}</select></label>; }
function PriceRow({ label, note, value }: { label: string; note: string; value: number }) { return <div className="flex items-start justify-between gap-3"><div><div className="font-semibold">{label}</div><div className="text-xs font-bold text-[rgb(var(--text-muted))]">{note}</div></div><strong className="shrink-0">{formatUzs(value)}</strong></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3"><span className="block text-xs text-[rgb(var(--text-muted))]">{label}</span><strong className="font-semibold">{value}</strong></div>; }
