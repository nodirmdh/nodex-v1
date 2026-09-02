"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DriverCard, DriverHeader, DriverIconView, DriverPill, DriverShell } from "../driver-ui";

type TripState = "boarding" | "active" | "completed";

const passengers = [
  { name: "A. Karimov", initials: "AK", seat: "Переднее passenger", status: "На борту" },
  { name: "M. Seitov", initials: "MS", seat: "Заднее левое", status: "Подтверждён" },
  { name: "D. Allamuratov", initials: "DA", seat: "Заднее правое", status: "Не пришёл" },
];

const parcels = [
  {
    title: "Маленькая посылка",
    detail: "Nukus Central Station → Urgench Bus Station",
    status: "Принято",
  },
];

export default function TripOperationDemo() {
  const [state, setState] = useState<TripState>("boarding");
  const [finishSheet, setFinishSheet] = useState(false);
  const [startPin, setStartPin] = useState("");
  const [delayOpen, setDelayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reportedDelay, setReportedDelay] = useState("По расписанию");
  const [cancelReason, setCancelReason] = useState("Техническая проблема");
  const [cancelled, setCancelled] = useState(false);
  const [parcelState, setParcelState] = useState('Принята');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextState = params.get("state");
    if (nextState === "active" || nextState === "completed") setState(nextState);
    setFinishSheet(params.get("sheet") === "finish");
  }, []);

  const isActive = state === "active";
  const isCompleted = state === "completed";
  const boarded = 2;

  return (
    <DriverShell active="trips">
      <DriverHeader
        title={cancelled ? "Cancelled" : isActive ? "In progress" : isCompleted ? "Completed" : "Trip detail"}
        subtitle="Nukus → Urgench · Chevrolet Cobalt"
        status={
          <DriverPill tone={isCompleted ? "success" : isActive ? "warning" : "info"}>
            {cancelled ? "Cancelled" : isCompleted ? "Completed" : isActive ? `In progress · ${reportedDelay}` : "Посадка"}
          </DriverPill>
        }
      />

      <DriverCard
        className={[
          "mt-4 space-y-3",
          isActive ? "ring-2 ring-[rgb(var(--primary)/0.24)]" : "",
        ].join(" ")}
        label="Trip operation detail"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-2xl font-black">Nukus → Urgench</h1>
            <p
              className={[
                "m-0 mt-1 text-sm font-semibold",
                isActive ? "text-[rgb(var(--primary))]" : "text-[rgb(var(--text-muted))]",
              ].join(" ")}
            >
              Сегодня, 08:30 · 95 A 214 QA
            </p>
          </div>
          <DriverIconView name={isActive ? "car" : "route"} className="h-6 w-6" />
        </div>
        <div
          className={[
            "grid grid-cols-3 gap-2 rounded-[20px] p-3 text-center",
            isActive ? "bg-[rgb(var(--surface-tint))]" : "bg-[rgb(var(--canvas))]",
          ].join(" ")}
        >
          <Metric label="Занято" value="3/4" active={isActive} />
          <Metric label="На борту" value={`${boarded}/3`} active={isActive} />
          <Metric label="Ожидает" value={isCompleted ? "0" : "1"} active={isActive} />
        </div>
        {cancelled ? (
          <p className="m-0 text-sm font-semibold text-[rgb(var(--destructive))]">Trip cancelled in demo state. Reliability event is visible for support/admin review.</p>
        ) : isActive ? (
          <p className="m-0 text-sm font-semibold opacity-80">
            Trip is underway. Keep passenger contact and parcel handoff visible until arrival.
          </p>
        ) : isCompleted ? (
          <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
            Trip completed with 2 passengers carried and no-show history preserved.
          </p>
        ) : (
          <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
            Проверьте посадку перед стартом. Подтверждённые пассажиры остаются доступны.
          </p>
        )}
      </DriverCard>

      {!isCompleted && (
        <DriverCard className="mt-3 space-y-3" label="Trip next operation">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-lg font-black">
                {isActive ? "Finish when arrived" : "Начать поездку в Urgench?"}
              </h2>
              <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                {isActive
                  ? "Confirm passengers and parcels before completing."
                  : "2 из 3 пассажиров на борту · 1 пассажир не решён."}
              </p>
            </div>
            <DriverPill tone={isActive ? "warning" : "info"}>
              {isActive ? "Arrival" : "Готово"}
            </DriverPill>
          </div>
          {!isActive ? (
            <div className="grid gap-2 rounded-[20px] bg-[rgb(var(--canvas))] p-3">
              <label
                className="text-xs font-black uppercase tracking-[0.12em] text-[rgb(var(--primary))]"
                htmlFor="trip-start-pin"
              >
                PIN пассажира
              </label>
              <input
                id="trip-start-pin"
                className="min-h-12 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 text-center text-xl font-black tracking-[0.25em] outline-none"
                inputMode="numeric"
                maxLength={4}
                onChange={(event) => setStartPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="••••"
                value={startPin}
              />
              <p className="m-0 text-xs font-semibold text-[rgb(var(--text-muted))]">
                Старт включится после проверки PIN пассажира в демо-сценарии.
              </p>
            </div>
          ) : null}
          <button
            className="min-h-12 w-full rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] disabled:opacity-50"
            disabled={!isActive && startPin.length !== 4}
            onClick={() => (isActive ? setFinishSheet(true) : setState("active"))}
            type="button"
          >
            {isActive ? "Finish trip" : "Проверить PIN и начать"}
          </button>
          {finishSheet && (
            <FinishSheet
              onFinish={() => {
                setState("completed");
                setFinishSheet(false);
              }}
            />
          )}
        </DriverCard>
      )}

      {!isCompleted && !cancelled ? (
        <DriverCard className="mt-3 space-y-3" label="Действия надёжности">
          <div className="flex items-start justify-between gap-3"><div><h2 className="m-0 text-lg font-black">Действия надёжности</h2><p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">Сообщите о задержке или отмене с видимым влиянием на надёжность.</p></div><DriverPill tone={reportedDelay === "По расписанию" ? "success" : "warning"}>{reportedDelay}</DriverPill></div>
          <div className="grid grid-cols-2 gap-2"><button className="min-h-11 rounded-full border-0 bg-[rgb(var(--canvas))] px-3 text-sm font-black text-[rgb(var(--primary))]" type="button" onClick={() => setDelayOpen(true)}>Сообщить о задержке</button><button className="min-h-11 rounded-full border-0 bg-[rgb(var(--destructive-soft))] px-3 text-sm font-black text-[rgb(var(--destructive))]" type="button" onClick={() => setCancelOpen(true)}>Отменить поездку</button></div>
        </DriverCard>
      ) : null}

      <DriverCard className="mt-3 space-y-3" label="Занятость мест">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-black">Занятость мест</h2>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              4 пассажирских места · 3 занято · 1 свободно
            </p>
          </div>
          <DriverPill tone="accent">75%</DriverPill>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            ["Переднее", "На борту"],
            ["Заднее левое", isCompleted ? "На борту" : "Подтверждён"],
            ["Заднее правое", "Не пришёл"],
            ["Заднее центр", "Свободно"],
          ].map(([seat, status]) => (
            <div
              key={seat}
              className={[
                "rounded-[16px] p-2 text-center text-[10px] font-black",
                status === "На борту"
                  ? "bg-[rgb(var(--success-soft))] text-[rgb(var(--success))]"
                  : status === "Не пришёл"
                    ? "bg-[rgb(var(--destructive-soft))] text-[rgb(var(--destructive))]"
                    : status === "Подтверждён"
                      ? "bg-[rgb(var(--info-soft))] text-[rgb(var(--info))]"
                      : "bg-[rgb(var(--canvas))] text-[rgb(var(--text-muted))]",
              ].join(" ")}
            >
              <div>{seat}</div>
              <div className="mt-1 font-bold">{status}</div>
            </div>
          ))}
        </div>
      </DriverCard>

      <DriverCard className="mt-3 space-y-3" label="Пассажиры">
        <div className="flex items-center justify-between gap-3">
          <h2 className="m-0 text-lg font-black">Пассажиры</h2>
          <Link
            className="text-sm font-black text-[rgb(var(--primary))] no-underline"
            href="/passengers-demo?view=passengers"
          >
            Управлять
          </Link>
        </div>
        {passengers.map((passenger) => (
          <div
            key={passenger.name}
            className="flex items-center gap-3 rounded-[18px] bg-[rgb(var(--canvas))] p-3"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-xs font-black text-[rgb(var(--primary))]">
              {passenger.initials}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-black">{passenger.name}</div>
              <div className="truncate text-xs font-semibold text-[rgb(var(--text-muted))]">
                {passenger.seat}
              </div>
            </div>
            <PassengerStatusPill
              status={
                isCompleted && passenger.status === "Подтверждён" ? "На борту" : passenger.status
              }
            />
          </div>
        ))}
      </DriverCard>

      <DriverCard className="mt-3 space-y-3" label="Посылки">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-black">Есть посылка по маршруту</h2>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">Отдельно от пассажирских мест · багажник</p>
          </div>
          <DriverPill tone="info">{parcelState}</DriverPill>
        </div>
        {parcels.map((parcel) => (
          <div key={parcel.title} className="rounded-[18px] bg-[rgb(var(--canvas))] p-3">
            <div className="text-sm font-black">{parcel.title}</div>
            <div className="mt-1 text-xs font-semibold text-[rgb(var(--text-muted))]">{parcel.detail}</div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {["Забрал посылку", "В пути", "Передал получателю"].map((action) => (
                <button key={action} className={`min-h-10 rounded-full border-0 px-2 text-[11px] font-black ${parcelState === action ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "bg-[rgb(var(--surface))] text-[rgb(var(--primary))]"}`} type="button" onClick={() => setParcelState(action)}>{action}</button>
              ))}
            </div>
          </div>
        ))}
      </DriverCard>
      {delayOpen ? <DelaySheet onClose={() => setDelayOpen(false)} onSave={(value) => { setReportedDelay(value); setDelayOpen(false); setState("active"); }} /> : null}
      {cancelOpen ? <CancelSheet reason={cancelReason} onReason={setCancelReason} onClose={() => setCancelOpen(false)} onConfirm={() => { setCancelled(true); setCancelOpen(false); }} /> : null}
    </DriverShell>
  );
}

