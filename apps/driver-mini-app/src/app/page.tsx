"use client";

import Link from "next/link";
import { DriverCard, DriverHeader, DriverIconView, DriverPill, DriverShell } from "./driver-ui";

export default function DriverHome() {
  return (
    <DriverShell active="home">
      <DriverHeader title="Готов к поездкам" subtitle="Azizbek · Chevrolet Cobalt" status={<DriverPill tone="success">Онлайн</DriverPill>} />

      <section className="mt-7">
        <p className="m-0 text-sm text-[rgb(var(--text-muted))]">Ближайший маршрут</p>
        <h1 className="m-0 mt-1 text-[28px] font-semibold leading-tight">Nukus → Urgench</h1>
        <p className="m-0 mt-2 text-sm text-[rgb(var(--text-muted))]">Завтра · 08:30 · 2 из 4 мест заняты</p>
      </section>

      <Link className="mt-6 flex min-h-[54px] items-center justify-center rounded-[18px] bg-[rgb(var(--primary))] px-4 text-base font-semibold text-[rgb(var(--primary-foreground))] no-underline shadow-[var(--shadow-sm)]" href="/create-trip-demo">Создать маршрут</Link>

      <DriverCard className="mt-5" label="Маршрут">
        <div className="flex items-start justify-between gap-3"><div><h2 className="m-0 text-lg font-semibold">Рейс готов к посадке</h2><p className="m-0 mt-1 text-sm text-[rgb(var(--text-muted))]">PIN, пассажиры, задержка и отмена доступны в поездке.</p></div><DriverPill tone="info">08:30</DriverPill></div>
        <div className="mt-3 grid grid-cols-2 gap-2"><Link className="flex min-h-11 items-center justify-center rounded-[16px] bg-[rgb(var(--canvas))] px-3 text-sm font-semibold text-[rgb(var(--foreground))] no-underline" href="/trip-demo">Открыть поездку</Link><Link className="flex min-h-11 items-center justify-center rounded-[16px] bg-[rgb(var(--canvas))] px-3 text-sm font-semibold text-[rgb(var(--foreground))] no-underline" href="/passengers-demo">Fill</Link></div>
      </DriverCard>

      <section className="mt-5 grid grid-cols-2 gap-3" aria-label="Быстрые действия">
        <Link className="rounded-[20px] bg-[rgb(var(--surface))] p-4 text-[rgb(var(--foreground))] no-underline shadow-[var(--shadow-sm)]" href="/create-trip-demo?return=1"><DriverIconView name="route" className="text-[rgb(var(--primary))]" /><span className="mt-3 block text-base font-semibold">Return</span><span className="mt-1 block text-sm text-[rgb(var(--text-muted))]">Urgench → Nukus</span></Link>
        <Link className="rounded-[20px] bg-[rgb(var(--surface))] p-4 text-[rgb(var(--foreground))] no-underline shadow-[var(--shadow-sm)]" href="/rewards"><DriverIconView name="ticket" className="text-[rgb(var(--primary))]" /><span className="mt-3 block text-base font-semibold">Награды</span><span className="mt-1 block text-sm text-[rgb(var(--text-muted))]">36/50 поездок</span></Link>
      </section>

      <DriverCard className="mt-5" label="Итоги">
        <div className="grid grid-cols-3 gap-2 text-center"><Metric label="Сегодня" value="1" /><Metric label="Доход" value="170k" /><Metric label="Рейтинг" value="4.9" /></div>
      </DriverCard>

      <p className="m-0 mt-5 text-sm leading-6 text-[rgb(var(--text-muted))]">Машина, документы, поддержка, безопасность и настройки находятся в профиле.</p>
    </DriverShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3"><div className="text-lg font-semibold">{value}</div><div className="text-xs text-[rgb(var(--text-muted))]">{label}</div></div>; }