"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, formatUzs } from "@nodex/ui";
import { Card, ClientHeader, ClientShell, StatusPill } from "../client-ui";

type ParcelStatus = "create" | "searching" | "found" | "confirm" | "active";
type ParcelSize = "Маленькая" | "Средняя" | "Большая" | "Негабаритная";

const driver = { name: "Madina Yusupova", vehicle: "Chevrolet Tracker", route: "Nukus → Urgench", departure: "Сегодня, 18:30", reliability: "96%", rating: "4.8", priceMinor: 3200000 };
const sizeNotes: Record<ParcelSize, string> = { Маленькая: "Документы", Средняя: "Сумка", Большая: "Коробка", Негабаритная: "По согласованию" };

export default function ClientParcelsPage() {
  const [status, setStatus] = useState<ParcelStatus>("create");
  const [origin, setOrigin] = useState("Nukus, вокзал");
  const [destination, setDestination] = useState("Urgench, автостанция");
  const [sendAt, setSendAt] = useState("Сегодня, 18:00");
  const [size, setSize] = useState<ParcelSize>("Маленькая");
  const [description, setDescription] = useState("Папка с документами");
  const [receiver, setReceiver] = useState("Bekzod Ergashev");
  const [receiverContact, setReceiverContact] = useState("+998 90 123 45 67");
  const [parcelPhoto, setParcelPhoto] = useState("Документы в синей папке.jpg");
  const ready = origin.trim() && destination.trim() && receiver.trim() && receiverContact.trim() && description.trim();

  return (
    <ClientShell active="trips">
      <ClientHeader backHref="/" level="secondary" title="Посылка" subtitle="Отправка с водителем" />

      {status === "create" ? <Card className="mt-6" compact><h1 className="m-0 text-xl font-semibold">Отправить посылку</h1><p className="m-0 mt-1 text-sm text-[rgb(var(--text-muted))]">Укажите маршрут, получателя и что водитель должен забрать.</p><div className="mt-4 grid gap-3"><Field label="Откуда" value={origin} onChange={setOrigin} /><Field label="Куда" value={destination} onChange={setDestination} /><Field label="Когда" value={sendAt} onChange={setSendAt} /><div className="grid grid-cols-2 gap-2">{(Object.keys(sizeNotes) as ParcelSize[]).map((item) => <button key={item} className={["min-h-14 rounded-[16px] border-0 p-3 text-left text-sm font-semibold", size === item ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "bg-[rgb(var(--canvas))]"].join(" ")} type="button" onClick={() => setSize(item)}>{item}<span className="block text-xs font-normal opacity-70">{sizeNotes[item]}</span></button>)}</div><Field label="Получатель" value={receiver} onChange={setReceiver} /><Field label="Телефон получателя" value={receiverContact} onChange={setReceiverContact} /><Field label="Что внутри" value={description} onChange={setDescription} /><div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3"><div className="flex items-center justify-between gap-3"><div><div className="text-sm font-semibold">Фото посылки</div><div className="mt-1 text-xs text-[rgb(var(--text-muted))]">{parcelPhoto || "Фото не прикреплено"}</div></div><button className="rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-xs font-semibold text-[rgb(var(--primary))]" type="button" onClick={() => setParcelPhoto("Фото посылки.jpg")}>Прикрепить фото</button></div></div></div><Button className="mt-5 w-full" disabled={!ready} type="button" onClick={() => setStatus("searching")}>Найти водителя</Button></Card> : null}

      {status === "searching" ? <Card className="mt-6" compact><StatusPill tone="accent">Поиск</StatusPill><h1 className="m-0 mt-3 text-xl font-semibold">Ищем водителя</h1><p className="m-0 mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">Маршрут {origin} → {destination}. Покажем водителю описание и фото после выбора.</p><div className="mt-4 rounded-[18px] bg-[rgb(var(--canvas))] p-4 text-sm text-[rgb(var(--text-muted))]">Проверяем ближайшие поездки по маршруту...</div><Button className="mt-4 w-full" type="button" onClick={() => setStatus("found")}>Показать найденного водителя</Button></Card> : null}

      {status === "found" ? <Card className="mt-6" compact><StatusPill tone="success">Водитель найден</StatusPill><h1 className="m-0 mt-3 text-xl font-semibold">{driver.name}</h1><p className="m-0 mt-1 text-sm text-[rgb(var(--text-muted))]">{driver.vehicle} · {driver.route}</p><div className="mt-4 grid grid-cols-2 gap-2 text-sm"><Info label="Выезд" value={driver.departure} /><Info label="Надёжность" value={driver.reliability} /><Info label="Рейтинг" value={driver.rating} /><Info label="Цена" value={formatUzs(driver.priceMinor)} /></div><Button className="mt-4 w-full" type="button" onClick={() => setStatus("confirm")}>Выбрать водителя</Button></Card> : null}

      {status === "confirm" ? <Card className="mt-6" compact><h1 className="m-0 text-xl font-semibold">Передача водителю</h1><div className="mt-4 grid gap-2 text-sm"><Info label="Маршрут" value={`${origin} → ${destination}`} /><Info label="Получатель" value={receiver} /><Info label="Телефон" value={receiverContact} /><Info label="Фото" value={parcelPhoto || "Не прикреплено"} /><Info label="Описание" value={`${size} · ${description}`} /><Info label="Водитель" value={`${driver.name} · ${driver.vehicle}`} /></div><Button className="mt-4 w-full" type="button" onClick={() => setStatus("active")}>Подтвердить передачу</Button></Card> : null}

      {status === "active" ? <Card className="mt-6" compact><StatusPill tone="info">В пути</StatusPill><h1 className="m-0 mt-3 text-xl font-semibold">Посылка передана водителю</h1><p className="m-0 mt-2 text-sm leading-6 text-[rgb(var(--text-muted))]">{driver.name} везёт посылку по маршруту {origin} → {destination}. Получатель: {receiver}, {receiverContact}.</p><div className="mt-4 grid grid-cols-2 gap-2"><Link className="flex min-h-11 items-center justify-center rounded-[16px] bg-[rgb(var(--canvas))] px-3 text-sm font-semibold text-[rgb(var(--foreground))] no-underline" href="/messages/parcel-driver">Написать</Link><Link className="flex min-h-11 items-center justify-center rounded-[16px] bg-[rgb(var(--canvas))] px-3 text-sm font-semibold text-[rgb(var(--foreground))] no-underline" href="/parcels/phase8-parcel-ready">Открыть статус</Link></div></Card> : null}

      <section className="mt-6"><h2 className="m-0 text-lg font-semibold">История</h2><div className="mt-3 grid gap-2"><Link className="block rounded-[18px] bg-[rgb(var(--surface))] p-3 text-sm text-[rgb(var(--foreground))] no-underline shadow-[var(--shadow-sm)]" href="/parcels/phase8-parcel-ready">Конверт с документами · В пути</Link><Link className="block rounded-[18px] bg-[rgb(var(--surface))] p-3 text-sm text-[rgb(var(--foreground))] no-underline shadow-[var(--shadow-sm)]" href="/parcels/phase8-parcel-delivered">Пакет с одеждой · Доставлена</Link></div></section>
    </ClientShell>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="grid gap-1 text-sm"><span className="font-medium text-[rgb(var(--text-muted))]">{label}</span><input className="min-h-11 rounded-[16px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3" value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3"><span className="block text-xs text-[rgb(var(--text-muted))]">{label}</span><strong className="font-semibold">{value}</strong></div>; }