function DelaySheet({ onClose, onSave }: { onClose: () => void; onSave: (value: string) => void }) {
  const [minutes, setMinutes] = useState("10 минут");
  const [reason, setReason] = useState("пробки");
  return <div className="fixed inset-0 z-50 grid place-items-end bg-[rgb(var(--foreground)/0.28)] p-3" role="dialog" aria-modal="true"><section className="w-full max-w-[430px] rounded-[26px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-floating)]"><div className="flex items-center justify-between gap-3"><h2 className="m-0 text-lg font-black">Сообщить о задержке</h2><button className="h-9 w-9 rounded-full border-0 bg-[rgb(var(--canvas))] text-lg font-black" type="button" onClick={onClose}>×</button></div><div className="mt-3 grid grid-cols-3 gap-2">{["5 минут", "10 минут", "15 минут", "30+ минут", "своё время"].map((item) => <button key={item} className={`min-h-10 rounded-[16px] border-0 px-2 text-xs font-black ${minutes === item ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "bg-[rgb(var(--canvas))] text-[rgb(var(--text-muted))]"}`} type="button" onClick={() => setMinutes(item)}>{item}</button>)}</div><div className="mt-3 grid grid-cols-2 gap-2">{["пробки", "пассажир задерживается", "техническая причина", "другое"].map((item) => <button key={item} className={`min-h-10 rounded-[16px] border-0 px-2 text-xs font-black ${reason === item ? "bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]" : "bg-[rgb(var(--canvas))] text-[rgb(var(--text-muted))]"}`} type="button" onClick={() => setReason(item)}>{item}</button>)}</div><button className="mt-3 min-h-11 w-full rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))]" type="button" onClick={() => onSave(`${minutes} · ${reason}`)}>Сохранить ETA</button></section></div>;
}

