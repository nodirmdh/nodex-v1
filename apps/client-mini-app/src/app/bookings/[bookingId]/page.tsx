"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { formatUzs } from "@nodex/ui";
import { Avatar, Card, ClientHeader, ClientShell, Icon, StatusPill } from "../../client-ui";
import { CabinSelector } from "../../trips/[tripId]/book/cabin-selector";
import {
  type BookingType,
  cabinSeats,
  selectableSeatKeys,
  seatLabelForKey,
  tripCabin,
} from "../../trips/[tripId]/book/cabin-model";

type DelayState = "ON_TIME" | "SLIGHT_DELAY" | "DELAYED" | "CRITICAL_DELAY";
type ProtectionStage = "idle" | "searching" | "found" | "accepted" | "none";

const delayCopy = {
  ON_TIME: { label: "Водитель подъезжает", eta: "6 мин", tone: "success" as const },
  SLIGHT_DELAY: { label: "Небольшая задержка", eta: "8 мин", tone: "warning" as const },
  DELAYED: { label: "Водитель задерживается", eta: "12 мин", tone: "warning" as const },
  CRITICAL_DELAY: { label: "Критическая задержка", eta: "35 мин", tone: "danger" as const },
};

const reasons = ["изменились планы", "водитель задерживается", "нашёл другой транспорт", "ошибка при бронировании", "другое"];
const seatLabelRu: Record<string, string> = {
  "Front passenger": "Переднее пассажирское",
  "Rear left": "Заднее левое",
  "Rear middle": "Заднее среднее",
  "Rear right": "Заднее правое",
};

function displaySeatLabel(seatKey: string) {
  const label = seatLabelForKey(cabinSeats, seatKey);
  return seatLabelRu[label] ?? label;
}

