"use client";

import { useState } from "react";
import { AppHeader, Badge, BottomNav, Button, Panel, Timeline, formatUzs } from "@nodex/ui";

type ParcelState = "new" | "accepted" | "picked" | "transit" | "delivered" | "declined";

const request = {
  pickup: "Nukus, вокзал",
  destination: "Urgench, автостанция",
  size: "Маленькая",
  description: "Папка с документами",
  sender: "Gulnora Ergasheva",
  receiver: "Bekzod Ergashev",
  priceMinor: 3200000,
  note: "Передать только получателю по коду. Телефон скрыт, связь через ENVO.",
};

const history = [
  ["Конверт с документами", "Доставлена", "success"],
  ["Мелкая электроника", "В пути", "info"],
  ["Пакет с одеждой", "Отменена", "danger"],
] as const;

export default function DriverParcelsPage() {
  const [state, setState] = useState<ParcelState>("new");
  const active = state !== "new" && state !== "declined";
  const statusLabel = state === "new" ? "Новая заявка" : state === "accepted" ? "Принята" : state === "picked" ? "Забрана" : state === "transit" ? "В пути" : state === "delivered" ? "Передана" : "Отклонена";

  return (
    <main className="nodex-app mobile-shell">
      <AppHeader title="Посылки" subtitle="Заявки по маршруту без смешивания с пассажирскими местами" />
      <div className="space-y-4 px-4 pb-24">
        <Panel className="space-y-3" aria-label="Заявка на посылку по маршруту">
          <div className="flex items-start justify-between gap-3"><div><h1 className="m-0 text-xl font-black">Есть посылка по маршруту</h1><p className="m-0 text-sm text-slate-500">Nukus → Urgench · сегодня 18:30</p></div><Badge tone={state === "declined" ? "danger" : active ? "success" : "info"}>{statusLabel}</Badge></div>
          <div className="grid grid-cols-2 gap-2 text-sm"><Info label="Забрать" value={request.pickup} /><Info label="Доставить" value={request.destination} /><Info label="Размер" value={request.size} /><Info label="Вознаграждение" value={formatUzs(request.priceMinor)} /></div>
          <div className="rounded-[18px] bg-[rgb(var(--surface-muted))] p-3 text-sm"><strong>{request.description}</strong><p className="m-0 mt-1 text-slate-500">Отправитель: {request.sender} · Получатель: {request.receiver}</p><p className="m-0 mt-1 text-slate-500">{request.note}</p></div>
          {state === "new" ? <div className="grid grid-cols-2 gap-2"><Button type="button" onClick={() => setState("accepted")}>Принять</Button><Button type="button" variant="secondary" onClick={() => setState("declined")}>Отклонить</Button></div> : null}
          {state === "declined" ? <Button type="button" variant="secondary" onClick={() => setState("new")}>Вернуть заявку в демо</Button> : null}
        </Panel>

        {active ? <Panel className="space-y-3" aria-label="Активная посылка"><div className="flex items-start justify-between gap-3"><div><h2 className="m-0 text-lg font-black">Активная посылка</h2><p className="m-0 text-sm text-slate-500">Посылка не занимает пассажирское место, хранится отдельно.</p></div><Badge tone="info">Багажник</Badge></div><div className="grid grid-cols-3 gap-2"><Button type="button" variant={state === "picked" ? "primary" : "secondary"} onClick={() => setState("picked")}>Забрал посылку</Button><Button type="button" variant={state === "transit" ? "primary" : "secondary"} onClick={() => setState("transit")}>В пути</Button><Button type="button" variant={state === "delivered" ? "primary" : "secondary"} onClick={() => setState("delivered")}>Передал</Button></div><Timeline items={[{ label: "Принята водителем", time: "готово", active: true }, { label: "Забрана у отправителя", time: state === "picked" || state === "transit" || state === "delivered" ? "готово" : "ожидает", active: state === "picked" || state === "transit" || state === "delivered" }, { label: "В пути", time: state === "transit" || state === "delivered" ? "сейчас" : "ожидает", active: state === "transit" || state === "delivered" }, { label: "Передана получателю", time: state === "delivered" ? "готово" : "ожидает", active: state === "delivered" }]} /></Panel> : null}

        <section className="space-y-3" aria-label="История посылок водителя"><h2 className="m-0 text-lg font-black">История посылок</h2>{history.map(([title, status, tone]) => <Panel key={title}><div className="flex items-center justify-between gap-3"><div><strong>{title}</strong><p className="m-0 text-sm text-slate-500">Nukus → Urgench</p></div><Badge tone={tone}>{status}</Badge></div></Panel>)}</section>
      </div>
      <BottomNav items={[{ label: "Поездки" }, { label: "Посылки", active: true }, { label: "Машины" }, { label: "Профиль" }]} />
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[16px] bg-[rgb(var(--surface-muted))] p-3"><span className="block text-xs text-slate-500">{label}</span><strong>{value}</strong></div>;
}