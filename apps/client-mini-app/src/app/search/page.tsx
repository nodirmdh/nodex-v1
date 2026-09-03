"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button, formatUzs } from "@nodex/ui";
import { ClientHeader, ClientShell, Icon, StatusPill } from "../client-ui";

const trips = [
  { id: "phase5-nukus-urgench-morning", departure: "08:30", arrival: "11:30", driver: "Azizbek Karimov", vehicle: "Chevrolet Cobalt", rating: "4.9", count: "245 поездок", seats: 3, priceMinor: 8500000, recommended: true },
  { id: "phase5-nukus-urgench-evening", departure: "18:10", arrival: "21:05", driver: "Madina Yusupova", vehicle: "Chevrolet Tracker", rating: "4.8", count: "142 поездки", seats: 2, priceMinor: 9200000, recommended: false },
  { id: "phase5-nukus-khiva", departure: "09:00", arrival: "12:30", driver: "Sherzod Rakhimov", vehicle: "BYD Chazor", rating: "4.7", count: "94 поездки", seats: 1, priceMinor: 9500000, recommended: false },
];

export default function SearchPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [timeFilter, setTimeFilter] = useState("Любое");
  const [onlyBaggage, setOnlyBaggage] = useState(false);
  const [onlyParcel, setOnlyParcel] = useState(false);

  const visibleTrips = useMemo(() => {
    let list = [...trips];
    if (timeFilter === "Утро") list = list.filter((trip) => Number(trip.departure.slice(0, 2)) < 12);
    if (timeFilter === "Вечер") list = list.filter((trip) => Number(trip.departure.slice(0, 2)) >= 17);
    if (onlyParcel) list = list.filter((trip) => trip.id !== "phase5-nukus-urgench-evening");
    if (onlyBaggage) list = list.filter((trip) => trip.seats > 1);
    return list;
  }, [onlyBaggage, onlyParcel, timeFilter]);

  return (
    <ClientShell active="trips">
      <ClientHeader backHref="/" level="secondary" title="Поиск" subtitle="Nukus → Urgench · завтра" action={<button aria-label="Фильтры" className="grid h-10 w-10 place-items-center rounded-full border-0 bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" type="button" onClick={() => setSheetOpen(true)}><Icon name="check" /></button>} />

      <section className="mt-5 grid gap-3 rounded-[24px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-sm)]" aria-label="Параметры поиска">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3"><div><p className="m-0 text-xs font-medium text-[rgb(var(--text-muted))]">Откуда</p><h2 className="m-0 text-lg font-semibold">Nukus</h2></div><span className="text-[rgb(var(--primary))]">→</span><div className="text-right"><p className="m-0 text-xs font-medium text-[rgb(var(--text-muted))]">Куда</p><h2 className="m-0 text-lg font-semibold">Urgench</h2></div></div>
        <div className="grid grid-cols-2 gap-2 text-sm"><div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3"><span className="block text-xs text-[rgb(var(--text-muted))]">Когда</span><strong className="font-semibold">Завтра, 08:30+</strong></div><div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3"><span className="block text-xs text-[rgb(var(--text-muted))]">Пассажиры</span><strong className="font-semibold">2 пассажира</strong></div></div>
      </section>

      <section className="mt-7" aria-label="Результаты поиска">
        <div className="mb-3 flex items-center justify-between"><h1 className="m-0 text-2xl font-semibold">Варианты</h1><button className="rounded-full border-0 bg-[rgb(var(--surface-tint))] px-4 py-2 text-sm font-semibold text-[rgb(var(--primary))]" type="button" onClick={() => setSheetOpen(true)}>Фильтры</button></div>
        <div className="grid gap-3">
          {visibleTrips.map((trip) => <Link key={trip.id} className="block rounded-[22px] bg-[rgb(var(--surface))] p-4 text-[rgb(var(--foreground))] no-underline shadow-[var(--shadow-sm)]" href={`/trips/${trip.id}`}><div className="flex items-start justify-between gap-3"><div><div className="text-2xl font-semibold">{trip.departure} → {trip.arrival}</div><div className="mt-3 text-base font-semibold">{trip.driver}</div><div className="mt-1 text-sm text-[rgb(var(--text-muted))]">{trip.vehicle}</div><div className="mt-2 text-sm text-[rgb(var(--text-muted))]">★ {trip.rating} · {trip.count}</div></div><div className="text-right"><div className="text-lg font-semibold">{formatUzs(trip.priceMinor)}</div><div className="mt-2 text-sm text-[rgb(var(--text-muted))]">{trip.seats} места</div>{trip.recommended ? <div className="mt-3"><StatusPill tone="accent">Лучший</StatusPill></div> : null}</div></div></Link>)}
        </div>
        {visibleTrips.length === 0 ? <div className="mt-4 rounded-[22px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-sm)]"><h2 className="m-0 text-lg font-semibold">Не нашли поездку?</h2><p className="m-0 mt-1 text-sm text-[rgb(var(--text-muted))]">ENVO сообщит, когда появится подходящий вариант.</p><Link className="mt-3 flex min-h-11 items-center justify-center rounded-[16px] bg-[rgb(var(--primary))] text-sm font-semibold text-[rgb(var(--primary-foreground))] no-underline" href="/search?waitlist=1">Сообщить мне</Link></div> : null}
      </section>

      {sheetOpen ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgb(var(--overlay)/0.34)] px-3 pb-3" role="dialog" aria-modal="true"><button aria-label="Закрыть фильтры" className="absolute inset-0" type="button" onClick={() => setSheetOpen(false)} /><section className="relative w-full max-w-[430px] rounded-t-[28px] bg-[rgb(var(--surface))] p-5 shadow-[var(--shadow-floating)]"><div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[rgb(var(--border-strong))]" /><h2 className="m-0 text-xl font-semibold">Фильтры</h2><div className="mt-4 grid gap-4"><div><p className="m-0 mb-2 text-sm font-medium text-[rgb(var(--text-muted))]">Время</p><div className="grid grid-cols-3 gap-2">{["Любое", "Утро", "Вечер"].map((item) => <button key={item} className={["min-h-11 rounded-full px-3 text-sm font-semibold", timeFilter === item ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "bg-[rgb(var(--canvas))]"].join(" ")} type="button" onClick={() => setTimeFilter(item)}>{item}</button>)}</div></div><button className={["min-h-11 rounded-[16px] px-3 text-left text-sm font-semibold", onlyBaggage ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "bg-[rgb(var(--canvas))]"].join(" ")} type="button" onClick={() => setOnlyBaggage((value) => !value)}>Есть место для багажа</button><button className={["min-h-11 rounded-[16px] px-3 text-left text-sm font-semibold", onlyParcel ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "bg-[rgb(var(--canvas))]"].join(" ")} type="button" onClick={() => setOnlyParcel((value) => !value)}>Можно передать посылку</button></div><Button className="mt-5 w-full" onClick={() => setSheetOpen(false)}>Показать варианты</Button></section></div> : null}
    </ClientShell>
  );
}