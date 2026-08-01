import { AppHeader, Badge, BottomNav, Panel } from "@nodex/ui";

const notifications = [
  { title: "New passenger message", body: "A confirmed passenger wrote to you.", status: "Unread" },
  {
    title: "Support reply",
    body: "Support updated a ticket connected to your trip.",
    status: "Read",
  },
];

export default function DriverNotificationsPage() {
  return (
    <main className="nodex-app mobile-shell pb-20">
      <AppHeader title="Notifications" subtitle="In-app and Telegram delivery" />
      <div className="space-y-3 px-4">
        {notifications.map((notification) => (
          <Panel key={notification.title} className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <h1 className="m-0 text-base font-black">{notification.title}</h1>
              <Badge tone={notification.status === "Unread" ? "warning" : "success"}>
                {notification.status}
              </Badge>
            </div>
            <p className="m-0 text-sm text-slate-600">{notification.body}</p>
          </Panel>
        ))}
      </div>
      <BottomNav
        items={[
          { label: "Trips" },
          { label: "Messages" },
          { label: "Alerts", active: true },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}
