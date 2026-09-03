"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatUzs } from "@nodex/ui";
import { DriverCard, DriverHeader, DriverIconView, DriverPill, DriverShell } from "../driver-ui";

type PassengerStatus = "Подтверждён" | "На борту" | "Не пришёл";
type ViewMode = "requests" | "boarding" | "passengers";

const requests = [
  {
    id: "request-front",
    initials: "NK",
    name: "Клиент ENVO",
    seat: "Переднее пассажирское · +20%",
    count: "1 пассажир",
    trip: "Nukus → Urgench, завтра 08:30",
    totalMinor: 10200000,
    luggage: "Небольшой багаж",
    note: "Посадка у вокзала Nukus.",
    submitted: "4 мин назад",
  },
  {
    id: "request-rear",
    initials: "AS",
    name: "Aziza Seitova",
    seat: "Заднее левое",
    count: "1 пассажир",
    trip: "Nukus → Urgench, завтра 08:30",
    totalMinor: 8500000,
    luggage: "Рюкзак",
    note: "Едет с передачей посылки.",
    submitted: "12 мин назад",
  },
];

const passengers: Array<{
  id: string;
  initials: string;
  name: string;
  status: PassengerStatus;
  seat: string;
  boarding: string;
  note: string;
  totalMinor: number;
}> = [
  {
    id: "booking-1",
    initials: "AK",
    name: "A. Karimov",
    status: "На борту",
    seat: "Переднее пассажирское · +20%",
    boarding: "PIN проверен",
    note: "Небольшой багаж · расчёт напрямую с водителем",
    totalMinor: 10200000,
  },
  {
    id: "booking-2",
    initials: "MS",
    name: "M. Seitov",
    status: "Подтверждён",
    seat: "Заднее левое",
    boarding: "Ожидает PIN",
    note: "Оплата согласована напрямую",
    totalMinor: 8500000,
  },
  {
    id: "booking-3",
    initials: "DA",
    name: "D. Allamuratov",
    status: "Не пришёл",
    seat: "Заднее правое",
    boarding: "Отмечено в 08:20",
    note: "Неявка отмечена водителем",
    totalMinor: 8500000,
  },
];

function passengerTone(status: PassengerStatus) {
  if (status === "На борту") return "success";
  if (status === "Не пришёл") return "danger";
  return "info";
}

