"use client";

import { useState } from "react";
import { Avatar, ClientHeader, ClientShell, StatusPill } from "../../client-ui";

const messages = [
  {
    from: "driver",
    text: "Доброе утро. Напишу перед прибытием к точке посадки.",
    time: "08:01",
  },
  { from: "client", text: "Спасибо. Я буду у главного входа.", time: "08:03" },
  { from: "driver", text: "Отлично. Белый Chevrolet Cobalt, номер 95 A 214 QA.", time: "08:05" },
];

export default function ClientChatPage() {
  const [draft, setDraft] = useState("");
  const [sentСообщениеs, setSentСообщениеs] = useState<Array<{ text: string; time: string }>>([]);
  const [attachment, setAttachment] = useState("");
  const visibleСообщениеs = [
    ...messages,
    ...sentСообщениеs.map((message) => ({ from: "client", ...message })),
  ];

  function sendСообщение() {
    const text = draft.trim();
    if (!text) return;
    setSentСообщениеs((current) => [...current, { text, time: "Сейчас" }]);
    setDraft("");
  }

  return (
    <ClientShell active="messages">
      <ClientHeader
        action={<StatusPill tone="success">Чат поездки</StatusPill>}
        backHref="/messages"
        level="secondary"
        subtitle="Nukus → Urgench · заявка на место"
        title="Azizbek Karimov"
      />

      <section className="mt-4 rounded-[24px] bg-[rgb(var(--surface))] p-3 shadow-[var(--shadow-md)]">
        <div className="flex items-center gap-3">
          <Avatar name="Azizbek Karimov" />
          <div>
            <h2 className="m-0 text-base font-black">Диалог с водителем</h2>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Связано с этой заявкой на поездку.
            </p>
          </div>
        </div>
      </section>

      <section aria-label="Сообщения чата" className="mt-3 grid gap-2.5">
        {visibleСообщениеs.map((message) => {
          const own = message.from === "client";
          return (
            <div key={`${message.time}-${message.text}`} className={own ? "flex justify-end" : ""}>
              <div
                className={[
                  "max-w-[82%] rounded-[22px] px-4 py-2.5 shadow-[var(--shadow-xs)]",
                  own
                    ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                    : "bg-[rgb(var(--surface))] text-[rgb(var(--foreground))]",
                ].join(" ")}
              >
                <p className="m-0 text-sm font-semibold">{message.text}</p>
                <p className="m-0 mt-1 text-right text-[11px] font-bold opacity-70">
                  {message.time}
                </p>
              </div>
            </div>
          );
        })}
      </section>

      <form className="sticky bottom-20 mt-4 rounded-full bg-[rgb(var(--surface)/0.96)] p-1.5 shadow-[var(--shadow-floating)] backdrop-blur-xl">
        <label className="sr-only" htmlFor="chat-message">
          Сообщение
        </label>
        <div className="flex items-center gap-2">
          <input
            className="min-h-11 min-w-0 flex-1 rounded-full border-0 bg-[rgb(var(--canvas))] px-4 text-sm font-semibold outline-none"
            id="chat-message"
            placeholder="Напишите сообщение"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button
            className="min-h-11 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm font-black text-[rgb(var(--primary))]"
            type="button"
            onClick={() => setAttachment("Фото точки посадки.jpg")}
          >
            Файл
          </button>
          <button
            className="min-h-11 rounded-full bg-[rgb(var(--primary))] px-5 text-sm font-black text-[rgb(var(--primary-foreground))]"
            type="button"
            onClick={sendСообщение}
          >
            Отправить
          </button>
        </div>
        {attachment ? <div className="px-3 pb-1 text-xs font-black text-[rgb(var(--primary))]">Прикреплено: {attachment}</div> : null}
      </form>
    </ClientShell>
  );
}
