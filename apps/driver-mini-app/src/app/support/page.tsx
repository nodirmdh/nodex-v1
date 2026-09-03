"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@nodex/ui";
import { DriverCard, DriverHeader, DriverPill, DriverShell } from "../driver-ui";

const categories = ["Поездка", "Пассажир", "Неявка", "Безопасность", "Автомобиль", "Подписка", "Посылка", "Другое"];
const initialMessages = [
  { from: "support", text: "Используйте заметки активной поездки и сохраните приватность пассажира.", time: "14:20" },
  { from: "driver", text: "Отправитель просит фото доставки посылки.", time: "14:22" },
];

export default function DriverSupportPage() {
  const [category, setCategory] = useState("Посылка");
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState("");
  const [messages, setMessages] = useState(initialMessages);

  function sendMessage() {
    const text = message.trim();
    if (!text && !attachment) return;
    setMessages((current) => [...current, { from: "driver", text: text || `Вложение: ${attachment}`, time: "сейчас" }]);
    setMessage("");
    setAttachment("");
  }

  return (
    <DriverShell active="messages">
      <DriverHeader title="Поддержка" subtitle="Чат по рабочим вопросам" status={<DriverPill tone="warning">1 открыто</DriverPill>} />

      <DriverCard className="mt-5" label="Открытое обращение"><div className="flex items-start justify-between gap-3"><div><h1 className="m-0 text-lg font-semibold">Вопрос по передаче посылки</h1><p className="m-0 mt-1 text-sm text-[rgb(var(--text-muted))]">Связано с активной поездкой и маршрутом Nukus → Urgench.</p></div><DriverPill tone="accent">{category}</DriverPill></div></DriverCard>

      <section className="mt-4 grid gap-2" aria-label="Чат поддержки">{messages.map((item, index) => <div key={`${item.time}-${index}`} className={["max-w-[86%] rounded-[18px] px-4 py-3 text-sm leading-6", item.from === "driver" ? "ml-auto bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "bg-[rgb(var(--surface))] shadow-[var(--shadow-sm)]"].join(" ")}><div>{item.text}</div><div className="mt-1 text-[11px] opacity-70">{item.time}</div></div>)}</section>

      <DriverCard className="mt-5" label="Категории"><h2 className="m-0 text-base font-semibold">Тема обращения</h2><div className="mt-3 flex flex-wrap gap-2">{categories.map((item) => <button key={item} className={["min-h-10 rounded-full border-0 px-3 text-sm font-semibold", category === item ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "bg-[rgb(var(--canvas))] text-[rgb(var(--foreground))]"].join(" ")} type="button" onClick={() => setCategory(item)}>{item}</button>)}</div></DriverCard>

      <section className="sticky bottom-[76px] mt-5 rounded-[22px] bg-[rgb(var(--surface)/0.98)] p-3 shadow-[var(--shadow-floating)] backdrop-blur" aria-label="Ответить поддержке">
        {attachment ? <div className="mb-2 flex items-center justify-between rounded-[14px] bg-[rgb(var(--canvas))] px-3 py-2 text-xs text-[rgb(var(--text-muted))]"><span>{attachment}</span><button className="border-0 bg-transparent text-[rgb(var(--primary))]" type="button" onClick={() => setAttachment("")}>Убрать</button></div> : null}
        <div className="grid grid-cols-[auto_1fr_auto] gap-2"><button className="h-11 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm font-semibold text-[rgb(var(--primary))]" type="button" onClick={() => setAttachment("Фото доставки.jpg")}>Файл</button><input className="h-11 min-w-0 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-4 text-sm" placeholder="Сообщение" value={message} onChange={(event) => setMessage(event.target.value)} /><Button type="button" onClick={sendMessage}>Отправить</Button></div>
        <div className="mt-2 grid grid-cols-2 gap-2"><Link className="flex min-h-10 items-center justify-center rounded-full bg-[rgb(var(--canvas))] px-3 text-xs font-semibold text-[rgb(var(--primary))] no-underline" href="/safety">Безопасность</Link><Link className="flex min-h-10 items-center justify-center rounded-full bg-[rgb(var(--canvas))] px-3 text-xs font-semibold text-[rgb(var(--primary))] no-underline" href="/trip-demo">Поездка</Link></div>
      </section>
    </DriverShell>
  );
}