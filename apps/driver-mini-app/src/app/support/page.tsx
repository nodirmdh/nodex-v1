"use client";

import { useState } from "react";
import Link from "next/link";
import { DriverCard, DriverHeader, DriverPill, DriverShell } from "../driver-ui";

const categories = [
  "Trip problem",
  "Passenger issue",
  "Client no-show",
  "Unsafe situation",
  "Lost item",
  "Vehicle issue",
  "Verification",
  "Subscription",
  "Parcel",
  "Safety",
  "Other",
];

export default function DriverSupportPage() {
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(["Driver: Parcel sender asks for delivery photo.", "Support: Use active trip notes and keep passenger privacy visible."]);

  function sendMessage() {
    if (!message.trim()) return;
    setMessages((current) => [...current, `Driver: ${message.trim()}`]);
    setMessage("");
  }

  return (
    <DriverShell active="profile">
      <DriverHeader title="Support" subtitle="Driver help for active work" status={<DriverPill tone="warning">1 open</DriverPill>} />

      <DriverCard className="mt-4 space-y-3" label="Driver support ticket">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-xl font-black">Parcel handover question</h1>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">Connected to active parcel and trip timeline.</p>
          </div>
          <DriverPill tone="warning">Waiting</DriverPill>
        </div>
        <button className="min-h-11 w-full rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))]" type="button" onClick={() => setSelected("Parcel handover question")}>Contact support</button>
      </DriverCard>

      <DriverCard className="mt-3 space-y-3" label="Driver support categories">
        <h2 className="m-0 text-lg font-black">Create support request</h2>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((category) => (
            <button key={category} className="min-h-11 rounded-[16px] border-0 bg-[rgb(var(--canvas))] px-3 text-left text-xs font-black" type="button" onClick={() => setSelected(category)}>{category}</button>
          ))}
        </div>
      </DriverCard>

      <DriverCard className="mt-3 space-y-2" label="Support activity">
        <h2 className="m-0 text-lg font-black">Recent activity</h2>
        <button className="w-full rounded-[16px] border-0 bg-[rgb(var(--canvas))] p-3 text-left text-sm font-semibold text-[rgb(var(--text-muted))]" type="button" onClick={() => setSelected("Parcel handover question")}>Support replied · Today 14:20</button>
      </DriverCard>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgb(var(--foreground)/0.28)] px-3 pb-3" role="dialog" aria-modal="true">
          <section className="w-full max-w-[430px] rounded-[28px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-floating)]">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div><h2 className="m-0 text-lg font-black">{selected}</h2><p className="m-0 text-xs font-bold text-[rgb(var(--text-muted))]">Driver support demo ticket</p></div>
              <button className="h-9 w-9 rounded-full border-0 bg-[rgb(var(--canvas))] text-lg font-black" type="button" onClick={() => setSelected("")}>×</button>
            </div>
            <div className="max-h-48 space-y-2 overflow-auto rounded-[18px] bg-[rgb(var(--canvas))] p-3">
              {messages.map((item) => <p key={item} className="m-0 rounded-[14px] bg-[rgb(var(--surface))] p-2 text-sm font-semibold">{item}</p>)}
            </div>
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <input className="min-h-11 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm font-semibold" placeholder="Message support" value={message} onChange={(event) => setMessage(event.target.value)} />
              <button className="rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))]" type="button" onClick={sendMessage}>Send</button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link className="inline-flex min-h-10 items-center justify-center rounded-full bg-[rgb(var(--surface-tint))] px-3 text-xs font-black text-[rgb(var(--primary))] no-underline" href="/safety">Safety actions</Link>
              <Link className="inline-flex min-h-10 items-center justify-center rounded-full bg-[rgb(var(--surface-tint))] px-3 text-xs font-black text-[rgb(var(--primary))] no-underline" href="/trip-demo">Open trip</Link>
            </div>
          </section>
        </div>
      ) : null}
    </DriverShell>
  );
}