"use client";

import { useMemo, useState } from "react";
import { Button } from "@nodex/ui";
import { Avatar, Card, ClientHeader, ClientShell, StatusPill } from "../client-ui";

const initialMessages = [
  { from: "support", text: "Мы добавили вашу заметку к заявке.", time: "10:14" },
  { from: "client", text: "Водитель просит уточнить точку посадки.", time: "10:16" },
];
const tickets = [
  { id: "SUP-1042", title: "Координация посадки", meta: "Проблема с поездкой", status: "В работе" },
  { id: "SUP-1038", title: "Вопрос по посылке", meta: "Посылка", status: "Открыто" },
];

export default function ClientSupportPage() {
  const [selectedId, setSelectedId] = useState(tickets[0]!.id);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState("");
  const [sent, setSent] = useState<Array<{ from: string; text: string; time: string }>>([]);
  const selected = useMemo(() => tickets.find((ticket) => ticket.id === selectedId) ?? tickets[0]!, [selectedId]);
  const messages = [...initialMessages, ...sent];

  function send() {
    const text = draft.trim();
    if (!text && !attachment) return;
    setSent((current) => [...current, { from: "client", text: text || `Вложение: ${attachment}`, time: "сейчас" }]);
    setDraft("");
    setAttachment("");
  }

  return (
    <ClientShell active="messages">
      <ClientHeader backHref="/profile" level="secondary" title="Поддержка" subtitle="Чат с командой ENVO" />

      <section className="mt-5 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Обращения">
        {tickets.map((ticket) => <button key={ticket.id} className={["min-w-[190px] rounded-[18px] border-0 bg-[rgb(var(--surface))] p-3 text-left shadow-[var(--shadow-sm)]", selectedId === ticket.id ? "ring-2 ring-[rgb(var(--primary)/0.22)]" : ""].join(" ")} type="button" onClick={() => setSelectedId(ticket.id)}><span className="block text-sm font-semibold">{ticket.title}</span><span className="mt-1 block text-xs text-[rgb(var(--text-muted))]">{ticket.id} · {ticket.meta}</span><span className="mt-2 inline-flex rounded-full bg-[rgb(var(--surface-tint))] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--primary))]">{ticket.status}</span></button>)}
      </section>

      <Card className="mt-4" compact>
        <div className="flex items-center gap-3"><Avatar name="Поддержка ENVO" /><div className="min-w-0 flex-1"><h1 className="m-0 truncate text-lg font-semibold">{selected.title}</h1><p className="m-0 mt-1 text-sm text-[rgb(var(--text-muted))]">{selected.id} · обычно отвечает за пару минут</p></div><StatusPill tone="accent">{selected.status}</StatusPill></div>
      </Card>

      <section className="mt-4 grid gap-2" aria-label="Чат поддержки">
        {messages.map((message, index) => <div key={`${message.time}-${index}`} className={["max-w-[86%] rounded-[18px] px-4 py-3 text-sm leading-6", message.from === "client" ? "ml-auto bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "bg-[rgb(var(--surface))] text-[rgb(var(--foreground))] shadow-[var(--shadow-sm)]"].join(" ")}><div>{message.text}</div><div className="mt-1 text-[11px] opacity-70">{message.time}</div></div>)}
      </section>

      <section className="sticky bottom-[76px] mt-5 rounded-[22px] bg-[rgb(var(--surface)/0.98)] p-3 shadow-[var(--shadow-floating)] backdrop-blur" aria-label="Ответить поддержке">
        {attachment ? <div className="mb-2 flex items-center justify-between rounded-[14px] bg-[rgb(var(--canvas))] px-3 py-2 text-xs text-[rgb(var(--text-muted))]"><span>{attachment}</span><button className="border-0 bg-transparent text-[rgb(var(--primary))]" type="button" onClick={() => setAttachment("")}>Убрать</button></div> : null}
        <div className="grid grid-cols-[auto_1fr_auto] gap-2"><button aria-label="Прикрепить файл" className="h-11 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm font-semibold text-[rgb(var(--primary))]" type="button" onClick={() => setAttachment("Фото точки посадки.jpg")}>Файл</button><input className="h-11 min-w-0 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-4 text-sm" placeholder="Напишите сообщение" value={draft} onChange={(event) => setDraft(event.target.value)} /><Button type="button" onClick={send}>Отправить</Button></div>
      </section>
    </ClientShell>
  );
}