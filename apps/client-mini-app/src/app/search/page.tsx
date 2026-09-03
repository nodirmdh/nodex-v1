"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, formatUzs } from "@nodex/ui";
import { ClientHeader, ClientShell, Icon, StatusPill } from "../client-ui";

type MatchStage = "results" | "no_match" | "waiting" | "found";

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
  const [matchStage, setMatchStage] = useState<MatchStage>("results");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("waitlist") === "1") setMatchStage("waiting");
  }, []);

  const visibleTrips = useMemo(() => {
    let list = [...trips];
    if (timeFilter === "Утро") list = list.filter((trip) => Number(trip.departure.slice(0, 2)) < 12);
    if (timeFilter === "Вечер") list = list.filter((trip) => Number(trip.departure.slice(0, 2)) >= 17);
    if (onlyParcel) list = list.filter((trip) => trip.id !== "phase5-nukus-urgench-evening");
    if (onlyBaggage) list = list.filter((trip) => trip.seats > 1);
    if (matchStage === "no_match" || matchStage === "waiting") return [];
    return list;
  }, [matchStage, onlyBaggage, onlyParcel, timeFilter]);

  return (
    <ClientShell active="trips">
      <ClientHeader backHref="/" level="secondary" title="Поиск" subtitle="Nukus → Urgench · завтра" action={<button aria-label="Фильтры" className="grid h-10 w-10 place-items-center rounded-full border-0 bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" type="button" onClick={() => setSheetOpen(true)}><Icon name="check" /></button>} />

      <section className="mt-5 grid gap-3 rounded-[24px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-sm)]" aria-label="Параметры поиска">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3"><div><p className="m-0 text-xs font-medium text-[rgb(var(--text-muted))]">Откуда</p><h2 className="m-0 text-lg font-semibold">Nukus</h2></div><span className="text-[rgb(var(--primary))]">→</span><div className="text-right"><p className="m-0 text-xs font-medium text-[rgb(var(--text-muted))]">Куда</p><h2 className="m-0 text-lg font-semibold">Urgench</h2></div></div>
        <div className="grid grid-cols-2 gap-2 text-sm"><div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3"><span className="block text-xs text-[rgb(var(--text-muted))]">Когда</span><strong className="font-semibold">Завтра, 08:30+</strong></div><div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3"><span className="block text-xs text-[rgb(var(--text-muted))]">Пассажиры</span><strong className="font-semibold">2 пассажира</strong></div></div>
      </section>

      <MatchingLifecycle stage={matchStage} onStage={setMatchStage} />

      <section className="mt-7" aria-label="Результаты поиска">
        <div className="mb-3 flex items-center justify-between"><h1 className="m-0 text-2xl font-semibold">Варианты</h1><button className="rounded-full border-0 bg-[rgb(var(--surface-tint))] px-4 py-2 text-sm font-semibold text-[rgb(var(--primary))]" type="button" onClick={() => setSheetOpen(true)}>Фильтры</button></div>
        <div className="grid gap-3">
          {visibleTrips.map((trip) => <Link key={trip.id} className="block rounded-[22px] bg-[rgb(var(--surface))] p-4 text-[rgb(var(--foreground))] no-underline shadow-[var(--shadow-sm)]" href={`/trips/${trip.id}`}><div className="flex items-start justify-between gap-3"><div><div className="text-2xl font-semibold">{trip.departure} → {trip.arrival}</div><div className="mt-3 text-base font-semibold">{trip.driver}</div><div className="mt-1 text-sm text-[rgb(var(--text-muted))]">{trip.vehicle}</div><div className="mt-2 text-sm text-[rgb(var(--text-muted))]">★ {trip.rating} · {trip.count}</div></div><div className="text-right"><div className="text-lg font-semibold">{formatUzs(trip.priceMinor)}</div><div className="mt-2 text-sm text-[rgb(var(--text-muted))]">{trip.seats} места</div>{trip.recommended ? <div className="mt-3"><StatusPill tone="accent">Лучший</StatusPill></div> : null}</div></div></Link>)}
        </div>
        {visibleTrips.length === 0 ? <NoMatchCard stage={matchStage} onStage={setMatchStage} /> : null}
      </section>

      {sheetOpen ? <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgb(var(--overlay)/0.34)] px-3 pb-3" role="dialog" aria-modal="true"><button aria-label="Закрыть фильтры" className="absolute inset-0" type="button" onClick={() => setSheetOpen(false)} /><section className="relative w-full max-w-[430px] rounded-t-[28px] bg-[rgb(var(--surface))] p-5 shadow-[var(--shadow-floating)]"><div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[rgb(var(--border-strong))]" /><h2 className="m-0 text-xl font-semibold">Фильтры</h2><div className="mt-4 grid gap-4"><div><p className="m-0 mb-2 text-sm font-medium text-[rgb(var(--text-muted))]">Время</p><div className="grid grid-cols-3 gap-2">{["Любое", "Утро", "Вечер"].map((item) => <button key={item} className={["min-h-11 rounded-full px-3 text-sm font-semibold", timeFilter === item ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "bg-[rgb(var(--canvas))]"].join(" ")} type="button" onClick={() => setTimeFilter(item)}>{item}</button>)}</div></div><button className={["min-h-11 rounded-[16px] px-3 text-left text-sm font-semibold", onlyBaggage ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "bg-[rgb(var(--canvas))]"].join(" ")} type="button" onClick={() => setOnlyBaggage((value) => !value)}>Есть место для багажа</button><button className={["min-h-11 rounded-[16px] px-3 text-left text-sm font-semibold", onlyParcel ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "bg-[rgb(var(--canvas))]"].join(" ")} type="button" onClick={() => setOnlyParcel((value) => !value)}>Можно передать посылку</button></div><Button className="mt-5 w-full" onClick={() => setSheetOpen(false)}>Показать варианты</Button></section></div> : null}
    </ClientShell>
  );
}

