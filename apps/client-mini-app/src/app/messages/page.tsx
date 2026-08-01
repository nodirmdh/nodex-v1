import { AppHeader, Badge, BottomNav, Button, Panel } from "@nodex/ui";

const conversations = [
  {
    title: "Booking chat",
    context: "Tashkent to Samarkand",
    status: "Active",
    lastMessage: "Driver: I will message before arrival.",
  },
  {
    title: "Parcel chat",
    context: "Accepted parcel",
    status: "Delivered",
    lastMessage: "Driver: Parcel accepted and moving on route.",
  },
];

export default function ClientMessagesPage() {
  return (
    <main className="nodex-app mobile-shell pb-20">
      <AppHeader title="Messages" subtitle="Booking and parcel conversations" />
      <div className="space-y-4 px-4">
        {conversations.map((conversation) => (
          <Panel key={conversation.title} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="m-0 text-base font-black">{conversation.title}</h1>
                <div className="text-sm text-slate-500">{conversation.context}</div>
              </div>
              <Badge tone={conversation.status === "Active" ? "success" : "info"}>
                {conversation.status}
              </Badge>
            </div>
            <p className="m-0 text-sm">{conversation.lastMessage}</p>
            <Button className="min-h-11">Open chat</Button>
          </Panel>
        ))}
      </div>
      <BottomNav
        items={[
          { label: "Home" },
          { label: "Search" },
          { label: "Messages", active: true },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}
