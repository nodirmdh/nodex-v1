import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, VehicleImage, formatUzs } from "@nodex/ui";

type IconName =
  | "back"
  | "bag"
  | "clock"
  | "message"
  | "navigation"
  | "seat"
  | "share"
  | "shield"
  | "star";

const iconPaths: Record<IconName, ReactNode> = {
  back: <path d="m15 6-6 6 6 6" />,
  bag: <path d="M9 8V7a3 3 0 0 1 6 0v1M6 8h12l1 11H5L6 8Z" />,
  clock: <path d="M12 6v6l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  message: <path d="M5 18v-4.5A7.5 7.5 0 1 1 9.5 20H6.8A1.8 1.8 0 0 1 5 18Z" />,
  navigation: <path d="m6 12 12-6-5 12-2-5-5-1Z" />,
  seat: <path d="M8 6a3 3 0 0 1 6 0v5h2a3 3 0 0 1 3 3v5H7v-5a3 3 0 0 1 3-3h4" />,
  share: (
    <path d="M16 8 8 12l8 4M18 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm10 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
  ),
  shield: <path d="M12 3 5 6v5c0 4.2 2.8 7.6 7 10 4.2-2.4 7-5.8 7-10V6l-7-3Z" />,
  star: <path d="m12 4 2.2 4.7 5.1.6-3.8 3.5 1 5-4.5-2.5-4.5 2.5 1-5-3.8-3.5 5.1-.6L12 4Z" />,
};

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height="18"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="18"
    >
      {iconPaths[name]}
    </svg>
  );
}

const tripDetails = {
  "phase5-nukus-urgench-morning": {
    origin: "Nukus",
    destination: "Urgench",
    departure: "08:30",
    arrival: "11:30",
    duration: "3h 00m",
    priceMinor: 8500000,
    seats: 4,
    driver: "Azizbek Karimov",
    rating: "4.9",
    completedTrips: "268 поездок",
    response: "Быстро отвечает",
    надёжность: 96,
    vehicle: "Chevrolet Cobalt",
    color: "Белый",
    plate: "95 A 214 QA",
    capacity: "4 места",
    pickup: "Nukus central station",
    dropoff: "Urgench bus station",
    note: "Водитель принимает небольшие посылки и одну среднюю сумку на пассажира.",
    parcel: true,
    luggage: true,
  },
  "phase5-nukus-urgench-evening": {
    origin: "Nukus",
    destination: "Urgench",
    departure: "18:10",
    arrival: "21:05",
    duration: "2h 55m",
    priceMinor: 9200000,
    seats: 2,
    driver: "Madina Yusupova",
    rating: "4.8",
    completedTrips: "142 поездки",
    response: "Надёжный",
    надёжность: 91,
    vehicle: "Chevrolet Tracker",
    color: "Серебристый",
    plate: "95 B 782 LA",
    capacity: "4 места",
    pickup: "Nukus central station",
    dropoff: "Urgench bus station",
    note: "Вечерняя поездка с местом для багажа. Посылки в этой поездке не принимаются.",
    parcel: false,
    luggage: true,
  },
  "phase5-nukus-khiva": {
    origin: "Nukus",
    destination: "Khiva",
    departure: "09:00",
    arrival: "12:30",
    duration: "3h 30m",
    priceMinor: 9500000,
    seats: 1,
    driver: "Sherzod Rakhimov",
    rating: "4.7",
    completedTrips: "94 поездки",
    response: "Проверен",
    надёжность: 94,
    vehicle: "BYD Chazor",
    color: "Синий",
    plate: "90 C 414 HA",
    capacity: "4 места",
    pickup: "Nukus central station",
    dropoff: "Северные ворота Khiva",
    note: "Почти полный рейс. Одна средняя сумка включена.",
    parcel: true,
    luggage: true,
  },
};

