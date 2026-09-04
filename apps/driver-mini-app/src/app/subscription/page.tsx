"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DriverCard, DriverHeader, DriverIconView, DriverPill, DriverShell } from "../driver-ui";

type SubscriptionState = "active" | "expiring" | "expired";

const stateCopy = {
  active: {
    title: "Бесплатный период",
    status: "Активна",
    tone: "success" as const,
    days: "Осталось 72 дня",
    cta: "Продлить подписку",
    help: "Публикация маршрутов и приём новых заявок доступны.",
  },
  expiring: {
    title: "Скоро закончится",
    status: "3 дня",
    tone: "warning" as const,
    days: "Продлите до 24 августа",
    cta: "Продлить сейчас",
    help: "Работа продолжается. Продлите, чтобы не потерять доступ.",
  },
  expired: {
    title: "Подписка закончилась",
    status: "Неактивна",
    tone: "danger" as const,
    days: "Доступ ограничен",
    cta: "Активировать подписку",
    help: "Подтверждённые поездки доступны. Новые публикации и заявки заблокированы.",
  },
};

export default function DriverSubscriptionPage() {
  const [state, setState] = useState<SubscriptionState>("active");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("state");
    if (next === "expired" || next === "expiring") setState(next);
  }, []);

  const copy = stateCopy[state];
  const enabled = state !== "expired";

  return (
    <DriverShell active="profile">
      <DriverHeader
        title="Подписка"
        subtitle="Доступ водителя и статус плана"
        status={<DriverPill tone={copy.tone}>{copy.status}</DriverPill>}
      />

      <DriverCard className="mt-4 space-y-3" label="Детали подписки">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]">
            <DriverIconView name={enabled ? "briefcase" : "lock"} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-xs font-black uppercase tracking-[0.12em] text-[rgb(var(--primary))]">
              ENVO Driver
            </p>
            <h1 className="m-0 mt-1 text-2xl font-black">{copy.title}</h1>
            <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">
              {copy.help}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[18px] bg-[rgb(var(--canvas))] p-3">
            <div className="text-xs font-bold text-[rgb(var(--text-muted))]">Началась</div>
            <div className="text-sm font-black">6 Aug 2026</div>
          </div>
          <div className="rounded-[18px] bg-[rgb(var(--surface-tint))] p-3">
            <div className="text-xs font-bold text-[rgb(var(--text-muted))]">Заканчивается</div>
            <div className="text-sm font-black">
              {state === "expired" ? "3 Aug 2026" : "24 Aug 2026"}
            </div>
          </div>
        </div>
        <div className="rounded-[18px] bg-[rgb(var(--canvas))] p-3">
          <div className="text-xs font-bold text-[rgb(var(--text-muted))]">Период доступа</div>
          <div className="mt-1 text-lg font-black">{copy.days}</div>
        </div>
        <button
          className="min-h-12 w-full rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))]"
          type="button"
          onClick={() => {
            setState("active");
            setNotice("Подписка активирована в demo state.");
          }}
        >
          {notice ? "Бесплатный период" : copy.cta}
        </button>
      </DriverCard>

      {notice ? (
        <DriverCard
          className="mt-3 text-sm font-black text-[rgb(var(--primary))]"
          label="Subscription action result"
        >
          {notice}
        </DriverCard>
      ) : null}

      <DriverCard className="mt-3 space-y-3" label="Правила доступа">
        <h2 className="m-0 text-lg font-black">Доступ</h2>
        {[
          ["Публиковать маршруты", enabled],
          ["Принимать заявки", enabled],
          ["Писать подтверждённым пассажирам", true],
          ["Завершать подтверждённые поездки", true],
          ["Управлять автомобилем и профилем", true],
        ].map(([label, allowed]) => (
          <div
            key={label as string}
            className="flex items-center justify-between gap-3 rounded-[16px] bg-[rgb(var(--canvas))] p-2.5"
          >
            <span className="text-sm font-black">{label}</span>
            <DriverPill tone={allowed ? "success" : "warning"}>
              {allowed ? "Доступно" : "Закрыто"}
            </DriverPill>
          </div>
        ))}
      </DriverCard>

      <DriverCard className="mt-3 space-y-3" label="История подписки">
        <h2 className="m-0 text-lg font-black">История</h2>
        <div className="grid gap-2">
          {[
            ["ENVO Driver", "6 Aug 2026", "Бесплатный период"],
            ["ENVO Driver", "6 Jul 2026", "Завершённый период"],
          ].map(([plan, date, label]) => (
            <div
              key={`${plan}-${date}`}
              className="flex items-center justify-between gap-3 rounded-[16px] bg-[rgb(var(--canvas))] p-2.5"
            >
              <div>
                <div className="text-sm font-black">{plan}</div>
                <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">{date}</div>
              </div>
              <DriverPill tone="accent">{label}</DriverPill>
            </div>
          ))}
        </div>
      </DriverCard>

      <Link
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[rgb(var(--canvas))] px-4 text-sm font-black text-[rgb(var(--primary))] no-underline"
        href="/"
      >
        На главную водителя
      </Link>
    </DriverShell>
  );
}
