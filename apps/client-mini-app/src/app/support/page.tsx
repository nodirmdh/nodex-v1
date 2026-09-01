"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@nodex/ui";
import { Card, ClientHeader, ClientShell, StatusPill } from "../client-ui";

const categories = [
  "Проблема с поездкой",
  "Проблема с водителем",
  "Водитель опаздывает",
  "Водитель не приехал",
  "Потерянная вещь",
  "Проблема с пассажиром",
  "Проблема с посылкой",
  "Безопасность",
  "Другое",
];

const initialTickets = [
  {
    id: "SUP-1042",
    title: "Координация посадки",
    category: "Проблема с поездкой",
    status: "В работе",
    trip: "Nukus → Urgench",
    messages: [
      "Клиент: водитель просит уточнить точку посадки.",
      "Поддержка: заметка добавлена к поездке.",
    ],
  },
  {
    id: "SUP-1038",
    title: "Багаж в поездке",
    category: "Другое",
    status: "Открыто",
    trip: "Nukus → Khiva",
    messages: ["Клиент: нужна ли доплата за среднюю сумку?"],
  },
];

type Ticket = (typeof initialTickets)[number];

export default function ClientSupportPage() {
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const [tickets, setTickets] = useState(initialTickets);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const selected = useMemo(() => tickets.find((ticket) => ticket.id === selectedId) ?? tickets[0], [selectedId, tickets]);

  function createTicket(category: string) {
    setActiveCategory(category);
    const existing = tickets.find((ticket) => ticket.category === category);
    if (existing) {
      setSelectedId(existing.id);
      return;
    }
    const next: Ticket = {
      id: `SUP-${1042 + tickets.length}`,
      title: category,
      category,
      status: "Открыто",
      trip: "Nukus → Urgench",
      messages: [`Клиент: нужна помощь. Категория: ${category}.`],
    };
    setTickets((current) => [next, ...current]);
    setSelectedId(next.id);
  }

  function sendMessage() {
    if (!message.trim() || !selected) return;
    setTickets((current) => current.map((ticket) => ticket.id === selected.id ? { ...ticket, messages: [...ticket.messages, `Клиент: ${message.trim()}`], status: "В работе" } : ticket));
    setMessage("");
  }

  return (
    <ClientShell active="profile">
      <ClientHeader backHref="/profile" level="secondary" title="Поддержка" subtitle="Обращения и темы помощи" />

      <Card className="mt-4 space-y-2.5" compact>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-black">Открытое обращение</h2>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">Координация посадки Nukus → Urgench.</p>
          </div>
          <StatusPill tone="info">В работе</StatusPill>
        </div>
        <Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline" href="/messages/support-ticket">
          Открыть чат поддержки
        </Link>
      </Card>

      <Card className="mt-3" compact>
        <h2 className="m-0 mb-3 text-lg font-black">С чем нужна помощь?</h2>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((category) => (
            <button key={category} className={["inline-flex min-h-11 items-center justify-center rounded-[18px] px-3 text-center text-sm font-black", activeCategory === category ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]"].join(" ")} type="button" onClick={() => createTicket(category)}>
              {category}
            </button>
          ))}
        </div>
      </Card>

      <Card className="mt-3" compact>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="m-0 text-lg font-black">Мои обращения</h2>
          <StatusPill tone="accent">{tickets.length}</StatusPill>
        </div>
        <div className="grid gap-2">
          {tickets.map((ticket) => (
            <button key={ticket.id} className="rounded-[18px] bg-[rgb(var(--canvas))] p-3 text-left" type="button" onClick={() => setSelectedId(ticket.id)}>
              <span className="flex items-center justify-between gap-2"><strong>{ticket.title}</strong><StatusPill tone={ticket.status === "В работе" ? "info" : "warning"}>{ticket.status}</StatusPill></span>
              <span className="mt-1 block text-xs font-semibold text-[rgb(var(--text-muted))]">{ticket.id} · {ticket.trip}</span>
            </button>
          ))}
        </div>
      </Card>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgb(var(--foreground)/0.28)] px-3 pb-3" role="dialog" aria-modal="true">
          <section className="w-full max-w-[430px] rounded-[30px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-floating)]">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-lg font-black">{selected.title}</h2>
                <p className="m-0 text-xs font-bold text-[rgb(var(--text-muted))]">{selected.id} · {selected.category}</p>
              </div>
              <button className="grid h-9 w-9 place-items-center rounded-full bg-[rgb(var(--canvas))] text-lg font-black" type="button" onClick={() => setSelectedId("")}>×</button>
            </div>
            <div className="max-h-52 space-y-2 overflow-auto rounded-[20px] bg-[rgb(var(--canvas))] p-3">
              {selected.messages.map((item) => <p key={item} className="m-0 rounded-[16px] bg-[rgb(var(--surface))] p-2 text-sm font-semibold">{item}</p>)}
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <input className="min-h-11 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm font-semibold" placeholder="Напишите сообщение" value={message} onChange={(event) => setMessage(event.target.value)} />
              <Button type="button" onClick={sendMessage}>Отправить</Button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Button type="button" variant="secondary" onClick={() => setAttachmentOpen(true)}>Прикрепить файл</Button>
              <Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--surface-tint))] px-4 text-sm font-black text-[rgb(var(--primary))] no-underline" href="/safety">Безопасность</Link>
            </div>
          </section>
        </div>
      ) : null}

      {attachmentOpen ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[rgb(var(--foreground)/0.32)] p-4" role="dialog" aria-modal="true">
          <section className="w-full max-w-[360px] rounded-[26px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-floating)]">
            <h2 className="m-0 text-lg font-black">Вложение добавлено</h2>
            <p className="m-0 mt-2 text-sm font-semibold text-[rgb(var(--text-muted))]">Demo file: boarding-point.jpg · 420 KB. Файл сохраняется только в текущем mock-состоянии.</p>
            <Button className="mt-4 w-full" type="button" onClick={() => setAttachmentOpen(false)}>Готово</Button>
          </section>
        </div>
      ) : null}
    </ClientShell>
  );
}