export default function ПассажирыDemo() {
  const [code, setPIN] = useState("");
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [acceptSheet, setAcceptSheet] = useState<string | null>(null);
  const [acceptedRequest, setПринятоRequest] = useState("");
  const [rejectedЗаявки, setОтклоненоЗаявки] = useState<string[]>([]);
  const [confirmedBoarding, setПодтверждёнBoarding] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("requests");
  const [avoidPassenger, setAvoidPassenger] = useState<typeof passengers[number] | null>(null);
  const [avoidReason, setAvoidReason] = useState("грубое общение");
  const [avoidedPassengerIds, setAvoidedPassengerIds] = useState<string[]>([]);
  const boardedCount = passengers.filter((passenger) => passenger.status === "На борту").length;
  const noShowCount = passengers.filter((passenger) => passenger.status === "Не пришёл").length;
  const pendingCount = passengers.filter((passenger) => passenger.status === "Подтверждён").length;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSubscriptionExpired(params.get("subscription") === "expired");
    setAcceptSheet(params.get("sheet") === "accept" ? requests[0]!.id : null);
    const nextView = params.get("view");
    if (nextView === "boarding" || nextView === "passengers") setViewMode(nextView);
  }, []);

  return (
    <DriverShell active="requests">
      <DriverHeader
        title={viewMode === "requests" ? "Заявки" : "Пассажиры"}
        subtitle="Заявки, посадка и ENVO Fill"
        status={
          <DriverPill tone={subscriptionExpired ? "warning" : "success"}>
            {subscriptionExpired ? "Ограничено" : "Активно"}
          </DriverPill>
        }
      />

      <DriverCard className="mt-4 space-y-3" label="Рабочий экран водителя">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-xl font-semibold">Nukus → Urgench</h1>
            <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Посадка · Chevrolet Cobalt · 08:30
            </p>
          </div>
          <DriverPill tone="warning">Посадка</DriverPill>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <Metric label="Всего" value={String(passengers.length)} />
          <Metric label="На борту" value={String(boardedCount)} />
          <Metric label="Ожидает" value={String(pendingCount)} />
          <Metric label="Не пришёл" value={String(noShowCount)} />
        </div>
      </DriverCard>

      {subscriptionExpired && (
        <DriverCard
          className="mt-3 space-y-2 ring-1 ring-[rgb(var(--warning)/0.22)]"
          label="Ограничение заявок"
        >
          <div className="flex gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[rgb(var(--warning-soft))] text-[rgb(var(--warning))]">
              <DriverIconView name="lock" />
            </span>
            <div>
              <h2 className="m-0 text-base font-semibold">Приём заявок остановлен</h2>
              <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                Активируйте подписку, чтобы принимать новые заявки.
              </p>
            </div>
          </div>
        </DriverCard>
      )}

      <div className="mt-3 grid grid-cols-3 gap-1 rounded-full bg-[rgb(var(--surface))] p-1 shadow-[var(--shadow-xs)]">
        {[
          ["requests", "Заявки"],
          ["boarding", "Посадка"],
          ["passengers", "Пассажиры"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={viewMode === key}
            className={[
              "min-h-10 rounded-full border-0 text-xs font-semibold",
              viewMode === key
                ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                : "bg-transparent text-[rgb(var(--text-muted))]",
            ].join(" ")}
            onClick={() => setViewMode(key as ViewMode)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {viewMode === "requests" && (
        <section aria-label="Заявки пассажиров" className="mt-3 space-y-3">
          {requests.map((request) => {
            const rejected = rejectedЗаявки.includes(request.id);
            const accepted = acceptedRequest === request.id;

            return (
              <DriverCard
                key={request.id}
                className="space-y-3"
                label={`Заявка пассажира ${request.name}`}
              >
                <div className="flex items-start gap-3">
                  <Avatar initials={request.initials} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="m-0 text-lg font-semibold">{request.name}</h2>
                        <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                          {request.count} · {request.submitted}
                        </p>
                      </div>
                      <DriverPill tone="accent">{formatUzs(request.totalMinor)}</DriverPill>
                    </div>
                    <div className="mt-3 rounded-[18px] bg-[rgb(var(--canvas))] p-3 text-sm">
                      <div className="font-semibold">{request.seat}</div>
                      <div className="mt-1 font-semibold text-[rgb(var(--text-muted))]">
                        {request.trip}
                      </div>
                      <div className="mt-2 text-xs font-bold text-[rgb(var(--text-muted))]">
                        {request.luggage} · {request.note}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_1fr] gap-2">
                  <button
                    className="min-h-11 rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-semibold text-[rgb(var(--primary-foreground))] disabled:bg-[rgb(var(--warning-soft))] disabled:text-[rgb(var(--warning))]"
                    disabled={subscriptionExpired}
                    onClick={() => setAcceptSheet(request.id)}
                    type="button"
                  >
                    {subscriptionExpired
                      ? "Нужна активация"
                      : accepted
                        ? "Принято"
                        : "Принять"}
                  </button>
                  <button
                    className="min-h-11 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 text-sm font-semibold text-[rgb(var(--text-muted))]"
                    type="button"
                    onClick={() => {
                      setОтклоненоЗаявки((current) =>
                        current.includes(request.id) ? current : [...current, request.id],
                      );
                      setAcceptSheet(null);
                    }}
                  >
                    {rejected ? "Отклонено" : "Пропустить"}
                  </button>
                </div>
                {acceptSheet === request.id && !subscriptionExpired && (
                  <AcceptSheet
                    onConfirm={() => {
                      setПринятоRequest(request.id);
                      setAcceptSheet(null);
                      setViewMode("boarding");
                    }}
                  />
                )}
              </DriverCard>
            );
          })}
        </section>
      )}

      {viewMode === "boarding" && (
        <DriverCard className="mt-3 space-y-3" label="PIN посадки verification">
          <div className="flex items-start gap-3">
            <Avatar initials="MS" />
            <div>
              <h2 className="m-0 text-lg font-semibold">M. Seitov</h2>
              <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                Заднее левое · ожидает PIN посадки
              </p>
            </div>
          </div>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">PIN</span>
            <input
              aria-label="PIN посадки"
              className="min-h-14 rounded-[18px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-center text-xl font-semibold tracking-[0.28em] text-[rgb(var(--foreground))]"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setPIN(event.target.value.replace(/\D/g, ""))}
              placeholder="_ _ _ _ _ _"
              value={code}
            />
          </label>
          <button
            className="min-h-12 w-full rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-semibold text-[rgb(var(--primary-foreground))] disabled:bg-[rgb(var(--canvas))] disabled:text-[rgb(var(--text-muted))]"
            disabled={code.length < 6}
            type="button"
            onClick={() => setПодтверждёнBoarding(true)}
          >
            {confirmedBoarding ? "Посадка подтверждена" : "Подтвердить посадку"}
          </button>
          <p className="m-0 text-xs font-semibold text-[rgb(var(--text-muted))]">
            Введите PIN из приложения пассажира.
          </p>
        </DriverCard>
      )}

      {viewMode === "passengers" && (
        <section aria-label="Список пассажиров" className="mt-3 space-y-3">
          {passengers.map((passenger) => (
            <PassengerRow key={passenger.id} passenger={passenger} avoided={avoidedPassengerIds.includes(passenger.id)} onAvoid={() => setAvoidPassenger(passenger)} />
          ))}
        </section>
      )}

      {avoidPassenger ? (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/35 px-3 pb-3" role="dialog" aria-modal="true" aria-label="Не брать пассажира">
          <div className="w-full max-w-[430px] rounded-[28px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-floating)]">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[rgb(var(--border-strong))]" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="m-0 text-lg font-semibold">Не брать пассажира?</h3>
                <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">{avoidPassenger.name} · {avoidPassenger.seat}</p>
              </div>
              <button aria-label="Закрыть" className="grid h-9 w-9 place-items-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] text-sm font-semibold" onClick={() => setAvoidPassenger(null)} type="button">×</button>
            </div>
            <div className="mt-3 grid gap-2">
              {["грубое общение", "опоздание", "не понравилась поездка", "другое"].map((reason) => (
                <button key={reason} className={`min-h-10 rounded-[16px] border px-3 text-left text-sm font-semibold ${avoidReason === reason ? "border-[rgb(var(--primary))] bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]" : "border-[rgb(var(--border))] bg-[rgb(var(--canvas))] text-[rgb(var(--foreground))]"}`} onClick={() => setAvoidReason(reason)} type="button">
                  {reason}
                </button>
              ))}
            </div>
            <button className="mt-3 min-h-12 w-full rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-semibold text-[rgb(var(--primary-foreground))]" onClick={() => { setAvoidedPassengerIds((current) => current.includes(avoidPassenger.id) ? current : [...current, avoidPassenger.id]); setAvoidPassenger(null); }} type="button">
              Подтвердить
            </button>
          </div>
        </div>
      ) : null}

      <DriverCard className="mt-3 space-y-3" label="Операции поездки">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-semibold">Следующее действие</h2>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Проверьте оставшегося пассажира перед выездом.
            </p>
          </div>
          <Link
            className="inline-flex min-h-10 min-w-[96px] shrink-0 items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-semibold text-[rgb(var(--primary-foreground))] no-underline"
            href="/trip-demo"
          >
            Открыть поездку
          </Link>
        </div>
      </DriverCard>
    </DriverShell>
  );
}

function AcceptSheet({ onConfirm }: { onConfirm: () => void }) {
  return (
    <div className="rounded-[22px] bg-[rgb(var(--foreground))] p-4 text-[rgb(var(--primary-foreground))] shadow-[var(--shadow-floating)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="m-0 text-lg font-semibold">Принять заявку?</h3>
          <p className="m-0 mt-1 text-sm font-semibold opacity-80">
            Клиент ENVO · Переднее пассажирское · Nukus → Urgench
          </p>
        </div>
        <DriverPill tone="accent">Занять место</DriverPill>
      </div>
      <p className="m-0 mt-3 text-sm font-semibold opacity-80">
        После вашего подтверждения выбранное место станет занятым, а контакт пассажира будет доступен.
      </p>
      <button
        className="mt-3 min-h-11 w-full rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-semibold text-[rgb(var(--primary-foreground))]"
        type="button"
        onClick={onConfirm}
      >
        Подтвердить
      </button>
    </div>
  );
}

function PassengerRow({
  passenger,
  avoided,
  onAvoid,
}: {
  passenger: {
    initials: string;
    name: string;
    status: PassengerStatus;
    seat: string;
    boarding: string;
    note: string;
    totalMinor: number;
  };
  avoided: boolean;
  onAvoid: () => void;
}) {
  return (
    <DriverCard className="space-y-3" label={`Пассажир ${passenger.name}`}>
      <div className="flex items-start gap-3">
        <Avatar initials={passenger.initials} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="m-0 text-base font-semibold">{passenger.name}</h2>
              <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                {passenger.seat} · {formatUzs(passenger.totalMinor)}
              </p>
            </div>
            <DriverPill tone={passengerTone(passenger.status)}>{passenger.status}</DriverPill>
          </div>
          <div className="mt-3 rounded-[18px] bg-[rgb(var(--canvas))] p-3 text-sm">
            <div className="font-semibold">{passenger.boarding}</div>
            <div className="mt-1 font-semibold text-[rgb(var(--text-muted))]">{passenger.note}</div>
          </div>
        </div>
      </div>
      {avoided ? <div className="rounded-[16px] bg-[rgb(var(--warning-soft))] p-3 text-xs font-semibold text-[rgb(var(--warning))]">Этот пассажир больше не будет предлагаться вам.</div> : null}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-full border-0 bg-[rgb(var(--canvas))] text-xs font-semibold text-[rgb(var(--primary))] no-underline"
          href="/messages/parcel-sender"
        >
          Чат
        </Link>
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-full border-0 bg-[rgb(var(--canvas))] text-xs font-semibold text-[rgb(var(--primary))] no-underline"
          href="/messages/parcel-sender"
        >
          Контакт
        </Link>
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-xs font-semibold text-[rgb(var(--text-muted))] no-underline"
          href="/passengers-demo?view=passengers&marked=no-show"
        >
          Не пришёл
        </Link>
        <button
          className="min-h-10 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-xs font-semibold text-[rgb(var(--text-muted))]"
          onClick={onAvoid}
          type="button"
        >
          Не брать
        </button>
      </div>
    </DriverCard>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-sm font-semibold text-[rgb(var(--primary))]">
      {initials}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-[rgb(var(--canvas))] p-2">
      <div className="text-sm font-semibold">{value}</div>
      <div className="text-[10px] font-bold text-[rgb(var(--text-muted))]">{label}</div>
    </div>
  );
}
