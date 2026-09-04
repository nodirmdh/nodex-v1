"use client";

import { useMemo, useState } from "react";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "../admin-shell";

type Conversation = {
  id: string;
  participant: string;
  context: "Trip" | "Parcel" | "Support" | "Safety";
  route: string;
  linkedObject: string;
  lastMessage: string;
  lastActivity: string;
  unread: number;
  escalated: boolean;
  thread: Array<{
    author: string;
    visibility: "User-visible" | "Internal";
    body: string;
    time: string;
  }>;
};

const conversations: Conversation[] = [
  {
    id: "message-trip",
    participant: "Dilshod Allamuratov",
    context: "Trip",
    route: "Nukus → Urgench",
    linkedObject: "Поездка сегодня · 18:30 · Azizbek Karimov",
    lastMessage: "Можно взять один небольшой чемодан?",
    lastActivity: "7 мин назад",
    unread: 2,
    escalated: false,
    thread: [
      {
        author: "Пассажир",
        visibility: "User-visible",
        body: "Можно взять один небольшой чемодан?",
        time: "12:41",
      },
      {
        author: "Водитель",
        visibility: "User-visible",
        body: "Да, один небольшой чемодан можно.",
        time: "12:44",
      },
      {
        author: "Заметка оператора",
        visibility: "Internal",
        body: "Нарушений правил нет. Связано с активной заявкой на место.",
        time: "12:45",
      },
    ],
  },
  {
    id: "message-parcel",
    participant: "Gulnora Ergasheva",
    context: "Parcel",
    route: "Nukus → Khiva",
    linkedObject: "Посылка · Мелкая техника · В пути",
    lastMessage: "Получатель сообщает, что водитель опаздывает.",
    lastActivity: "14 мин назад",
    unread: 1,
    escalated: true,
    thread: [
      {
        author: "Отправитель",
        visibility: "User-visible",
        body: "Получатель сообщает, что водитель опаздывает.",
        time: "12:30",
      },
      {
        author: "Заметка оператора",
        visibility: "Internal",
        body: "Посылка связана с активной поездкой. Проконтролируйте передачу получателю.",
        time: "12:35",
      },
    ],
  },
  {
    id: "message-support",
    participant: "Madina Yusupova",
    context: "Support",
    route: "Tashkent → Samarkand",
    linkedObject: "Обращение SUP-1842 · Аккаунт водителя",
    lastMessage: "Я загрузила новое фото страхового полиса.",
    lastActivity: "32 мин назад",
    unread: 0,
    escalated: false,
    thread: [
      {
        author: "Водитель",
        visibility: "User-visible",
        body: "Я загрузила новое фото страхового полиса.",
        time: "11:58",
      },
      {
        author: "Поддержка ENVO",
        visibility: "User-visible",
        body: "Спасибо, наша команда проверит его сегодня.",
        time: "12:03",
      },
    ],
  },
];

const contextLabels: Record<Conversation["context"], string> = {
  Trip: "Поездка",
  Parcel: "Посылка",
  Support: "Поддержка",
  Safety: "Безопасность",
};

