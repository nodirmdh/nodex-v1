"use client";

import { useMemo, useState } from "react";
import { formatUzs } from "@nodex/ui";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "../admin-shell";

type ParcelStatus = "Создана" | "Водитель назначен" | "Принята водителем" | "Забрана" | "В пути" | "Прибывает" | "Доставлена" | "Отменена";
type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const parcels = [
  { id: "PCL-1042", sender: "Gulnora Ergasheva", receiver: "Bekzod Ergashev", origin: "Nukus, вокзал", destination: "Urgench, автостанция", driver: "Madina Yusupova", status: "В пути" as ParcelStatus, size: "Маленькая", created: "Сегодня 09:12", priceMinor: 3200000, note: "Документы, передать по коду", support: "Нет обращений" },
  { id: "PCL-1043", sender: "Rustam Seitov", receiver: "Malika Seitova", origin: "Nukus", destination: "Khiva", driver: "Azizbek Karimov", status: "Водитель назначен" as ParcelStatus, size: "Средняя", created: "Сегодня 10:05", priceMinor: 3600000, note: "Хрупкое, маленькая коробка", support: "Контроль выдачи" },
  { id: "PCL-1044", sender: "Kamola Rakhimova", receiver: "Sardor Rakhimov", origin: "Urgench", destination: "Nukus", driver: "Не назначен", status: "Отменена" as ParcelStatus, size: "Большая", created: "Вчера 17:40", priceMinor: 0, note: "Клиент отменил до назначения", support: "Закрыто" },
];

function tone(status: ParcelStatus): Tone {
  if (status === "Доставлена") return "success";
  if (status === "Отменена") return "danger";
  if (status === "Создана" || status === "Водитель назначен") return "warning";
  return "info";
}

export default function AdminParcelsPage() {
  const [selectedId, setSelectedId] = useState(parcels[0]!.id);
  const [notice, setNotice] = useState("");
  const selected = useMemo(() => parcels.find((parcel) => parcel.id === selectedId) ?? parcels[0]!, [selectedId]);

  return (
    <main className="admin-main">
      <AdminPageHeader title="Посылки" subtitle="Demo visibility: отправитель, получатель, маршрут, водитель, статус и контекст поддержки." actions={<><button className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black" type="button" onClick={() => setNotice("Фильтр по активным посылкам применён в demo state.")}>Активные</button><button className="rounded-[10px] bg-[rgb(var(--primary))] px-3 py-2 text-sm font-black text-[rgb(var(--primary-foreground))]" type="button" onClick={() => setSelectedId("PCL-1043")}>Проверить выдачу</button></>} />
      <section className="mb-4 grid gap-3 md:grid-cols-4"><Metric label="Всего" value="31" /><Metric label="В пути" value="12" /><Metric label="Ожидают водителя" value="8" /><Metric label="Спорные" value="1" /></section>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <AdminPanel className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full border-collapse text-sm" aria-label="Admin parcel list"><thead><tr className="text-left text-[11px] font-black uppercase text-[rgb(var(--text-muted))]"><th className="border-b border-[rgb(var(--border))] px-4 py-3">Parcel ID</th><th className="border-b border-[rgb(var(--border))] px-4 py-3">Отправитель</th><th className="border-b border-[rgb(var(--border))] px-4 py-3">Получатель</th><th className="border-b border-[rgb(var(--border))] px-4 py-3">Маршрут</th><th className="border-b border-[rgb(var(--border))] px-4 py-3">Водитель</th><th className="border-b border-[rgb(var(--border))] px-4 py-3">Статус</th><th className="border-b border-[rgb(var(--border))] px-4 py-3">Размер</th><th className="border-b border-[rgb(var(--border))] px-4 py-3">Создана</th></tr></thead><tbody>{parcels.map((parcel) => <tr key={parcel.id} className={`cursor-pointer border-b border-[rgb(var(--border))] hover:bg-[rgb(var(--surface-muted))] ${selected.id === parcel.id ? "bg-[rgb(var(--info-soft))]" : ""}`} onClick={() => setSelectedId(parcel.id)}><td className="px-4 py-3 font-black">{parcel.id}</td><td className="px-4 py-3">{parcel.sender}</td><td className="px-4 py-3">{parcel.receiver}</td><td className="px-4 py-3">{parcel.origin} → {parcel.destination}</td><td className="px-4 py-3">{parcel.driver}</td><td className="px-4 py-3"><AdminStatusBadge tone={tone(parcel.status)}>{parcel.status}</AdminStatusBadge></td><td className="px-4 py-3">{parcel.size}</td><td className="px-4 py-3">{parcel.created}</td></tr>)}</tbody></table></div></AdminPanel>
        <AdminPanel className="p-4" label="Parcel detail"><div className="flex items-start justify-between gap-3"><div><h2 className="m-0 text-xl font-black">{selected.id}</h2><p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">{selected.origin} → {selected.destination}</p></div><AdminStatusBadge tone={tone(selected.status)}>{selected.status}</AdminStatusBadge></div><div className="mt-4 grid gap-2 text-sm"><Info label="Участники" value={`${selected.sender} → ${selected.receiver}`} /><Info label="Водитель" value={selected.driver} /><Info label="Размер и описание" value={`${selected.size} · ${selected.note}`} /><Info label="Demo price" value={formatUzs(selected.priceMinor)} /><Info label="Support context" value={selected.support} /></div><div className="mt-4 grid grid-cols-2 gap-2"><button className="rounded-[10px] border border-[rgb(var(--border))] px-3 py-2 text-sm font-black" type="button" onClick={() => setNotice("Открыт связанный рейс в demo state.")}>Открыть рейс</button><button className="rounded-[10px] border border-[rgb(var(--border))] px-3 py-2 text-sm font-black" type="button" onClick={() => setNotice("Контекст поддержки открыт.")}>Поддержка</button><button className="rounded-[10px] border border-[rgb(var(--warning))] px-3 py-2 text-sm font-black text-[rgb(var(--warning))]" type="button" onClick={() => setNotice("Создана заметка проверки выдачи.")}>Проверка</button><button className="rounded-[10px] border border-[rgb(var(--destructive))] px-3 py-2 text-sm font-black text-[rgb(var(--destructive))]" type="button" onClick={() => setNotice("Открыт demo review отмены.")}>Отмена</button></div>{notice ? <div className="mt-3 rounded-[12px] bg-[rgb(var(--info-soft))] p-3 text-sm font-black text-[rgb(var(--info))]">{notice}</div> : null}<div className="mt-4 grid gap-2 text-sm"><h3 className="m-0 text-sm font-black">История статуса</h3>{["Создана", "Водитель назначен", "Принята водителем", "Забрана", "В пути", "Доставлена"].map((label, index) => <div key={label} className="grid grid-cols-[24px_1fr] gap-2"><span className={`mt-1 h-3 w-3 rounded-full ${index <= 4 ? "bg-[rgb(var(--primary))]" : "bg-[rgb(var(--border-strong))]"}`} /><span>{label}</span></div>)}</div></AdminPanel>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <AdminPanel className="p-4"><div className="text-2xl font-black">{value}</div><div className="text-xs font-semibold text-[rgb(var(--text-muted))]">{label}</div></AdminPanel>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-[10px] bg-[rgb(var(--surface-muted))] p-3"><span className="block text-xs text-[rgb(var(--text-muted))]">{label}</span><strong>{value}</strong></div>; }