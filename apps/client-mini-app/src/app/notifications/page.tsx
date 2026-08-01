import { AppHeader, Badge, BottomNav, Panel } from "@nodex/ui";

const notifications = [
  { title: "Support ticket updated", body: "Support added a response.", status: "Unread" },
  { title: "New chat message", body: "Your driver sent a route update.", status: "Read" },
  { title: "Parcel accepted", body: "Your parcel is ready for handover.", status: "Read" },
];

export default function ClientNotificationsPage() {
  return (
    <main className="nodex-app mobile-shell pb-20">
      <AppHeader title="Notifications" subtitle="In-app and Telegram delivery status" />
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
          { label: "Home" },
          { label: "Messages" },
          { label: "Alerts", active: true },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}
