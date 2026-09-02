"use client";

import Link from "next/link";
import { useState } from "react";
import { DriverCard, DriverHeader, DriverIconView, DriverPill, DriverShell } from "../driver-ui";

type ProfileGroup = { title: string; rows: Array<[string, string, string]> };

const groups: ProfileGroup[] = [
  {
    title: "Работа",
    rows: [
      ["Подписка", "Активна · осталось 18 дней", "/subscription"],
      ["Автомобили", "Chevrolet Cobalt · одобрен", "/vehicles"],
      ["Проверка", "Одобрено", "/verification"],
    ],
  },
  {
    title: "Показатели",
    rows: [
      ["Отзывы", "4.9 рейтинг · 128 отзывов", "/reviews"],
      ["Статистика", "Оценка дохода от поездок", "/earnings"],
    ],
  },
  {
    title: "Помощь и безопасность",
    rows: [
      ["Безопасность", "Отчёты по поездкам и экстренная помощь", "/safety"],
      ["Поддержка", "Открыть обращение водителя", "/support"],
    ],
  },
  {
    title: "Приложение",
    rows: [
      ["Уведомления", "Заявки на места и напоминания", "/notifications"],
      ["Язык", "Русский", "/profile"],
    ],
  },
];

const initialAvoidedPassengers = [
  { id: "passenger-ms", name: "M. Seitov", trip: "Nukus → Urgench", date: "Сегодня", reason: "опоздание" },
  { id: "passenger-da", name: "D. Allamuratov", trip: "Nukus → Urgench", date: "12 авг", reason: "не понравилась поездка" },
];

export default function DriverProfile() {
  const [avoidedPassengers, setAvoidedPassengers] = useState(initialAvoidedPassengers);

  return (
    <DriverShell active="profile">
      <DriverHeader title="Профиль" subtitle="Рабочее место и настройки водителя" status={<DriverPill tone="success">Проверен</DriverPill>} />

      <DriverCard className="mt-4 space-y-3" label="Driver identity">
        <div className="flex gap-3">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-xl font-black text-[rgb(var(--primary))]">AD</span>
          <div className="min-w-0 flex-1">
            <h1 className="m-0 text-xl font-black">Azizbek Driver</h1>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">Chevrolet Cobalt · 95 A 214 QA</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <DriverPill tone="success">Одобрен</DriverPill>
              <DriverPill tone="accent">4.9 рейтинг</DriverPill>
              <DriverPill tone="info">268 поездок</DriverPill>
            </div>
          </div>
        </div>
      </DriverCard>

      <DriverCard className="mt-3 space-y-3" label="Avoided passengers">
        <div>
          <h2 className="m-0 text-base font-black">Не предлагать пассажиров</h2>
          <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">Локальный demo-список пассажиров, которых ENVO не будет подбирать в будущие рейсы.</p>
        </div>
        {avoidedPassengers.length > 0 ? avoidedPassengers.map((item) => (
          <div key={item.id} className="rounded-[18px] bg-[rgb(var(--canvas))] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-black">{item.name}</div>
                <div className="mt-1 text-xs font-semibold text-[rgb(var(--text-muted))]">{item.trip}</div>
                <div className="mt-1 text-xs font-bold text-[rgb(var(--text-muted))]">{item.date} · {item.reason}</div>
              </div>
              <button className="min-h-9 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-xs font-black" onClick={() => setAvoidedPassengers((current) => current.filter((passenger) => passenger.id !== item.id))} type="button">Убрать</button>
            </div>
          </div>
        )) : <div className="rounded-[18px] bg-[rgb(var(--canvas))] p-3 text-sm font-semibold text-[rgb(var(--text-muted))]">Список пуст.</div>}
      </DriverCard>

      <DriverCard className="mt-3 space-y-3" label="Driver rewards">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-base font-black">Бонусы водителя</h2>
            <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">Квалифицирующие поездки проходят проверку PIN, GPS и дублей.</p>
          </div>
          <DriverPill tone="accent">20 000 000 UZS</DriverPill>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[rgb(var(--surface-muted))]"><div className="h-full w-[72%] rounded-full bg-[rgb(var(--primary))]" /></div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-black">
          <div className="rounded-[12px] bg-[rgb(var(--canvas))] p-2"><span className="block text-base">36</span><span className="text-[rgb(var(--text-muted))]">из 50</span></div>
          <div className="rounded-[12px] bg-[rgb(var(--canvas))] p-2"><span className="block text-base">8</span><span className="text-[rgb(var(--text-muted))]">билетов</span></div>
          <div className="rounded-[12px] bg-[rgb(var(--canvas))] p-2"><span className="block text-base">1</span><span className="text-[rgb(var(--text-muted))]">ревью</span></div>
        </div>
      </DriverCard>

      {groups.map((group) => (
        <DriverCard key={group.title} className="mt-3 p-0" label={`Driver profile ${group.title}`}>
          <h2 className="m-0 px-3 pt-3 text-xs font-black uppercase tracking-[0.12em] text-[rgb(var(--primary))]">{group.title}</h2>
          <div className="mt-2 divide-y divide-[rgb(var(--border))]">
            {group.rows.map(([label, detail, href]) => (
              <Link key={label} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-3 text-[rgb(var(--foreground))] no-underline" href={href}>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[rgb(var(--canvas))] text-[rgb(var(--primary))]">
                  <DriverIconView name={label === "Автомобили" ? "car" : label === "Поддержка" || label === "Уведомления" ? "chat" : label === "Безопасность" ? "shield" : "briefcase"} />
                </span>
                <span className="min-w-0"><span className="block truncate text-sm font-black">{label}</span><span className="block truncate text-xs font-semibold text-[rgb(var(--text-muted))]">{detail}</span></span>
                <span className="text-sm font-black text-[rgb(var(--text-muted))]">›</span>
              </Link>
            ))}
          </div>
        </DriverCard>
      ))}
    </DriverShell>
  );
}
