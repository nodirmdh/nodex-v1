"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Badge, Button, VehicleImage, formatUzs } from "@nodex/ui";
import {
  baggageOptions,
  bookingPreferenceOptions,
  buildBookingCorePayload,
  scheduleOptions,
  type BookingBaggageChoice,
  type BookingPickupLocation,
  type BookingPreferenceType,
  type BookingScheduleOption,
} from "./booking-core";
import { CabinSelector } from "./cabin-selector";
import {
  type BookingType,
  cabinSeats,
  selectableSeatKeys,
  seatLabelForKey,
  sevenSeatPreview,
  tripCabin,
} from "./cabin-model";

type IconName = "back" | "car" | "clock" | "map" | "shield" | "sliders" | "users";
type SheetName = "preferences" | "baggage" | "schedule" | "pickup" | null;

const iconPaths: Record<IconName, ReactNode> = {
  back: <path d="m15 6-6 6 6 6" />,
  car: (
    <path d="M5 14h14l-1.8-4.2A2 2 0 0 0 15.4 8H8.6a2 2 0 0 0-1.8 1.2L5 14Zm1 0v4m12-4v4M7.5 18h.1m8.8 0h.1" />
  ),
  clock: <path d="M12 6v6l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  map: <path d="M9 18 3 20V6l6-2 6 2 6-2v14l-6 2-6-2Zm0 0V4m6 16V6" />,
  shield: <path d="M12 3 5 6v5c0 4.2 2.8 7.6 7 10 4.2-2.4 7-5.8 7-10V6l-7-3Z" />,
  sliders: <path d="M4 7h10m4 0h2M4 17h2m4 0h10M8 5v4m8 6v4" />,
  users: (
    <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6.5-.5a2.5 2.5 0 1 0 0-5M3.5 19a5.5 5.5 0 0 1 11 0M14 15.5c2.5.3 4.2 1.5 5 3.5" />
  ),
};

const seatLabelRu: Record<string, string> = {
  Driver: "Водитель",
  "Front passenger": "Переднее пассажирское",
  "Rear left": "Заднее левое",
  "Rear middle": "Заднее среднее",
  "Rear right": "Заднее правое",
  "Third row left": "Третий ряд слева",
  "Third row middle": "Третий ряд по центру",
  "Third row right": "Третий ряд справа",
};

function displaySeatLabel(label: string) {
  return seatLabelRu[label] ?? label;
}

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

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function departureForSchedule(option: BookingScheduleOption, customValue: string) {
  if (option === "NOW") return null;
  if (option === "CUSTOM") return customValue ? new Date(customValue).toISOString() : null;

  const departure = new Date(tripCabin.departureAtUtc);
  const today = new Date();
  const target = option === "TODAY" ? today : addDays(today, 1);
  departure.setFullYear(target.getFullYear(), target.getMonth(), target.getDate());
  return departure.toISOString();
}

