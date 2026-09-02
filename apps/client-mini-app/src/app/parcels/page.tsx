"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppHeader, Badge, BottomNav, Button, Panel, Timeline, formatUzs } from "@nodex/ui";

type ParcelStatus = "draft" | "searching" | "found" | "confirmed";
type ParcelSize = "Маленькая" | "Средняя" | "Большая" | "Негабаритная";

const sizeNotes: Record<ParcelSize, string> = {
  Маленькая: "Документы, коробка до размера книги",
  Средняя: "Небольшая сумка или обувная коробка",
  Большая: "Пакет или коробка для багажника",
  Негабаритная: "Только если водитель подтвердит место",
};

const driver = {
  name: "Madina Yusupova",
  vehicle: "Chevrolet Tracker",
  route: "Nukus → Urgench",
  departure: "Сегодня, 18:30",
  reliability: "Надёжность 96%",
  rating: "4.8",
  capacity: "место для средней посылки",
  priceMinor: 3200000,
};

const history = [
  { id: "phase8-parcel-ready", title: "Конверт с документами", route: "Nukus → Urgench", status: "В пути", tone: "info" as const },
  { id: "phase8-parcel-delivered", title: "Пакет с одеждой", route: "Urgench → Nukus", status: "Доставлена", tone: "success" as const },
  { id: "phase8-parcel-cancelled", title: "Коробка с аксессуарами", route: "Nukus → Khiva", status: "Отменена", tone: "danger" as const },
];

