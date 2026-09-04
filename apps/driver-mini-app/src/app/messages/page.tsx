import Link from "next/link";
import { DriverCard, DriverHeader, DriverPill, DriverShell } from "../driver-ui";

const conversations = [
  {
    id: "trip-passenger",
    initials: "AK",
    type: "Поездка",
    title: "Azizbek Karimov",
    context: "Nukus → Urgench · Переднее пассажирское",
    body: "Буду у главного входа.",
    time: "2 мин",
    unread: true,
  },
  {
    id: "support",
    initials: "EN",
    type: "Поддержка",
    title: "Поддержка ENVO",
    context: "Проверка документов · В работе",
    body: "Мы добавили заметку к вашему обращению.",
    time: "1 ч",
    unread: false,
  },
  {
    id: "parcel-sender",
    initials: "GE",
    type: "Посылка",
    title: "Gulnora Ergasheva",
    context: "Посылка · Nukus → Urgench",
    body: "Напишите после передачи водителю.",
    time: "18 мин",
    unread: false,
  },
];

export default function DriverMessagesPage() {
  return (
    <DriverShell active="messages">
      <DriverHeader
        title="Сообщения"
        subtitle="Поездки, посылки и единая поддержка"
        status={<DriverPill tone="info">3 чата</DriverPill>}
      />

      <section aria-label="Входящие водителя" className="mt-4 space-y-2.5">
        {conversations.map((conversation) => (
          <Link
            key={conversation.id}
            className="block no-underline text-[rgb(var(--foreground))]"
            href={`/messages/${conversation.id}`}
          >
            <DriverCard
              className={conversation.unread ? "ring-1 ring-[rgb(var(--primary)/0.2)]" : ""}
            >
              <div className="flex gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-sm font-black text-[rgb(var(--primary))]">
                  {conversation.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h1 className="m-0 truncate text-base font-black">{conversation.title}</h1>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <DriverPill tone={conversation.type === "Поездка" ? "success" : conversation.type === "Посылка" ? "accent" : "info"}>
                          {conversation.type}
                        </DriverPill>
                        <span className="min-w-0 truncate text-xs font-semibold text-[rgb(var(--text-muted))]">
                          {conversation.context}
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-black text-[rgb(var(--primary))]">
                      {conversation.time}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {conversation.unread && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[rgb(var(--primary))]" />
                    )}
                    <p className="m-0 truncate text-sm font-semibold text-[rgb(var(--text-muted))]">
                      {conversation.body}
                    </p>
                  </div>
                </div>
              </div>
            </DriverCard>
          </Link>
        ))}
      </section>
    </DriverShell>
  );
}
