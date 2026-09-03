"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, ClientHeader, ClientShell, Icon, StatusPill } from "../client-ui";

const topics = [
  "Проблема с поездкой",
  "Водитель опаздывает",
  "Водитель не приехал",
  "Проблема с посылкой",
  "Безопасность",
  "Другое",
];

const tickets = [
  { id: "pickup", title: "Координация посадки", meta: "Проблема с поездкой", status: "В работе" },
  { id: "parcel", title: "Вопрос по посылке", meta: "Посылка", status: "Открыто" },
];

export default function ClientSupportPage() {
  const [selectedTopic, setSelectedTopic] = useState(topics[0]!);
  const supportHref = `/messages/support-envo?topic=${encodeURIComponent(selectedTopic)}`;

  return (
    <ClientShell active="messages">
      <ClientHeader backHref="/profile" level="secondary" title="Поддержка" subtitle="Выберите тему, затем продолжите в Сообщениях" />

      <Card className="mt-4" compact>
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]">
            <Icon name="chat" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="m-0 text-lg font-black">Поддержка ENVO</h1>
            <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Один чат для поездок, посылок и обращений. Новая тема добавится как контекст внутри беседы.
            </p>
          </div>
          <StatusPill tone="success">Онлайн</StatusPill>
        </div>
        <Link className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline" href={supportHref}>
          Открыть чат поддержки
        </Link>
      </Card>

      <Card className="mt-3" compact>
        <h2 className="m-0 text-lg font-black">С чем нужна помощь?</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {topics.map((topic) => (
            <button
              key={topic}
              className={["min-h-12 rounded-[18px] border-0 px-3 text-sm font-semibold", selectedTopic === topic ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "bg-[rgb(var(--canvas))] text-[rgb(var(--primary))]"].join(" ")}
              type="button"
              onClick={() => setSelectedTopic(topic)}
            >
              {topic}
            </button>
          ))}
        </div>
        <Link className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline" href={supportHref}>Создать обращение в чате</Link>
      </Card>

      <Card className="mt-3" compact>
        <div className="flex items-center justify-between gap-3">
          <h2 className="m-0 text-lg font-black">Последние обращения</h2>
          <StatusPill tone="accent">{tickets.length}</StatusPill>
        </div>
        <div className="mt-3 grid gap-2">
          {tickets.map((ticket) => (
            <Link key={ticket.id} className="block rounded-[18px] bg-[rgb(var(--canvas))] p-3 text-[rgb(var(--foreground))] no-underline" href={`/messages/support-envo?topic=${encodeURIComponent(ticket.title)}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-black">{ticket.title}</div>
                  <div className="mt-1 truncate text-xs font-semibold text-[rgb(var(--text-muted))]">{ticket.meta}</div>
                </div>
                <StatusPill tone="info">{ticket.status}</StatusPill>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </ClientShell>
  );
}