export default function ClientParcelsPage() {
  const [status, setStatus] = useState<ParcelStatus>("draft");
  const [origin, setOrigin] = useState("Nukus, вокзал");
  const [destination, setDestination] = useState("Urgench, автостанция");
  const [sendAt, setSendAt] = useState("Сегодня, 18:00");
  const [size, setSize] = useState<ParcelSize>("Маленькая");
  const [kind, setKind] = useState("Документы");
  const [description, setDescription] = useState("Папка с документами");
  const [receiver, setReceiver] = useState("Bekzod Ergashev");
  const [receiverContact, setReceiverContact] = useState("+998 90 123 45 67");
  const [parcelPhoto, setParcelPhoto] = useState("Документы в синей папке.jpg");
  const [comment, setComment] = useState("Передать только получателю по коду.");

  const ready = origin.trim() && destination.trim() && receiver.trim() && description.trim();
  const timeline = useMemo(() => {
    const found = status === "found" || status === "confirmed";
    return [
      { label: "Ищем водителя по маршруту", time: "сейчас", active: status !== "draft" },
      { label: "Водитель найден", time: found ? "1 мин" : "ожидает", active: found },
      { label: "Подтверждение отправки", time: status === "confirmed" ? "готово" : "следующий шаг", active: status === "confirmed" },
    ];
  }, [status]);

  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="Отправить посылку" subtitle="Отдельный demo-flow без пассажирского бронирования" />
      <div className="space-y-4 px-4 pb-24">
        <Panel className="space-y-3" aria-label="Создание посылки">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="m-0 text-lg font-black">Новая посылка</h1>
              <p className="m-0 text-sm text-slate-500">Заполните маршрут, получателя и краткое описание.</p>
            </div>
            <Badge tone="info">Demo</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Field label="Откуда" value={origin} onChange={setOrigin} />
            <Field label="Куда" value={destination} onChange={setDestination} />
          </div>
          <Field label="Когда отправить" value={sendAt} onChange={setSendAt} />
          <div>
            <div className="mb-2 text-sm font-black">Размер</div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(sizeNotes) as ParcelSize[]).map((item) => (
                <button key={item} className={`min-h-16 rounded-[18px] border-0 p-3 text-left text-sm font-black ${size === item ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "bg-[rgb(var(--surface-muted))] text-[rgb(var(--foreground))]"}`} type="button" onClick={() => setSize(item)}>
                  {item}<span className="mt-1 block text-[11px] font-semibold opacity-75">{sizeNotes[item]}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm font-black">Что внутри</div>
            <div className="flex flex-wrap gap-2">
              {["Хрупкое", "Документы", "Продукты", "Другое"].map((item) => (
                <button key={item} className={`min-h-10 rounded-full border-0 px-4 text-sm font-black ${kind === item ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "bg-[rgb(var(--surface-muted))]"}`} type="button" onClick={() => setKind(item)}>{item}</button>
              ))}
            </div>
          </div>
          <Field label="Описание" value={description} onChange={setDescription} />
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Field label="Получатель" value={receiver} onChange={setReceiver} />
            <Field label="Номер получателя" value={receiverContact} onChange={setReceiverContact} />
          </div>          <div className="rounded-[18px] bg-[rgb(var(--surface-muted))] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-black">Фото посылки для водителя</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">{parcelPhoto || "Фото ещё не прикреплено"}</div>
              </div>
              <button className="min-h-10 rounded-full border border-[rgb(var(--border))] bg-white px-3 text-xs font-black text-[rgb(var(--primary))]" type="button" onClick={() => setParcelPhoto("Документы в синей папке.jpg")}>Прикрепить фото</button>
            </div>
          </div>
          <label className="grid gap-1 text-sm"><span className="font-medium">Комментарий</span><textarea className="min-h-20 rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-white px-3 py-2" value={comment} onChange={(event) => setComment(event.target.value)} /></label>
          <div className="rounded-[18px] bg-[rgb(var(--warning-soft))] p-3 text-xs font-semibold text-[rgb(var(--warning))]">Не отправляйте запрещённые, опасные или неизвестные предметы. В demo-flow водитель видит только безопасное описание.</div>
          <Button disabled={!ready} type="button" onClick={() => setStatus("searching")}>Искать водителя</Button>
        </Panel>

        {status !== "draft" ? <Panel className="space-y-3" aria-label="Поиск водителя для посылки"><h2 className="m-0 text-lg font-black">Ищем водителя по маршруту</h2><Timeline items={timeline} />{status === "searching" ? <Button type="button" onClick={() => setStatus("found")}>Показать найденного водителя</Button> : null}{status === "found" || status === "confirmed" ? <div className="rounded-[22px] bg-[rgb(var(--surface-muted))] p-3"><div className="flex items-start justify-between gap-3"><div><h3 className="m-0 text-base font-black">{driver.name}</h3><p className="m-0 text-sm text-slate-500">{driver.vehicle} · {driver.route}</p></div><Badge tone="success">{driver.rating}</Badge></div><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><Info label="Выезд" value={driver.departure} /><Info label="Надёжность" value={driver.reliability} /><Info label="Место" value={driver.capacity} /><Info label="Demo price" value={formatUzs(driver.priceMinor)} /></div><div className="mt-3 grid grid-cols-2 gap-2"><Button type="button" onClick={() => setStatus("confirmed")}>Выбрать водителя</Button><Link className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] bg-[rgb(var(--surface))] px-3 text-sm font-bold text-[rgb(var(--primary))] no-underline" href="/trips/phase5-nukus-urgench-morning">Посмотреть поездку</Link></div></div> : null}</Panel> : null}

        {status === "confirmed" ? <Panel className="space-y-3" aria-label="Подтверждение посылки"><Badge tone="success">Водитель выбран</Badge><h2 className="m-0 text-lg font-black">Подтверждение отправки</h2><div className="grid gap-2 text-sm"><Info label="Маршрут" value={`${origin} → ${destination}`} /><Info label="Отправитель" value="Пользователь Nodex" /><Info label="Получатель" value={receiver} />
<Info label="Номер получателя" value={receiverContact} />
<Info label="Фото для водителя" value={parcelPhoto || "Не прикреплено"} /><Info label="Размер" value={`${size} · ${kind}`} /><Info label="Описание" value={description} /><Info label="Водитель" value={`${driver.name} · ${driver.vehicle}`} /><Info label="Время" value={driver.departure} /><Info label="Demo price" value={formatUzs(driver.priceMinor)} /></div><Link className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-md)] bg-[rgb(var(--primary))] px-4 text-sm font-bold text-[rgb(var(--primary-foreground))] no-underline" href="/parcels/phase8-parcel-ready?status=assigned">Подтвердить отправку</Link></Panel> : null}

        <section aria-label="История посылок" className="space-y-3"><h2 className="m-0 text-lg font-black">Мои посылки</h2>{history.map((parcel) => <Link key={parcel.id} className="block rounded-[var(--radius-lg)] bg-[rgb(var(--surface))] p-4 text-[rgb(var(--foreground))] no-underline shadow-[var(--shadow-sm)]" href={`/parcels/${parcel.id}`}><div className="flex items-start justify-between gap-3"><div><strong>{parcel.title}</strong><p className="m-0 mt-1 text-sm text-slate-500">{parcel.route}</p></div><Badge tone={parcel.tone}>{parcel.status}</Badge></div></Link>)}</section>
      </div>
      <BottomNav items={[{ label: "Главная" }, { label: "Поиск" }, { label: "Посылки", active: true }, { label: "Профиль" }]} />
    </main>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-sm"><span className="font-medium">{label}</span><input className="min-h-11 rounded-[var(--radius-md)] border border-[rgb(var(--border))] bg-white px-3" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[16px] bg-[rgb(var(--surface))] p-3"><span className="block text-xs font-semibold text-slate-500">{label}</span><strong>{value}</strong></div>;
}
