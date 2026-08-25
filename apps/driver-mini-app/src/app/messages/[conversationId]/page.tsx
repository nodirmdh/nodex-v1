import Link from "next/link";
import { DriverCard, DriverHeader, DriverPill, DriverShell } from "../../driver-ui";

const messages = [
  { from: "passenger", text: "Assalomu alaykum, I will be at the entrance.", time: "08:02" },
  { from: "driver", text: "Thanks. I will arrive near the main gate.", time: "08:03" },
  { from: "passenger", text: "I have one small bag.", time: "08:04" },
];

export default function DriverChatPage() {
  return (
    <DriverShell active="messages">
      <DriverHeader
        title="Azizbek Karimov"
        subtitle="Nukus → Urgench · Front passenger"
        status={<DriverPill tone="success">Confirmed</DriverPill>}
      />

      <DriverCard className="mt-4 space-y-2" label="Chat passenger context">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="m-0 text-lg font-black">Passenger chat</h1>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Tomorrow 08:30 · seat reserved
            </p>
          </div>
          <Link
            className="text-sm font-black text-[rgb(var(--primary))] no-underline"
            href="/trip-demo"
          >
            Trip
          </Link>
        </div>
      </DriverCard>

      <section aria-label="Driver chat messages" className="mt-3 space-y-2">
        {messages.map((message) => (
          <div
            key={`${message.time}-${message.text}`}
            className={[
              "max-w-[82%] rounded-[20px] px-3 py-2 shadow-[var(--shadow-xs)]",
              message.from === "driver"
                ? "ml-auto bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                : "bg-[rgb(var(--surface))]",
            ].join(" ")}
          >
            <p className="m-0 text-sm font-semibold">{message.text}</p>
            <div
              className={[
                "mt-1 text-[10px] font-bold",
                message.from === "driver" ? "opacity-75" : "text-[rgb(var(--text-muted))]",
              ].join(" ")}
            >
              {message.time}
            </div>
          </div>
        ))}
      </section>

      <div className="sticky bottom-20 mt-4 rounded-full bg-[rgb(var(--surface)/0.96)] p-2 shadow-[var(--shadow-floating)] backdrop-blur-xl">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            aria-label="Message"
            className="min-h-11 rounded-full border-0 bg-[rgb(var(--canvas))] px-4 text-sm font-semibold"
            placeholder="Message confirmed passenger"
          />
          <button
            className="min-h-11 rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))]"
            type="button"
          >
            Send
          </button>
        </div>
      </div>
    </DriverShell>
  );
}