export default function BookingDetailPage() {
  const params = useParams<{ bookingId?: string }>();
  const bookingId = params.bookingId ?? "phase6-booking-hold";
  const [delayState, setDelayState] = useState<DelayState>("ON_TIME");
  const [protection, setProtection] = useState<ProtectionStage>("idle");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState(reasons[0]!);
  const copy = useMemo(() => delayCopy[delayState], [delayState]);
  const confirmed = bookingId.includes("confirmed") || bookingId.includes("active");
  const problem = delayState === "CRITICAL_DELAY" || protection !== "idle";
  const availableSeatKeys = useMemo(() => selectableSeatKeys(cabinSeats), []);
  const bookingType: BookingType = bookingId.includes("whole") ? "WHOLE_CAR" : bookingId.includes("multi") ? "MULTI_SEAT" : "SEAT";
  const visualSeats = bookingType === "WHOLE_CAR" ? availableSeatKeys : bookingType === "MULTI_SEAT" ? ["ROW_1_LEFT", "ROW_1_CENTER", "ROW_1_RIGHT"] : ["FRONT_RIGHT"];
  const visualSummary = bookingType === "WHOLE_CAR" ? "Вся машина" : visualSeats.map(displaySeatLabel).join(", ");
  const visualCabinSeats = cabinSeats.map((seat) =>
    seat.status === "driver" || visualSeats.includes(seat.key) ? seat : { ...seat, status: "unavailable" as const },
  );

  return (
    <ClientShell active="trips">
      <ClientHeader backHref="/bookings" level="secondary" title="Поездка" subtitle="Nukus → Urgench" />

      <section className="mt-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3"><div><div className="text-3xl font-semibold">08:30</div><div className="mt-1 text-sm text-[rgb(var(--text-muted))]">Nukus</div></div><div className="text-center text-[rgb(var(--primary))]">→<br /><span className="text-xs text-[rgb(var(--text-muted))]">ETA 08:30</span></div><div className="text-right"><div className="text-3xl font-semibold">11:30</div><div className="mt-1 text-sm text-[rgb(var(--text-muted))]">Urgench</div></div></div>
      </section>

      <Card className="mt-6" compact>
        <div className="flex items-center gap-3"><Avatar name="Azizbek Karimov" /><div className="min-w-0 flex-1"><h1 className="m-0 truncate text-lg font-semibold">Azizbek Karimov</h1><p className="m-0 mt-1 text-sm text-[rgb(var(--text-muted))]">Chevrolet Cobalt · 95 A 214 QA</p></div><StatusPill tone={copy.tone}>{copy.eta}</StatusPill></div>
        <div className="mt-4 rounded-[18px] bg-[rgb(var(--canvas))] p-3"><p className="m-0 text-sm text-[rgb(var(--text-muted))]">Текущий статус</p><h2 className="m-0 mt-1 text-xl font-semibold">{copy.label}</h2></div>
        <div className="mt-3 grid grid-cols-2 gap-2"><Link className="flex min-h-11 items-center justify-center rounded-[16px] bg-[rgb(var(--primary))] px-3 text-sm font-semibold text-[rgb(var(--primary-foreground))] no-underline" href="/messages/driver-azizbek">Написать</Link><Link className="flex min-h-11 items-center justify-center rounded-[16px] bg-[rgb(var(--canvas))] px-3 text-sm font-semibold text-[rgb(var(--foreground))] no-underline" href="/safety?tripId=phase6-booking-confirmed">Безопасность</Link></div>
      </Card>

      <Card className="mt-4" compact>
        <div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="m-0 text-lg font-semibold">Ваше место</h2><p className="m-0 mt-1 text-sm text-[rgb(var(--text-muted))]">{visualSummary}</p></div><StatusPill tone={confirmed ? "success" : "info"}>{confirmed ? "Забронировано" : "Ожидает водителя"}</StatusPill></div>
        <CabinSelector bookingType={bookingType} onSeatToggle={() => {}} passengerCount={visualSeats.length} priceMinor={tripCabin.priceMinor} seats={visualCabinSeats} selectedSeats={visualSeats} tariff={tripCabin.tariff} template={tripCabin.template} vehicleModel={tripCabin.model} />
      </Card>

      {!problem ? <button className="mt-4 flex min-h-12 w-full items-center justify-between rounded-[18px] border-0 bg-[rgb(var(--surface))] px-4 text-left shadow-[var(--shadow-sm)]" type="button" onClick={() => setDelayState("CRITICAL_DELAY")}><span><span className="block text-sm font-semibold">ENVO Protection</span><span className="block text-xs text-[rgb(var(--text-muted))]">Поездка защищена</span></span><span className="text-[rgb(var(--primary))]">Подробнее</span></button> : null}

      {problem ? <Card className="mt-4" compact><StatusPill tone="danger">Проблема</StatusPill><h2 className="m-0 mt-3 text-xl font-semibold">Водитель отменил поездку</h2><p className="m-0 mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Хотите, чтобы ENVO помог найти другого водителя рядом с тем же маршрутом и сохранением цены?</p>{protection === "idle" ? <div className="mt-4 grid grid-cols-2 gap-2"><button className="min-h-11 rounded-[16px] border-0 bg-[rgb(var(--primary))] px-4 text-sm font-semibold text-[rgb(var(--primary-foreground))]" type="button" onClick={() => setProtection("searching")}>Найти замену</button><button className="min-h-11 rounded-[16px] border-0 bg-[rgb(var(--canvas))] px-4 text-sm font-semibold text-[rgb(var(--foreground))]" type="button" onClick={() => setProtection("none")}>Не сейчас</button></div> : null}{protection === "searching" ? <div className="mt-4 grid gap-2"><div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3 text-sm text-[rgb(var(--text-muted))]">Ищем водителя... обычно это занимает пару минут.</div><div className="grid grid-cols-2 gap-2"><button className="min-h-10 rounded-[16px] border-0 bg-[rgb(var(--primary))] text-sm font-semibold text-[rgb(var(--primary-foreground))]" type="button" onClick={() => setProtection("found")}>Замена найдена</button><button className="min-h-10 rounded-[16px] border-0 bg-[rgb(var(--canvas))] text-sm font-semibold" type="button" onClick={() => setProtection("none")}>Не нашли</button></div></div> : null}{protection === "found" || protection === "accepted" ? <div className="mt-4 rounded-[18px] bg-[rgb(var(--canvas))] p-3"><div className="flex items-center gap-3"><Avatar name="Madina Yusupova" /><div className="min-w-0 flex-1"><strong className="block truncate font-semibold">Madina Yusupova</strong><span className="block text-xs text-[rgb(var(--text-muted))]">Chevrolet Tracker · ETA 08:45</span></div></div><div className="mt-3 flex items-center justify-between text-sm"><span>Цена сохранена</span><strong>{formatUzs(8500000)}</strong></div><button className="mt-3 min-h-10 w-full rounded-[16px] border-0 bg-[rgb(var(--primary))] text-sm font-semibold text-[rgb(var(--primary-foreground))]" type="button" onClick={() => setProtection("accepted")}>{protection === "accepted" ? "Замена принята вами" : "Принять замену"}</button></div> : null}{protection === "none" ? <div className="mt-4 rounded-[16px] bg-[rgb(var(--warning-soft))] p-3 text-sm font-medium text-[rgb(var(--warning))]">Пока нет подходящей замены. Можно продолжить поиск после вашего решения или написать в поддержку.</div> : null}</Card> : null}

      <Card className="mt-4" compact><h2 className="m-0 text-lg font-semibold">Демо состояния</h2><div className="mt-3 grid grid-cols-2 gap-2">{Object.entries(delayCopy).map(([key, value]) => <button key={key} className="min-h-10 rounded-[16px] border-0 bg-[rgb(var(--canvas))] px-2 text-sm font-medium" type="button" onClick={() => setDelayState(key as DelayState)}>{value.label}</button>)}</div><button className="mt-3 min-h-10 w-full rounded-[16px] border-0 bg-[rgb(var(--canvas))] text-sm font-medium" type="button" onClick={() => setCancelOpen(true)}>Отменить заявку</button></Card>

      {cancelOpen ? <CancelSheet reason={cancelReason} onReason={setCancelReason} onClose={() => setCancelOpen(false)} /> : null}
    </ClientShell>
  );
}

function CancelSheet({ reason, onReason, onClose }: { reason: string; onReason: (value: string) => void; onClose: () => void }) { return <div className="fixed inset-0 z-50 grid place-items-end bg-[rgb(var(--foreground)/0.28)] p-3" role="dialog" aria-modal="true"><section className="w-full max-w-[430px] rounded-t-[28px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-floating)]"><div className="flex items-center justify-between gap-3"><h2 className="m-0 text-lg font-semibold">Причина отмены</h2><button className="h-9 w-9 rounded-full border-0 bg-[rgb(var(--canvas))]" type="button" onClick={onClose}>×</button></div><div className="mt-3 grid gap-2">{reasons.map((item) => <button key={item} className={`min-h-10 rounded-[16px] border-0 px-3 text-left text-sm font-medium ${reason === item ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "bg-[rgb(var(--canvas))]"}`} type="button" onClick={() => onReason(item)}>{item}</button>)}</div><button className="mt-3 min-h-11 w-full rounded-[16px] border-0 bg-[rgb(var(--primary))] px-4 text-sm font-semibold text-[rgb(var(--primary-foreground))]" type="button" onClick={onClose}>Подтвердить</button></section></div>; }
