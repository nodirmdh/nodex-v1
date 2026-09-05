import Link from "next/link";
import { Avatar, Card, ClientHeader, ClientShell, StatusPill } from "../client-ui";

const conversations = [
  {
    id: "driver-azizbek",
    participant: "Azizbek Karimov",
    context: "Nukus → Urgench · завтра 08:30",
    lastMessage: "Напишу перед прибытием к точке посадки.",
    timestamp: "2 мин",
    unread: true,
    category: "Чат поездки",
  },
  {
    id: "support-envo",
    participant: "Поддержка ENVO",
    context: "Координация посадки · в работе",
    lastMessage: "Мы добавили вашу заметку к заявке.",
    timestamp: "1 ч",
    unread: false,
    category: "Поддержка",
  },
  {
    id: "parcel-driver",
    participant: "Водитель посылки",
    context: "Посылка · Nukus → Khiva · в пути",
    lastMessage: "Посылка принята и уже в пути.",
    timestamp: "Вчера",
    unread: false,
    category: "Чат по посылке",
  },
];

export default function ClientMessagesPage() {
  return (
    <ClientShell active="messages">
      <ClientHeader title="Сообщения" subtitle="Поездки, посылки и поддержка" />

      <section className="mt-4 grid gap-2.5" aria-label="Единый список сообщений">
        {conversations.map((conversation) => (
          <Link
            key={conversation.id}
            className="block text-[rgb(var(--foreground))] no-underline"
            href={`/messages/${conversation.id}`}
          >
            <Card
              compact
              className={conversation.unread ? "ring-1 ring-[rgb(var(--primary)/0.22)]" : ""}
            >
              <div className="flex items-start gap-3">
                <Avatar name={conversation.participant} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="m-0 truncate text-base font-black">
                        {conversation.participant}
                      </h2>
                      <p className="m-0 truncate text-xs font-bold text-[rgb(var(--text-muted))]">
                        {conversation.context}
                      </p>
                    </div>
                    <span className="text-xs font-black text-[rgb(var(--text-muted))]">
                      {conversation.timestamp}
                    </span>
                  </div>
                  <p className="m-0 mt-1.5 line-clamp-2 text-sm font-semibold text-[rgb(var(--text-muted))]">
                    {conversation.lastMessage}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <StatusPill tone="accent" subtle>
                      {conversation.category}
                    </StatusPill>
                    {conversation.unread ? <StatusPill tone="warning">Новое</StatusPill> : null}
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </section>
    </ClientShell>
  );
}