function CancelSheet({ reason, onReason, onClose, onConfirm }: { reason: string; onReason: (value: string) => void; onClose: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-50 grid place-items-end bg-[rgb(var(--foreground)/0.28)] p-3" role="dialog" aria-modal="true"><section className="w-full max-w-[430px] rounded-[26px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-floating)]"><div className="flex items-center justify-between gap-3"><h2 className="m-0 text-lg font-black">Отмена поездки</h2><button className="h-9 w-9 rounded-full border-0 bg-[rgb(var(--canvas))] text-lg font-black" type="button" onClick={onClose}>×</button></div><p className="m-0 mt-2 rounded-[18px] bg-[rgb(var(--destructive-soft))] p-3 text-sm font-semibold text-[rgb(var(--destructive))]">Отмена за 25 минут до выезда снизит показатель надёжности.</p><div className="mt-3 grid gap-2">{["Technical issue", "Traffic", "Vehicle unavailable", "Passenger issue", "Other"].map((item) => <button key={item} className={`min-h-10 rounded-[16px] border-0 px-3 text-left text-sm font-black ${reason === item ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "bg-[rgb(var(--canvas))] text-[rgb(var(--foreground))]"}`} type="button" onClick={() => onReason(item)}>{item}</button>)}</div><button className="mt-3 min-h-11 w-full rounded-full border-0 bg-[rgb(var(--destructive-soft))] px-4 text-sm font-black text-[rgb(var(--destructive))]" type="button" onClick={onConfirm}>Confirm cancellation</button></section></div>;
}

function FinishSheet({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="rounded-[22px] bg-[rgb(var(--foreground))] p-4 text-[rgb(var(--primary-foreground))] shadow-[var(--shadow-floating)]">
      <h3 className="m-0 text-lg font-black">Finish trip?</h3>
      <p className="m-0 mt-1 text-sm font-semibold opacity-80">
        Nukus → Urgench · 3 passengers · 1 parcel
      </p>
      <button
        className="mt-3 min-h-11 w-full rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))]"
        type="button"
        onClick={onFinish}
      >
        Confirm finish trip
      </button>
    </div>
  );
}

function PassengerStatusPill({ status }: { status: string }) {
  return (
    <DriverPill tone={status === "На борту" ? "success" : status === "Не пришёл" ? "danger" : "info"}>
      {status}
    </DriverPill>
  );
}

function Metric({
  label,
  value,
  active = false,
}: {
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div>
      <div className="text-sm font-black">{value}</div>
      <div
        className={[
          "text-[10px] font-bold",
          active ? "opacity-70" : "text-[rgb(var(--text-muted))]",
        ].join(" ")}
      >
        {label}
      </div>
    </div>
  );
}
