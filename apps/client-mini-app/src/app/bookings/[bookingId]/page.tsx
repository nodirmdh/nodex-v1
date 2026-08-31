"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatUzs } from "@nodex/ui";
import { Avatar, Card, ClientHeader, ClientShell, Icon, StatusPill } from "../../client-ui";

type DetailState = "upcoming" | "active" | "completed" | "cancelled";

const stateCopy = {
  upcoming: {
    title: "Поездка подтверждена",
    status: "Предстоящие",
    tone: "success" as const,
    body: "Ваша заявка подтверждена. Покажите код посадки в точке отправления.",
  },
  active: {
    title: "Поездка в пути",
    status: "В пути",
    tone: "info" as const,
    body: "Вы едете в Urgench. Держите детали поездки под рукой до прибытия.",
  },
  completed: {
    title: "Поездка завершена",
    status: "Завершённые",
    tone: "accent" as const,
    body: "Спасибо за поездку. Теперь можно оставить отзыв водителю.",
  },
  cancelled: {
    title: "Заявка отменена",
    status: "Отменено",
    tone: "danger" as const,
    body: "Ваша заявка на место больше не активна. Когда будете готовы, можно найти новую поездку.",
  },
};

export default function BookingDetailPage() {
  const [state, setState] = useState<DetailState>("upcoming");

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("state");
    if (next === "active" || next === "completed" || next === "cancelled") setState(next);
  }, []);

  const copy = stateCopy[state];

  return (
    <ClientShell active="trips">
      <ClientHeader
        backHref="/bookings"
        level="secondary"
        title="Статус поездки"
        subtitle="Nukus → Urgench"
      />

      <Card className="mt-4 space-y-3" compact label="Сводка заявки">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="m-0 text-xs font-black uppercase tracking-[0.12em] text-[rgb(var(--primary))]">
              {copy.status}
            </p>
            <h1 className="m-0 mt-1 text-[22px] font-black leading-tight">{copy.title}</h1>
            <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">
              {copy.body}
            </p>
          </div>
          <StatusPill tone={copy.tone}>{copy.status}</StatusPill>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-[22px] bg-[rgb(var(--canvas))] p-3">
          <div>
            <div className="text-2xl font-black">08:30</div>
            <div className="text-sm font-bold text-[rgb(var(--text-muted))]">Nukus</div>
          </div>
          <div className="grid place-items-center text-[rgb(var(--primary))]">
            <Icon name="car" className="h-5 w-5" />
            <span className="text-[11px] font-black text-[rgb(var(--text-muted))]">3h</span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black">11:30</div>
            <div className="text-sm font-bold text-[rgb(var(--text-muted))]">Urgench</div>
          </div>
        </div>
      </Card>

      <Card className="mt-3 space-y-3" compact label="Boarding state">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-black">
              {state === "completed" || state === "cancelled" ? "Итог поездки" : "Код посадки"}
            </h2>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              {state === "completed"
                ? "Стоимость поездки согласовывалась напрямую с водителем."
                : state === "cancelled"
                  ? "Эта заявка была отменена до подтверждения водителем."
                  : "Покажите этот код водителю на Nukus Central Station."}
            </p>
          </div>
          <StatusPill tone={state === "active" ? "info" : "warning"}>
            {state === "completed" || state === "cancelled" ? "В архиве" : "Действует до 10:25"}
          </StatusPill>
        </div>

        {state === "completed" || state === "cancelled" ? (
          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[22px] bg-[rgb(var(--canvas))] p-3">
                <div className="text-xs font-bold text-[rgb(var(--text-muted))]">Место</div>
                <div className="text-base font-black">Переднее пассажирское</div>
              </div>
              <div className="rounded-[22px] bg-[rgb(var(--surface-tint))] p-3">
                <div className="text-xs font-bold text-[rgb(var(--text-muted))]">
                  Указанная цена
                </div>
                <div className="text-base font-black">{formatUzs(8500000)}</div>
              </div>
            </div>
            {state === "completed" ? (
              <Link
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline"
                href="/reviews"
              >
                Оценить водителя
              </Link>
            ) : (
              <Link
                className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline"
                href="/search"
              >
                Найти новую поездку
              </Link>
            )}
          </div>
        ) : (
          <div className="rounded-[22px] border border-dashed border-[rgb(var(--primary)/0.3)] bg-[rgb(var(--surface-tint))] p-3 text-center text-4xl font-black tracking-[0.26em] text-[rgb(var(--primary))]">
            482913
          </div>
        )}
      </Card>

      {state === "active" || state === "upcoming" ? (
        <Card className="mt-3 space-y-3" compact label="Trip Core">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="m-0 text-lg font-black">PIN старта</h2>
              <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                Код показывается только пассажиру через защищённый API перед началом движения.
              </p>
            </div>
            <StatusPill tone="info">4 цифры</StatusPill>
          </div>
          <div className="rounded-[22px] bg-[rgb(var(--foreground))] p-3 text-center text-3xl font-black tracking-[0.24em] text-[rgb(var(--primary-foreground))]">
            ••••
          </div>
          <div className="grid gap-2 rounded-[22px] bg-[rgb(var(--surface-tint))] p-3 text-sm font-semibold text-[rgb(var(--text-muted))]">
            <div className="flex items-center justify-between gap-3">
              <span>Геолокация поездки</span>
              <strong className="text-[rgb(var(--primary))]">Только во время поездки</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>ETA</span>
              <strong className="text-[rgb(var(--foreground))]">Нет провайдера маршрута</strong>
            </div>
          </div>
        </Card>
      ) : null}
      <Card className="mt-3 space-y-3" compact>
        <div className="flex items-center gap-3">
          <Avatar name="Azizbek Karimov" />
          <div className="min-w-0 flex-1">
            <h2 className="m-0 truncate text-base font-black">Azizbek Karimov</h2>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Chevrolet Cobalt · переднее пассажирское
            </p>
          </div>
          <StatusPill tone="accent">4.9</StatusPill>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline"
            href="/messages/driver-azizbek"
          >
            Написать водителю
          </Link>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--canvas))] px-4 text-sm font-black text-[rgb(var(--primary))] no-underline"
            href="/safety"
          >
            Безопасность
          </Link>
        </div>
      </Card>

      <Card className="mt-3 space-y-2.5" compact label="Статус выполнения поездки">
        <h2 className="m-0 text-base font-black">Прогресс маршрута</h2>
        {[
          ["Посадка", "Nukus Central Station", true],
          ["В пути", "Ожидаемое прибытие 11:30", state === "active" || state === "completed"],
          ["Завершённые", "Итог и отзыв будут доступны после прибытия", state === "completed"],
        ].map(([label, text, active]) => (
          <div key={label as string} className="grid grid-cols-[20px_1fr_auto] gap-3">
            <span
              className={[
                "mt-1 h-3 w-3 rounded-full",
                active ? "bg-[rgb(var(--primary))]" : "bg-[rgb(var(--border-strong))]",
              ].join(" ")}
            />
            <div>
              <div className="text-sm font-black">{label}</div>
              <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">{text}</div>
            </div>
            {active ? <Icon name="check" className="h-4 w-4 text-[rgb(var(--primary))]" /> : null}
          </div>
        ))}
      </Card>

      <Card className="mt-3 space-y-3" compact>
        <h2 className="m-0 text-base font-black">Следующее действие</h2>
        {state === "completed" ? (
          <Link
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline"
            href="/reviews"
          >
            Оценить водителя
          </Link>
        ) : (
          <button
            className="min-h-11 w-full rounded-full bg-[rgb(var(--canvas))] px-4 text-sm font-black text-[rgb(var(--text-muted))]"
            type="button"
            onClick={() => setState("cancelled")}
          >
            Отменить заявку
          </button>
        )}
      </Card>
    </ClientShell>
  );
}