export default function BookingFlowPage() {
  const [bookingType, setBookingType] = useState<BookingType>("SEAT");
  const [selectedSeats, setSelectedSeats] = useState<string[]>(["FRONT_RIGHT"]);
  const [step, setStep] = useState<"hold" | "passengers" | "confirmed">("hold");
  const [passengerCount, setPassengerCount] = useState(1);
  const [previewSevenSeat, setPreviewSevenSeat] = useState(false);
  const [unavailableNotice, setUnavailableNotice] = useState("");
  const [activeSheet, setActiveSheet] = useState<SheetName>(null);
  const [preferenceTypes, setPreferenceTypes] = useState<BookingPreferenceType[]>(["NO_SMOKING"]);
  const [driverComment, setDriverComment] = useState("");
  const [baggageType, setBaggageType] = useState<BookingBaggageChoice>("NONE");
  const [baggageQuantity, setBaggageQuantity] = useState(1);
  const [scheduleOption, setScheduleOption] = useState<BookingScheduleOption>("TOMORROW");
  const [customDeparture, setCustomDeparture] = useState("2026-09-03T08:30");
  const [pickupLocation, setPickupLocation] = useState<BookingPickupLocation>({
    latitude: null,
    longitude: null,
    label: "Главный вход вокзала",
    comment: "",
  });
  const [pickupNotice, setPickupNotice] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPreviewSevenSeat(params.get("layout") === "suv7");
    if (params.get("state") === "empty") setSelectedSeats([]);
  }, []);

  const visibleSeats = previewSevenSeat ? sevenSeatPreview : cabinSeats;
  const availableSeatKeys = useMemo(() => selectableSeatKeys(visibleSeats), [visibleSeats]);
  const effectiveSeats = bookingType === "WHOLE_CAR" ? availableSeatKeys : selectedSeats;
  const requiredSeats = bookingType === "MULTI_SEAT" ? passengerCount : 1;
  const requestReady =
    bookingType === "WHOLE_CAR"
      ? availableSeatKeys.length > 0
      : selectedSeats.length === requiredSeats && selectedSeats.length > 0;
  const totalMinor =
    bookingType === "WHOLE_CAR"
      ? tripCabin.wholeCarPriceMinor
      : tripCabin.priceMinor * Math.max(1, effectiveSeats.length);
  const selectedSummary =
    bookingType === "WHOLE_CAR"
      ? "Вся машина"
      : effectiveSeats
          .map((seatKey) => displaySeatLabel(seatLabelForKey(visibleSeats, seatKey)))
          .join(", ") || "Место не выбрано";
  const primaryAction =
    bookingType === "WHOLE_CAR"
      ? "Запросить всю машину"
      : requiredSeats > 1
        ? `Запросить ${requiredSeats} места`
        : "Запросить это место";
  const requestedDepartureAtUtc = departureForSchedule(scheduleOption, customDeparture);
  const baggageSummary =
    baggageOptions.find((item) => item.type === baggageType)?.label ?? "Без багажа";
  const scheduleSummary =
    scheduleOptions.find((item) => item.option === scheduleOption)?.label ?? "Завтра";
  const preferencesSummary =
    preferenceTypes.length > 0
      ? `${preferenceTypes.length} выбрано${driverComment.trim() ? " + комментарий" : ""}`
      : driverComment.trim()
        ? "Комментарий"
        : "Нет пожеланий";
  const bookingCorePayload = buildBookingCorePayload({
    tripId: tripCabin.tripId,
    bookingType,
    passengerCount: bookingType === "WHOLE_CAR" ? availableSeatKeys.length : requiredSeats,
    selectedSeats,
    availableSeatKeys,
    baggageType,
    baggageQuantity,
    preferenceTypes,
    driverComment,
    pickupLocation,
    scheduleOption,
    requestedDepartureAtUtc,
  });

  const passengerFields = useMemo(
    () =>
      effectiveSeats.map((seatKey, index) => ({
        seatKey,
        label: displaySeatLabel(seatLabelForKey(visibleSeats, seatKey)),
        name: index === 0 ? "Основной пассажир" : `Пассажир ${index + 1}`,
      })),
    [effectiveSeats, visibleSeats],
  );

  function toggleSeat(seatKey: string) {
    setUnavailableNotice("");
    if (!availableSeatKeys.includes(seatKey)) {
      setUnavailableNotice("Это место уже недоступно. Состояние салона сохранено.");
      return;
    }

    if (bookingType === "SEAT") {
      setSelectedSeats([seatKey]);
      return;
    }

    setSelectedSeats((current) => {
      if (current.includes(seatKey)) return current.filter((key) => key !== seatKey);
      if (current.length >= passengerCount) return [...current.slice(1), seatKey];
      return [...current, seatKey];
    });
  }

  function changeType(next: BookingType) {
    setUnavailableNotice("");
    setBookingType(next);
    if (next === "WHOLE_CAR") {
      setPassengerCount(availableSeatKeys.length);
      setSelectedSeats(availableSeatKeys);
      return;
    }
    if (next === "MULTI_SEAT") {
      setPassengerCount(2);
      setSelectedSeats(availableSeatKeys.slice(0, 2));
      return;
    }
    setPassengerCount(1);
    setSelectedSeats([availableSeatKeys[0] ?? "FRONT_RIGHT"]);
  }


  function applyStartPreset(kind: "rear3" | "start6") {
    setUnavailableNotice("");
    setBookingType("MULTI_SEAT");
    if (kind === "rear3") {
      setPreviewSevenSeat(false);
      setPassengerCount(3);
      setSelectedSeats(["ROW_1_LEFT", "ROW_1_CENTER", "ROW_1_RIGHT"]);
      return;
    }
    setPreviewSevenSeat(true);
    setPassengerCount(6);
    setSelectedSeats(["FRONT_RIGHT", "ROW_1_LEFT", "ROW_1_RIGHT", "ROW_2_LEFT", "ROW_2_CENTER", "ROW_2_RIGHT"]);
  }
  function requestSeatHold() {
    if (!requestReady) {
      setUnavailableNotice(
        bookingType === "MULTI_SEAT"
          ? `Выберите ${requiredSeats} доступных места перед отправкой заявки.`
          : "Выберите доступное место перед отправкой заявки.",
      );
      return;
    }
    setStep("passengers");
  }

  function togglePreference(type: BookingPreferenceType) {
    setPreferenceTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
    );
  }

  function useBrowserLocation() {
    setPickupNotice("");
    if (!navigator.geolocation) {
      setPickupNotice("Геолокация недоступна. Можно оставить ориентир текстом.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPickupLocation((current) => ({
          ...current,
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        }));
        setPickupNotice("Координаты добавлены к заявке.");
      },
      () => setPickupNotice("Разрешение не получено. Ориентир текстом тоже подходит."),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  return (
    <main className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      <div className="mx-auto min-h-screen max-w-[430px] bg-[linear-gradient(180deg,rgb(var(--surface-tint))_0%,rgb(var(--background))_28%,rgb(var(--canvas))_100%)] px-4 pb-6 pt-4">
        <header className="flex items-center gap-3">
          <Link
            aria-label="Назад к деталям поездки"
            className="grid h-11 w-11 place-items-center rounded-full bg-[rgb(var(--surface)/0.92)] text-[rgb(var(--foreground))] shadow-[var(--shadow-xs)]"
            href="/trips/phase5-nukus-urgench-morning"
          >
            <Icon name="back" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="m-0 text-xl font-semibold">Выберите места</h1>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              {tripCabin.model} · {tripCabin.departure}
            </p>
          </div>
          <VehicleImage alt={tripCabin.model} className="h-12 w-16 rounded-[18px]" />
        </header>

        <section className="mt-5 rounded-[30px] bg-[rgb(var(--surface)/0.96)] p-4 shadow-[0_18px_46px_rgb(var(--foreground)/0.1)] backdrop-blur">
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--primary))]">
                <Icon name="car" className="h-4 w-4" />
                {tripCabin.color} · {tripCabin.capacity}
              </div>
              <div className="mt-1 text-xl font-semibold">{tripCabin.model}</div>
              <div className="text-sm font-semibold text-[rgb(var(--text-muted))]">
                {tripCabin.route}
              </div>
            </div>
            <div className="text-right">
              <Badge tone="info">{tripCabin.plate}</Badge>
              <div className="mt-2 flex items-center justify-end gap-1 text-xs font-semibold text-[rgb(var(--text-muted))]">
                <Icon name="shield" className="h-4 w-4 text-[rgb(var(--primary))]" />
                Проверено
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="Тип заявки">
            {(["SEAT", "MULTI_SEAT", "WHOLE_CAR"] as const).map((type) => (
              <button
                key={type}
                aria-pressed={bookingType === type}
                className={[
                  "min-h-11 rounded-full px-2 text-sm font-semibold transition",
                  bookingType === type
                    ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] shadow-[var(--shadow-md)]"
                    : "bg-[rgb(var(--canvas))] text-[rgb(var(--text-muted))]",
                ].join(" ")}
                type="button"
                onClick={() => changeType(type)}
              >
                {type === "SEAT" ? "1 место" : type === "MULTI_SEAT" ? "Несколько" : "Вся машина"}
              </button>
            ))}
          </div>
          {bookingType === "MULTI_SEAT" ? (
            <div className="mt-3 flex items-center justify-between rounded-[20px] bg-[rgb(var(--canvas))] p-2">
              <span className="pl-2 text-sm font-semibold">Пассажиров</span>
              <div className="flex items-center gap-2">
                <button
                  className="grid h-9 w-9 place-items-center rounded-full bg-[rgb(var(--surface))] text-lg font-semibold"
                  type="button"
                  onClick={() => setPassengerCount((value) => Math.max(2, value - 1))}
                >
                  -
                </button>
                <span className="w-6 text-center text-sm font-semibold">{passengerCount}</span>
                <button
                  className="grid h-9 w-9 place-items-center rounded-full bg-[rgb(var(--primary))] text-lg font-semibold text-[rgb(var(--primary-foreground))]"
                  type="button"
                  onClick={() =>
                    setPassengerCount((value) => Math.min(availableSeatKeys.length, value + 1))
                  }
                >
                  +
                </button>
              </div>
            </div>
          ) : null}
          <div className="mt-4">
            <div className="mb-2 text-sm font-medium text-[rgb(var(--text-muted))]">Быстрый выбор</div>
            <div className="grid grid-cols-2 gap-2">
              <button className="min-h-10 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm font-semibold text-[rgb(var(--primary))]" type="button" onClick={() => applyStartPreset("rear3")}>3 сзади</button>
              <button className="min-h-10 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm font-semibold text-[rgb(var(--primary))]" type="button" onClick={() => applyStartPreset("start6")}>6 мест</button>
            </div>
          </div>
          {bookingType === "WHOLE_CAR" ? (
            <p className="m-0 mt-3 rounded-[20px] bg-[rgb(var(--primary-soft))] p-3 text-sm font-semibold text-[rgb(var(--primary))]">
              Вы бронируете все доступные места. Попутчиков не будет.
            </p>
          ) : null}
        </section>

        <div className="mt-4">
          <CabinSelector
            bookingType={bookingType}
            onSeatToggle={toggleSeat}
            passengerCount={requiredSeats}
            priceMinor={tripCabin.priceMinor}
            seats={visibleSeats}
            selectedSeats={selectedSeats}
            tariff={tripCabin.tariff}
            template={previewSevenSeat ? "SUV_7" : tripCabin.template}
            vehicleModel={tripCabin.model}
            unavailableNotice={unavailableNotice}
          />
        </div>

        <section className="sticky bottom-[76px] mt-4 rounded-[22px] bg-[rgb(var(--surface)/0.98)] p-4 shadow-[var(--shadow-floating)] backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-lg font-semibold">Выбрано</h2>
              <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                {bookingType === "WHOLE_CAR"
                  ? `${availableSeatKeys.length} доступных пассажирских мест`
                  : `${effectiveSeats.length} из ${requiredSeats} выбрано`}
              </p>
            </div>
            <Badge tone={requestReady ? "success" : "warning"}>
              {requestReady ? "Готово" : "Выберите места"}
            </Badge>
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-3 rounded-[26px] bg-[linear-gradient(135deg,rgb(var(--canvas)),rgb(var(--surface-tint)))] p-3 shadow-[inset_0_0_0_1px_rgb(var(--surface)/0.8)]">
            <div>
              <div className="text-base font-semibold">{selectedSummary}</div>
              <div className="mt-1 flex items-center gap-1 text-xs font-bold text-[rgb(var(--text-muted))]">
                <Icon name="clock" className="h-4 w-4" />
                {scheduleSummary} · {tripCabin.departure}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-[rgb(var(--text-muted))]">
                {bookingType === "WHOLE_CAR" ? "Вся машина" : "Цена за место"}
              </div>
              <div className="text-xl font-semibold text-[rgb(var(--foreground))]">
                {formatUzs(totalMinor)}
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            {[
              ["preferences", "Пожелания", preferencesSummary, "sliders"],
              [
                "baggage",
                "Багаж",
                baggageType === "NONE" ? baggageSummary : `${baggageSummary} · ${baggageQuantity}`,
                "car",
              ],
              ["schedule", "Когда", scheduleSummary, "clock"],
              ["pickup", "Посадка", pickupLocation.label || "Добавить ориентир", "map"],
            ].map(([sheet, title, value, icon]) => (
              <button
                key={sheet}
                className="flex min-h-[58px] w-full items-center justify-between rounded-[16px] bg-[rgb(var(--canvas))] p-3 text-left shadow-[inset_0_0_0_1px_rgb(var(--border))]"
                type="button"
                onClick={() => setActiveSheet(sheet as SheetName)}
              >
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--primary))]">
                  <Icon name={icon as IconName} className="h-4 w-4" />
                  {title}
                </span>
                <span className="mt-1 block text-sm font-semibold text-[rgb(var(--foreground))]">
                  {value}
                </span>
              </button>
            ))}
          </div>

          {step === "hold" ? (
            <Button
              className="mt-4 w-full"
              disabled={!requestReady}
              type="button"
              onClick={requestSeatHold}
            >
              {primaryAction}
            </Button>
          ) : null}
        </section>

        {step !== "hold" ? (
          <section
            aria-label={step === "confirmed" ? "Подтверждение заявки" : "Данные пассажира"}
            className="sticky bottom-[76px] mt-4 rounded-[22px] bg-[rgb(var(--surface)/0.98)] p-4 shadow-[var(--shadow-floating)] backdrop-blur"
          >
            {step === "passengers" ? (
              <>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="m-0 text-lg font-semibold">Данные пассажира</h2>
                    <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                      Основной заказчик — текущий клиент. Другим пассажирам Telegram не нужен.
                    </p>
                  </div>
                  <Badge tone="accent">
                    <span className="inline-flex items-center gap-1">
                      <Icon name="users" className="h-4 w-4" />
                      {effectiveSeats.length}
                    </span>
                  </Badge>
                </div>

                <div className="grid gap-3">
                  {passengerFields.map((passenger) => (
                    <label key={passenger.seatKey} className="grid gap-1">
                      <span className="text-xs font-bold text-[rgb(var(--text-muted))]">
                        {passenger.name} · {passenger.label}
                      </span>
                      <input
                        className="min-h-11 rounded-[18px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm font-semibold"
                        defaultValue={passenger.name}
                      />
                    </label>
                  ))}
                </div>

                <div className="mt-3 rounded-[22px] bg-[rgb(var(--surface-tint))] p-3 text-sm font-semibold">
                  <div className="font-semibold">Данные заявки</div>
                  <div className="mt-1 text-[rgb(var(--text-muted))]">
                    {baggageType === "NONE"
                      ? baggageSummary
                      : `${baggageSummary}, ${baggageQuantity} шт.`}{" "}
                    · {preferencesSummary} · {pickupLocation.label || "без ориентира"}
                  </div>
                </div>
                <p className="m-0 mt-3 text-xs font-semibold text-[rgb(var(--text-muted))]">
                  Оплата согласуется напрямую с водителем. Payments сейчас не подключаем.
                </p>
                <Button className="mt-4 w-full" type="button" onClick={() => setStep("confirmed")}>
                  Отправить заявку
                </Button>
              </>
            ) : (
              <>
                <Badge tone="success">Заявка отправлена</Badge>
                <h2 className="m-0 mt-3 text-lg font-semibold">Заявка на место создана</h2>
                <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">
                  {selectedSummary} добавлено к заявке. Водитель подтвердит поездку и увидит ваши
                  пожелания.
                </p>
                <code className="mt-3 block overflow-hidden rounded-[18px] bg-[rgb(var(--canvas))] p-3 text-[10px] text-[rgb(var(--text-muted))]">
                  {JSON.stringify(bookingCorePayload.hold)}
                </code>
                <Link
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-[var(--radius-md)] bg-[rgb(var(--primary))] px-4 text-sm font-bold text-[rgb(var(--primary-foreground))] no-underline"
                  href="/bookings"
                >
                  Открыть мои поездки
                </Link>
              </>
            )}
          </section>
        ) : null}
      </div>

      {activeSheet ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[rgb(var(--foreground)/0.28)] px-3 pb-3"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-[430px] rounded-[30px] bg-[rgb(var(--surface))] p-4 shadow-[0_24px_70px_rgb(var(--foreground)/0.24)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="m-0 text-lg font-semibold">
                {activeSheet === "preferences"
                  ? "Пожелания к поездке"
                  : activeSheet === "baggage"
                    ? "Багаж"
                    : activeSheet === "schedule"
                      ? "Когда поехать"
                      : "Точка посадки"}
              </h2>
              <button
                className="grid h-9 w-9 place-items-center rounded-full bg-[rgb(var(--canvas))] text-lg font-semibold"
                type="button"
                onClick={() => setActiveSheet(null)}
              >
                ×
              </button>
            </div>

            {activeSheet === "preferences" ? (
              <div className="grid gap-2">
                <div className="grid grid-cols-2 gap-2">
                  {bookingPreferenceOptions.map((option) => (
                    <button
                      key={option.type}
                      aria-pressed={preferenceTypes.includes(option.type)}
                      className={[
                        "min-h-11 rounded-[18px] px-3 text-left text-sm font-semibold",
                        preferenceTypes.includes(option.type)
                          ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                          : "bg-[rgb(var(--canvas))] text-[rgb(var(--foreground))]",
                      ].join(" ")}
                      type="button"
                      onClick={() => togglePreference(option.type)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <textarea
                  className="min-h-24 rounded-[20px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] p-3 text-sm font-semibold"
                  placeholder="Комментарий водителю"
                  value={driverComment}
                  onChange={(event) => setDriverComment(event.target.value)}
                />
              </div>
            ) : null}

            {activeSheet === "baggage" ? (
              <div className="grid gap-2">
                {baggageOptions.map((option) => (
                  <button
                    key={option.type}
                    aria-pressed={baggageType === option.type}
                    className={[
                      "min-h-11 rounded-[18px] px-3 text-left text-sm font-semibold",
                      baggageType === option.type
                        ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                        : "bg-[rgb(var(--canvas))] text-[rgb(var(--foreground))]",
                    ].join(" ")}
                    type="button"
                    onClick={() => setBaggageType(option.type)}
                  >
                    {option.label}
                  </button>
                ))}
                {baggageType !== "NONE" ? (
                  <div className="mt-2 flex items-center justify-between rounded-[18px] bg-[rgb(var(--surface-tint))] p-2">
                    <span className="pl-2 text-sm font-semibold">Количество</span>
                    <input
                      className="h-10 w-20 rounded-[14px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-center font-semibold"
                      min={1}
                      max={20}
                      type="number"
                      value={baggageQuantity}
                      onChange={(event) => setBaggageQuantity(Number(event.target.value))}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}

            {activeSheet === "schedule" ? (
              <div className="grid gap-2">
                <div className="grid grid-cols-2 gap-2">
                  {scheduleOptions.map((option) => (
                    <button
                      key={option.option}
                      aria-pressed={scheduleOption === option.option}
                      className={[
                        "min-h-11 rounded-[18px] px-3 text-left text-sm font-semibold",
                        scheduleOption === option.option
                          ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                          : "bg-[rgb(var(--canvas))] text-[rgb(var(--foreground))]",
                      ].join(" ")}
                      type="button"
                      onClick={() => setScheduleOption(option.option)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {scheduleOption === "CUSTOM" ? (
                  <input
                    className="min-h-11 rounded-[18px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm font-semibold"
                    type="datetime-local"
                    value={customDeparture}
                    onChange={(event) => setCustomDeparture(event.target.value)}
                  />
                ) : null}
                <p className="m-0 text-xs font-semibold text-[rgb(var(--text-muted))]">
                  Используем время отправления выбранного рейса, без отдельной scheduler-системы.
                </p>
              </div>
            ) : null}

            {activeSheet === "pickup" ? (
              <div className="grid gap-2">
                <input
                  className="min-h-11 rounded-[18px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm font-semibold"
                  placeholder="Ориентир, например у Korzinka"
                  value={pickupLocation.label}
                  onChange={(event) =>
                    setPickupLocation((current) => ({ ...current, label: event.target.value }))
                  }
                />
                <textarea
                  className="min-h-20 rounded-[18px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] p-3 text-sm font-semibold"
                  placeholder="Комментарий по посадке"
                  value={pickupLocation.comment}
                  onChange={(event) =>
                    setPickupLocation((current) => ({ ...current, comment: event.target.value }))
                  }
                />
                <Button type="button" onClick={useBrowserLocation}>
                  Добавить мои координаты
                </Button>
                {pickupNotice ? (
                  <p className="m-0 text-xs font-bold text-[rgb(var(--text-muted))]">
                    {pickupNotice}
                  </p>
                ) : null}
              </div>
            ) : null}

            <Button className="mt-4 w-full" type="button" onClick={() => setActiveSheet(null)}>
              Готово
            </Button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