const visibilityLabels: Record<Conversation["thread"][number]["visibility"], string> = {
  "User-visible": "Видно пользователю",
  Internal: "Внутренняя заметка",
};
export default function CommunicationsPage() {
  const [selectedId, setSelectedId] = useState(conversations[0]!.id);
  const selected = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? conversations[0]!,
    [selectedId],
  );

  return (
    <main className="p-5">
      <AdminPageHeader
        title="Сообщения"
        subtitle="Диалоги по поездкам, посылкам, поддержке и безопасности без входа от имени пользователя."
        actions={
          <>
            <button className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black">
              Экспорт диалогов
            </button>
            <button className="rounded-[10px] bg-[rgb(var(--primary))] px-3 py-2 text-sm font-black text-[rgb(var(--primary-foreground))]">
              Открыть эскалации
            </button>
          </>
        }
      />

      <div className="grid gap-4 min-[1380px]:grid-cols-[minmax(0,1fr)_470px]">
        <AdminPanel className="overflow-hidden" label="Очередь диалогов">
          <div className="grid gap-3 border-b border-[rgb(var(--border))] p-4 lg:grid-cols-[1fr_auto]">
            <div className="flex flex-wrap gap-2">
              {["Все", "Поездка", "Посылка", "Поддержка", "Безопасность"].map((filter) => (
                <button
                  key={filter}
                  className={[
                    "rounded-full px-3 py-2 text-sm font-black",
                    filter === "Все"
                      ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                      : "bg-[rgb(var(--surface-muted))]",
                  ].join(" ")}
                  type="button"
                >
                  {filter}
                </button>
              ))}
            </div>
            <input
              className="min-h-10 w-[300px] rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm outline-none"
              placeholder="Клиент, водитель, маршрут или обращение"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] font-black uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Участник</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Контекст</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Последнее сообщение</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Состояние</th>
                </tr>
              </thead>
              <tbody>
                {conversations.map((conversation) => (
                  <tr
                    key={conversation.id}
                    className={[
                      "cursor-pointer border-b border-[rgb(var(--border))] transition hover:bg-[rgb(var(--surface-muted))]",
                      selected.id === conversation.id ? "bg-[rgb(var(--info-soft))]" : "",
                    ].join(" ")}
                    onClick={() => setSelectedId(conversation.id)}
                  >
                    <td className="px-4 py-3">
                      <strong>{conversation.participant}</strong>
                      <span className="block text-xs font-semibold text-[rgb(var(--text-muted))]">
                        {conversation.route}
                      </span>
                    </td>
                    <td className="px-4 py-3">{contextLabels[conversation.context]}</td>
                    <td className="max-w-[300px] px-4 py-3 text-[rgb(var(--text-muted))]">
                      {conversation.lastMessage}
                      <span className="block text-xs">{conversation.lastActivity}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {conversation.unread > 0 && (
                          <AdminStatusBadge tone="info">
                            {conversation.unread} unread
                          </AdminStatusBadge>
                        )}
                        {conversation.escalated && (
                          <AdminStatusBadge tone="warning">Эскалация</AdminStatusBadge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <AdminPanel className="overflow-hidden" label="Карточка диалога">
          <div className="border-b border-[rgb(var(--border))] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-xl font-black">{selected.participant}</h2>
                <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                  {contextLabels[selected.context]} · {selected.linkedObject}
                </p>
              </div>
              <AdminStatusBadge tone={selected.escalated ? "warning" : "info"}>
                {contextLabels[selected.context]}
              </AdminStatusBadge>
            </div>
          </div>
          <div className="space-y-4 p-4">
            <section>
              <h3 className="m-0 mb-2 text-sm font-black">Диалог</h3>
              <div className="grid gap-2">
                {selected.thread.map((item) => (
                  <div
                    key={`${item.time}-${item.author}`}
                    className={[
                      "rounded-[12px] border p-3 text-sm",
                      item.visibility === "Internal"
                        ? "border-[rgb(var(--warning))] bg-[rgb(var(--warning-soft))]"
                        : "border-[rgb(var(--border))] bg-[rgb(var(--surface))]",
                    ].join(" ")}
                  >
                    <div className="flex justify-between gap-3">
                      <strong>{item.author}</strong>
                      <span className="text-xs font-bold text-[rgb(var(--text-muted))]">
                        {item.time}
                      </span>
                    </div>
                    <p className="m-0 mt-1 text-[rgb(var(--text-muted))]">{item.body}</p>
                    <span className="mt-2 inline-block text-[11px] font-black uppercase tracking-[0.08em]">
                      {visibilityLabels[item.visibility]}
                    </span>
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-[12px] border border-[rgb(var(--border))] p-3">
              <h3 className="m-0 mb-2 text-sm font-black">Связанные действия</h3>
              <div className="grid grid-cols-2 gap-2">
                {["Открыть поездку", "Открыть водителя", "Открыть пассажира", "Открыть обращение"].map(
                  (action) => (
                    <button
                      key={action}
                      className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black"
                      type="button"
                    >
                      {action}
                    </button>
                  ),
                )}
              </div>
            </section>
            <section>
              <h3 className="m-0 mb-2 text-sm font-black">Внутренняя заметка</h3>
              <textarea
                className="min-h-24 w-full rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] p-3 text-sm outline-none"
                placeholder="Видно только операторам. Сообщение не отправляется водителю или пассажиру."
              />
            </section>
          </div>
        </AdminPanel>
      </div>
    </main>
  );
}
