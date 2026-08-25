import Link from "next/link";
import { Avatar, Card, ClientHeader, ClientShell, StatusPill } from "../client-ui";

const conversations = [
  {
    id: "driver-azizbek",
    participant: "Azizbek Karimov",
    context: "Nukus to Urgench · Tomorrow 08:30",
    lastMessage: "I will message before arrival at the pickup point.",
    timestamp: "2 min",
    unread: true,
    category: "Trip",
  },
  {
    id: "support-ticket",
    participant: "Nodex Support",
    context: "Ticket #2048 · pickup coordination",
    lastMessage: "We added your note to the request.",
    timestamp: "1h",
    unread: false,
    category: "Support",
  },
  {
    id: "parcel-driver",
    participant: "Parcel driver",
    context: "Accepted parcel · Nukus to Khiva",
    lastMessage: "Parcel accepted and moving on route.",
    timestamp: "Yesterday",
    unread: false,
    category: "Parcel",
  },
];

export default function ClientMessagesPage() {
  return (
    <ClientShell active="messages">
      <ClientHeader title="Messages" subtitle="Trips, parcels, and support" />

      <section className="mt-4 grid gap-2.5" aria-label="Message inbox">
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
                    {conversation.unread ? <StatusPill tone="warning">Unread</StatusPill> : null}
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