function MatchingLifecycle({ stage, onStage }: { stage: MatchStage; onStage: (stage: MatchStage) => void }) {
  const steps = [["SEARCH", "Поиск"], ["NO MATCH", "Нет варианта"], ["JOIN WAITLIST", "Лист ожидания"], ["WAITING", "ENVO ищет"], ["MATCH FOUND", "Вариант найден"], ["VIEW TRIP", "Открыть поездку"], ["BOOK", "Забронировать"]] as const;
  const activeIndex = stage === "results" ? 0 : stage === "no_match" ? 1 : stage === "waiting" ? 3 : 4;
  return <section className="mt-5 rounded-[22px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-sm)]" aria-label="Matching lifecycle"><div className="flex items-center justify-between gap-3"><div><h2 className="m-0 text-lg font-semibold">Статус подбора</h2><p className="m-0 mt-1 text-sm text-[rgb(var(--text-muted))]">{stage === "results" ? "Есть подходящие поездки. Выберите вариант и бронируйте." : stage === "no_match" ? "Подходящих поездок сейчас нет. Можно подключить лист ожидания." : stage === "waiting" ? "ENVO следит за маршрутом и ждёт подходящего водителя." : "Появился подходящий рейс. Откройте детали и забронируйте место."}</p></div><StatusPill tone={stage === "found" ? "success" : stage === "waiting" ? "info" : "accent"}>{stage === "found" ? "Найдено" : stage === "waiting" ? "Ожидание" : "Поиск"}</StatusPill></div><div className="mt-4 flex gap-2 overflow-x-auto pb-1">{steps.map(([, label], index) => <span key={label} className={["shrink-0 rounded-full px-3 py-2 text-xs font-semibold", index <= activeIndex ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "bg-[rgb(var(--canvas))] text-[rgb(var(--text-muted))]"].join(" ")}>{label}</span>)}</div>{stage === "results" ? <button className="mt-3 min-h-10 w-full rounded-[16px] border-0 bg-[rgb(var(--canvas))] text-sm font-semibold" type="button" onClick={() => onStage("no_match")}>Показать сценарий без вариантов</button> : null}{stage === "waiting" ? <button className="mt-3 min-h-10 w-full rounded-[16px] border-0 bg-[rgb(var(--primary))] text-sm font-semibold text-[rgb(var(--primary-foreground))]" type="button" onClick={() => onStage("found")}>Demo: вариант найден</button> : null}{stage === "found" ? <Link className="mt-3 flex min-h-10 w-full items-center justify-center rounded-[16px] bg-[rgb(var(--primary))] text-sm font-semibold text-[rgb(var(--primary-foreground))] no-underline" href="/trips/phase5-nukus-urgench-morning">Открыть найденную поездку</Link> : null}</section>;
}

function NoMatchCard({ stage, onStage }: { stage: MatchStage; onStage: (stage: MatchStage) => void }) {
  return <div className="mt-4 rounded-[22px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-sm)]"><h2 className="m-0 text-lg font-semibold">{stage === "found" ? "Вариант найден" : "Подходящих поездок пока нет"}</h2><p className="m-0 mt-1 text-sm text-[rgb(var(--text-muted))]">{stage === "waiting" ? "Вы в листе ожидания. ENVO сообщит, когда водитель опубликует подходящий маршрут." : stage === "found" ? "ENVO нашёл рейс Nukus → Urgench на 08:30." : "Подключите лист ожидания, чтобы ENVO продолжил поиск за вас."}</p>{stage === "found" ? <Link className="mt-3 flex min-h-11 items-center justify-center rounded-[16px] bg-[rgb(var(--primary))] text-sm font-semibold text-[rgb(var(--primary-foreground))] no-underline" href="/trips/phase5-nukus-urgench-morning">Открыть поездку</Link> : <button className="mt-3 min-h-11 w-full rounded-[16px] border-0 bg-[rgb(var(--primary))] text-sm font-semibold text-[rgb(var(--primary-foreground))]" type="button" onClick={() => onStage("waiting")}>{stage === "waiting" ? "Ожидаем водителя" : "Встать в лист ожидания"}</button>}</div>;
}
