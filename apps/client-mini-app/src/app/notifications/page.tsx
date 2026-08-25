import { Card, ClientHeader, ClientShell, Icon, StatusPill } from "../client-ui";

const notifications = [
  {
    icon: "car" as const,
    title: "Driver confirmed your request",
    body: "Azizbek accepted Nukus to Urgench. Your selected seat is Front passenger.",
    time: "Now",
    unread: true,
    tone: "success" as const,
  },
  {
    icon: "chat" as const,
    title: "New driver message",
    body: "White Chevrolet Cobalt, plate 95 A 214 QA.",
    time: "2 min",
    unread: true,
    tone: "accent" as const,
  },
  {
    icon: "help" as const,
    title: "Support ticket updated",
    body: "Support added your pickup note to the request.",
    time: "1h",
    unread: false,
    tone: "info" as const,
  },
  {
    icon: "shield" as const,
    title: "Safety reminder",
    body: "Share trip details with a trusted contact before departure.",
    time: "Yesterday",
    unread: false,
    tone: "warning" as const,
  },
];

export default function ClientNotificationsPage() {
  return (
    <ClientShell active="profile">
      <ClientHeader
        backHref="/profile"
        level="secondary"
        title="Notifications"
        subtitle="Trips, messages, and safety"
      />

      <section aria-label="Notifications" className="mt-4 grid gap-2.5">
        {notifications.map((notification) => (
          <Card key={notification.title} compact>
            <div className="flex items-start gap-3">
              <span className="relative mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]">
                <Icon name={notification.icon} className="h-4 w-4" />
                {notification.unread ? (
                  <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-[rgb(var(--warning))]" />
                ) : null}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="m-0 text-base font-black">{notification.title}</h2>
                  <span className="shrink-0 text-xs font-black text-[rgb(var(--text-muted))]">
                    {notification.time}
                  </span>
                </div>
                <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">
                  {notification.body}
                </p>
                <div className="mt-2">
                  <StatusPill tone={notification.tone} subtle={!notification.unread}>
                    {notification.unread ? "Unread" : "Read"}
                  </StatusPill>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </section>
    </ClientShell>
  );
}
