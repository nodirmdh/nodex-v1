"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@nodex/ui";
import { DriverCard, DriverHeader, DriverPill, DriverShell } from "../driver-ui";

type ParcelState = "new" | "accepted" | "picked" | "transit" | "delivered" | "declined";

const request = {
  route: "Nukus → Urgench",
  pickup: "Nukus, вокзал",
  destination: "Urgench, автостанция",
  size: "Маленькая",
  type: "Документы",
  description: "Папка с документами в синем пакете",
  sender: "Gulnora Ergasheva",
  receiver: "Bekzod Ergashev",
  receiverPhone: "+998 90 123 45 67",
  price: "32 000 UZS",
  note: "Передать только получателю по коду. Фото посылки прикреплено клиентом.",
};

const history = [
  ["Конверт с документами", "Доставлена", "success"],
  ["Мелкая электроника", "В пути", "info"],
  ["Пакет с одеждой", "Отклонена", "danger"],
] as const;

export default function DriverParcelsPage() {
  const [state, setState] = useState<ParcelState>("new");
  const [notice, setNotice] = useState("");
  const active = state !== "new" && state !== "declined";
  const statusLabel = state === "new" ? "Новая заявка" : state === "accepted" ? "Принята" : state === "picked" ? "Забрана" : state === "transit" ? "В пути" : state === "delivered" ? "Передана" : "Отклонена";

  function update(next: ParcelState, message: string) {
    setState(next);
    setNotice(message);
  }

  return (
    <DriverShell active="requests">
      <DriverHeader title="Посылки" subtitle="Передача по активному междугороднему маршруту" status={<DriverPill tone={state === "declined" ? "danger" : active ? "success" : "info"}>{statusLabel}</DriverPill>} />

      <DriverCard className="mt-5 space-y-4" label="Входящая заявка">
        <div className="flex items-start justify-between gap-3"><div><h1 className="m-0 text-xl font-semibold">Посылка по маршруту</h1><p className="m-0 mt-1 text-sm text-[rgb(var(--text-muted))]">{request.route} · сегодня 18:30</p></div><DriverPill tone="accent">{request.price}</DriverPill></div>
        <div className="grid grid-cols-2 gap-2 text-sm"><Info label="Забрать" value={request.pickup} /><Info label="Доставить" value={request.destination} /><Info label="Тип" value={request.type} /><Info label="Размер" value={request.size} /></div>
        <div className="rounded-[18px] bg-[rgb(var(--canvas))] p-3 text-sm"><strong>{request.description}</strong><p className="m-0 mt-1 text-[rgb(var(--text-muted))]">Отправитель: {request.sender}</p><p className="m-0 mt-1 text-[rgb(var(--text-muted))]">Получатель: {request.receiver} · {request.receiverPhone}</p><p className="m-0 mt-1 text-[rgb(var(--text-muted))]">{request.note}</p><div className="mt-3 h-20 rounded-[14px] bg-[linear-gradient(135deg,rgb(var(--surface-tint)),rgb(var(--surface)))]" aria-label="Предпросмотр фото посылки" /></div><Link className="flex min-h-11 items-center justify-center rounded-[16px] bg-[rgb(var(--canvas))] px-3 text-sm font-semibold text-[rgb(var(--primary))] no-underline" href="/messages/parcel-sender">Открыть чат по посылке</Link>
        {state === "new" ? <div className="grid grid-cols-2 gap-2"><Button type="button" onClick={() => update("accepted", "Посылка принята. Она добавлена в активную поездку.")}>Принять</Button><Button type="button" variant="secondary" onClick={() => update("declined", "Заявка отклонена в demo state. Клиент увидит поиск другого водителя.")}>Отклонить</Button></div> : null}
        {state === "declined" ? <Button type="button" variant="secondary" onClick={() => update("new", "Заявка снова доступна для проверки.")}>Вернуть заявку</Button> : null}
        {notice ? <div className="rounded-[16px] bg-[rgb(var(--surface-tint))] p-3 text-sm font-semibold text-[rgb(var(--primary))]">{notice}</div> : null}
      </DriverCard>

      {active ? <DriverCard className="mt-4 space-y-3" label="В активной поездке"><div className="flex items-start justify-between gap-3"><div><h2 className="m-0 text-lg font-semibold">Статус посылки</h2><p className="m-0 mt-1 text-sm text-[rgb(var(--text-muted))]">Не занимает пассажирское место, хранится отдельно.</p></div><DriverPill tone="info">Багажник</DriverPill></div><div className="grid grid-cols-3 gap-2"><Button type="button" variant={state === "picked" ? "primary" : "secondary"} onClick={() => update("picked", "Отмечено: посылка забрана у отправителя.")}>Забрал</Button><Button type="button" variant={state === "transit" ? "primary" : "secondary"} onClick={() => update("transit", "Статус обновлён: посылка в пути.")}>В пути</Button><Button type="button" variant={state === "delivered" ? "primary" : "secondary"} onClick={() => update("delivered", "Передача получателю подтверждена.")}>Передал</Button></div><div className="grid gap-2 text-sm">{[["Принята водителем", true], ["Забрана у отправителя", state === "picked" || state === "transit" || state === "delivered"], ["В пути", state === "transit" || state === "delivered"], ["Передана получателю", state === "delivered"]].map(([label, done]) => <div key={String(label)} className="grid grid-cols-[18px_1fr] items-center gap-2"><span className={["h-2.5 w-2.5 rounded-full", done ? "bg-[rgb(var(--primary))]" : "bg-[rgb(var(--border-strong))]"].join(" ")} /><span className={done ? "font-semibold" : "text-[rgb(var(--text-muted))]"}>{label}</span></div>)}</div><Link className="flex min-h-11 items-center justify-center rounded-[16px] bg-[rgb(var(--canvas))] px-3 text-sm font-semibold text-[rgb(var(--primary))] no-underline" href="/messages/parcel-sender">Открыть чат по посылке</Link></DriverCard> : null}

      <section className="mt-4 space-y-3" aria-label="История посылок водителя"><h2 className="m-0 text-lg font-semibold">История посылок</h2>{history.map(([title, status, tone]) => <DriverCard key={title}><div className="flex items-center justify-between gap-3"><div><strong>{title}</strong><p className="m-0 mt-1 text-sm text-[rgb(var(--text-muted))]">Nukus → Urgench</p></div><DriverPill tone={tone}>{status}</DriverPill></div></DriverCard>)}</section>
    </DriverShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[16px] bg-[rgb(var(--canvas))] p-3"><span className="block text-xs font-semibold text-[rgb(var(--text-muted))]">{label}</span><strong className="mt-1 block">{value}</strong></div>;
}
