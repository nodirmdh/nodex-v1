import type { ReactNode } from "react";
import Link from "next/link";
import { DriverCard, DriverHeader, DriverPill, DriverShell } from "../driver-ui";

function Group({ title, children }: { title: string; children: ReactNode }) { return <DriverCard className="mt-4 p-0"><h2 className="m-0 px-3 pt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-muted))]">{title}</h2><div className="mt-2 divide-y divide-[rgb(var(--border))]">{children}</div></DriverCard>; }
function Row({ title, subtitle, href }: { title: string; subtitle: string; href: string }) { return <Link className="flex min-h-[58px] items-center justify-between gap-3 px-3 py-2 text-[rgb(var(--foreground))] no-underline" href={href}><span className="min-w-0"><span className="block truncate text-sm font-semibold">{title}</span><span className="block truncate text-xs text-[rgb(var(--text-muted))]">{subtitle}</span></span><span className="text-[rgb(var(--text-muted))]">›</span></Link>; }

export default function DriverProfile() {
  return (
    <DriverShell active="profile">
      <DriverHeader title="Профиль" subtitle="Работа, машина и помощь" status={<DriverPill tone="success">Проверен</DriverPill>} />
      <section className="mt-6 flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-lg font-semibold text-[rgb(var(--primary))]">AD</span><div className="min-w-0 flex-1"><h1 className="m-0 truncate text-xl font-semibold">Azizbek</h1><p className="m-0 mt-1 text-sm text-[rgb(var(--text-muted))]">Chevrolet Cobalt · 95 A 214 QA</p></div><DriverPill tone="accent">4.9</DriverPill></section>
      <DriverCard className="mt-5"><div className="grid grid-cols-3 gap-2 text-center"><Metric label="Поездки" value="268" /><Metric label="Надёжность" value="96%" /><Metric label="Серия" value="7" /></div></DriverCard>
      <Group title="Работа"><Row href="/trips" title="Мои маршруты" subtitle="Активные, будущие и история" /><Row href="/create-trip-demo" title="Создать маршрут" subtitle="Маршрут, места и цена" /><Row href="/passengers-demo" title="Fill и заявки" subtitle="Спрос, пассажиры и посадка" /><Row href="/create-trip-demo?return=1" title="Return" subtitle="Быстрый обратный маршрут" /></Group>
      <Group title="Показатели"><Row href="/earnings" title="Статистика" subtitle="Доход и прогресс" /><Row href="/rewards" title="Награды" subtitle="Milestone, streak и история" /><Row href="/rewards?tab=referrals" title="Рефералы" subtitle="Приглашения водителей" /><Row href="/reviews" title="Отзывы" subtitle="Рейтинг и комментарии" /></Group>
      <Group title="Автомобиль и документы"><Row href="/vehicles" title="Автомобиль" subtitle="Chevrolet Cobalt · одобрен" /><Row href="/verification" title="Документы" subtitle="Проверка водителя и машины" /><Row href="/subscription" title="Подписка" subtitle="Активна · 18 дней" /></Group>
      <Group title="Помощь"><Row href="/support" title="Поддержка" subtitle="Чат с вложениями" /><Row href="/safety" title="Безопасность" subtitle="Экстренные действия и поездка" /><Row href="/notifications" title="Уведомления" subtitle="Заявки, сообщения и статусы" /></Group>
    </DriverShell>
  );
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3"><div className="text-lg font-semibold">{value}</div><div className="text-xs text-[rgb(var(--text-muted))]">{label}</div></div>; }