export default async function PublicTripPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const trip =
    tripDetails[tripId as keyof typeof tripDetails] ?? tripDetails["phase5-nukus-urgench-morning"];

  return (
    <main className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      <div className="mx-auto min-h-screen max-w-[430px] bg-[linear-gradient(180deg,rgb(var(--surface-tint))_0%,rgb(var(--background))_30%,rgb(var(--canvas))_100%)] px-4 pb-6 pt-4">
        <header className="flex items-center gap-3">
          <Link
            aria-label="Назад к поиску"
            className="grid h-11 w-11 place-items-center rounded-full bg-[rgb(var(--surface)/0.92)] text-[rgb(var(--foreground))] shadow-[var(--shadow-xs)]"
            href="/search"
          >
            <Icon name="back" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-xs font-extrabold uppercase tracking-[0.12em] text-[rgb(var(--primary))]">
              Детали поездки
            </p>
            <h1 className="m-0 truncate text-xl font-extrabold">
              {trip.origin} to {trip.destination}
            </h1>
          </div>
          <button
            aria-label="Поделиться поездкой"
            className="grid h-11 w-11 place-items-center rounded-full bg-[rgb(var(--surface)/0.92)] text-[rgb(var(--foreground))] shadow-[var(--shadow-xs)]"
          >
            <Icon name="share" />
          </button>
        </header>

        <section className="mt-5 rounded-[32px] bg-[rgb(var(--surface))] p-5 shadow-[var(--shadow-lg)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-extrabold text-[rgb(var(--text-muted))]">
                <Icon name="clock" className="h-4 w-4" />
                Завтра · Asia/Tashkent
              </div>
              <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div>
                  <div className="text-3xl font-black leading-none">{trip.departure}</div>
                  <div className="mt-1 text-sm font-bold text-[rgb(var(--text-muted))]">
                    {trip.origin}
                  </div>
                </div>
                <div className="grid place-items-center gap-1 text-[rgb(var(--primary))]">
                  <Icon name="navigation" className="h-5 w-5" />
                  <span className="text-[11px] font-extrabold text-[rgb(var(--text-muted))]">
                    {trip.duration}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black leading-none">{trip.arrival}</div>
                  <div className="mt-1 text-sm font-bold text-[rgb(var(--text-muted))]">
                    {trip.destination}
                  </div>
                </div>
              </div>
            </div>
            <Badge tone={trip.seats === 1 ? "warning" : "accent"}>{trip.seats} seats</Badge>
          </div>

          <div className="mt-5 grid gap-4">
            <div className="grid grid-cols-[24px_1fr_auto] gap-3">
              <div className="flex flex-col items-center">
                <span className="mt-1 h-3 w-3 rounded-full bg-[rgb(var(--primary))]" />
                <span className="h-full w-0.5 bg-[rgb(var(--border-strong))]" />
              </div>
              <div>
                <div className="text-sm font-extrabold">{trip.pickup}</div>
                <div className="text-xs font-medium text-[rgb(var(--text-muted))]">
                  Точка посадки
                </div>
              </div>
              <div className="text-sm font-extrabold">{trip.departure}</div>
            </div>
            <div className="grid grid-cols-[24px_1fr_auto] gap-3">
              <div className="grid place-items-center">
                <span className="h-3 w-3 rounded-full bg-[rgb(var(--accent))]" />
              </div>
              <div>
                <div className="text-sm font-extrabold">{trip.dropoff}</div>
                <div className="text-xs font-medium text-[rgb(var(--text-muted))]">
                  Точка прибытия
                </div>
              </div>
              <div className="text-sm font-extrabold">{trip.arrival}</div>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-[28px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-md)]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="m-0 text-lg font-extrabold">Безопасность поездки</h2>
              <p className="m-0 text-xs font-bold text-[rgb(var(--text-muted))]">
                Быстрые действия с контекстом этого рейса.
              </p>
            </div>
            <Icon name="shield" className="h-5 w-5 text-[rgb(var(--primary))]" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                label: "Связаться с поддержкой",
                href: `/messages/support-ticket?tripId=${tripId}`,
              },
              { label: "Поделиться поездкой", href: `/safety/sos?tripId=${tripId}&share=1` },
              { label: "Информация о поездке", href: `/trips/${tripId}` },
              { label: "Водитель и авто", href: `/trips/${tripId}#driver` },
              { label: "Сообщить о проблеме", href: `/support?tripId=${tripId}&safety=report` },
            ].map((action) => (
              <Link
                key={action.label}
                className="inline-flex min-h-11 items-center justify-center rounded-[18px] bg-[rgb(var(--canvas))] px-3 text-center text-xs font-black text-[rgb(var(--primary))] no-underline"
                href={action.href}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </section>
        <section className="mt-4 rounded-[28px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-md)]">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-lg font-black text-[rgb(var(--primary))]">
              {trip.driver[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="m-0 truncate text-lg font-extrabold">{trip.driver}</h2>
                <Badge tone="success">Проверен</Badge>
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm font-bold text-[rgb(var(--text-muted))]">
                <Icon name="star" className="h-4 w-4 text-[rgb(var(--gold))]" />
                {trip.rating}
                <span>·</span>
                {trip.completedTrips}
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-[22px] bg-[rgb(var(--canvas))] p-3">
              <Icon name="shield" className="h-5 w-5 text-[rgb(var(--primary))]" />
              <div className="mt-2 text-lg font-black">{trip.надёжность}%</div>
              <div className="text-xs font-bold text-[rgb(var(--text-muted))]">надёжность</div>
            </div>
            <div className="rounded-[22px] bg-[rgb(var(--canvas))] p-3">
              <Icon name="message" className="h-5 w-5 text-[rgb(var(--primary))]" />
              <div className="mt-2 text-lg font-black">{trip.response}</div>
              <div className="text-xs font-bold text-[rgb(var(--text-muted))]">ответ водителя</div>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-[28px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-md)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="m-0 text-lg font-extrabold">Автомобиль</h2>
            <Badge tone="info">Одобрен</Badge>
          </div>
          <VehicleImage alt={trip.vehicle} className="rounded-[26px]" />
          <div className="mt-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-extrabold">{trip.vehicle}</div>
              <div className="text-sm font-bold text-[rgb(var(--text-muted))]">
                {trip.color} · {trip.capacity}
              </div>
            </div>
            <div className="rounded-full bg-[rgb(var(--canvas))] px-3 py-2 text-sm font-extrabold">
              {trip.plate}
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-[28px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-md)]">
          <h2 className="m-0 text-lg font-extrabold">Условия поездки</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-[22px] bg-[rgb(var(--primary))] p-3 text-[rgb(var(--primary-foreground))]">
              <div className="text-xs font-bold opacity-80">Цена за место</div>
              <div className="mt-1 text-lg font-black">{formatUzs(trip.priceMinor)}</div>
            </div>
            <div className="rounded-[22px] bg-[rgb(var(--canvas))] p-3">
              <Icon name="seat" className="h-5 w-5 text-[rgb(var(--primary))]" />
              <div className="mt-1 text-lg font-black">{trip.seats} left</div>
              <div className="text-xs font-bold text-[rgb(var(--text-muted))]">доступные места</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {trip.luggage ? (
              <Badge tone="accent">
                <span className="inline-flex items-center gap-1">
                  <Icon name="bag" className="h-3.5 w-3.5" />
                  Багаж
                </span>
              </Badge>
            ) : null}
            {trip.parcel ? (
              <Badge tone="info">Посылка принимается</Badge>
            ) : (
              <Badge>Без посылок</Badge>
            )}
            <Badge tone="success">Одобрен driver</Badge>
          </div>
          <p className="m-0 mt-3 rounded-[22px] bg-[rgb(var(--surface-tint))] p-3 text-sm font-medium text-[rgb(var(--text-muted))]">
            {trip.note}
          </p>
        </section>

        <section
          aria-label="Сводка заявки на поездку"
          className="mt-4 rounded-[28px] bg-[rgb(var(--surface)/0.96)] p-3 shadow-[var(--shadow-floating)]"
        >
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div>
              <div className="text-xs font-bold text-[rgb(var(--text-muted))]">Цена за место</div>
              <div className="text-lg font-black">{formatUzs(trip.priceMinor)}</div>
            </div>
            <div className="text-right text-xs font-semibold text-[rgb(var(--text-muted))]">
              Оплата согласуется
              <br />
              напрямую с водителем.
            </div>
          </div>
          <Link
            className="inline-flex min-h-[var(--control-md)] w-full items-center justify-center rounded-[var(--radius-md)] border border-[rgb(var(--primary))] bg-[rgb(var(--primary))] px-4 text-sm font-bold text-[rgb(var(--primary-foreground))] no-underline shadow-[var(--shadow-md)] transition hover:brightness-105"
            href={`/trips/${tripId}/book`}
          >
            Запросить место
          </Link>
        </section>
      </div>
    </main>
  );
}
