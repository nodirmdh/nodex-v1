"use client";

import { AppHeader, Badge, BottomNav, Button, Panel } from "@nodex/ui";

const conversations = [
  {
    title: "Passenger chat",
    context: "Confirmed booking",
    badge: "Active",
    body: "Client: I will be at pickup point 10 minutes early.",
  },
  {
    title: "Parcel sender",
    context: "Accepted parcel",
    badge: "Route update",
    body: "Sender expects a status update before handover.",
  },
];

export default function DriverMessagesPage() {
  return (
    <main className="nodex-app mobile-shell pb-20">
      <AppHeader title="Messages" subtitle="Passenger and parcel communication" />
      <div className="space-y-4 px-4">
        {conversations.map((conversation) => (
          <Panel key={conversation.title} className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="m-0 text-base font-black">{conversation.title}</h1>
                <div className="text-sm text-slate-500">{conversation.context}</div>
              </div>
              <Badge tone="success">{conversation.badge}</Badge>
            </div>
            <p className="m-0 text-sm">{conversation.body}</p>
            <Button className="min-h-11">Reply</Button>
          </Panel>
        ))}
      </div>
      <BottomNav
        items={[
          { label: "Trips" },
          { label: "Parcels" },
          { label: "Messages", active: true },
          { label: "Profile" },
        ]}
      />
    </main>
  );
}
