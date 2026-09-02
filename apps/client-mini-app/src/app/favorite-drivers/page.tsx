"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, Card, ClientHeader, ClientShell, StatusPill } from "../client-ui";

const initialDrivers = [
  { id: "aziz", name: "Azizbek Karimov", route: "Nukus → Urgench", car: "Chevrolet Cobalt · 95 A 214 QA", rating: "4.9", note: "Пунктуальный, удобно договариваться о посадке." },
  { id: "madina", name: "Madina Yusupova", route: "Nukus → Khiva", car: "Chevrolet Tracker · 95 B 782 LA", rating: "4.8", note: "Аккуратно принимает багаж и посылки." },
];

export default function FavoriteDriversPage() {
  const [drivers, setDrivers] = useState(initialDrivers);

  return (
    <ClientShell active="profile">
      <ClientHeader backHref="/profile" level="secondary" title="Любимые водители" subtitle="Отзывы, избранное и быстрый повтор поездки" />
      <section className="mt-4 grid gap-3" aria-label="Любимые водители">
        {drivers.length > 0 ? drivers.map((driver) => (
          <Card key={driver.id} compact className="space-y-3">
            <div className="flex items-start gap-3">
              <Avatar name={driver.name} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><h2 className="m-0 truncate text-base font-black">{driver.name}</h2><p className="m-0 text-xs font-bold text-[rgb(var(--text-muted))]">{driver.car}</p></div>
                  <StatusPill tone="warning">★ {driver.rating}</StatusPill>
                </div>
                <p className="m-0 mt-2 text-sm font-semibold text-[rgb(var(--text-muted))]">{driver.note}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline" href={`/search?favorite=${driver.id}&from=Nukus&to=Urgench`}>Найти поездку</Link>
              <button className="min-h-11 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 text-sm font-black text-[rgb(var(--text-muted))]" type="button" onClick={() => setDrivers((current) => current.filter((item) => item.id !== driver.id))}>Убрать</button>
            </div>
          </Card>
        )) : <Card compact><p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">Пока нет любимых водителей.</p></Card>}
      </section>
    </ClientShell>
  );
}
