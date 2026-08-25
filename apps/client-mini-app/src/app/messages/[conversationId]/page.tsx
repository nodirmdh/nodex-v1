import { Avatar, ClientHeader, ClientShell, StatusPill } from "../../client-ui";

const messages = [
  {
    from: "driver",
    text: "Good morning. I will message before arrival at the pickup point.",
    time: "08:01",
  },
  { from: "client", text: "Thank you. I will be near the main entrance.", time: "08:03" },
  { from: "driver", text: "Perfect. White Chevrolet Cobalt, plate 95 A 214 QA.", time: "08:05" },
];

export default function ClientChatPage() {
  return (
    <ClientShell active="messages">
      <ClientHeader
        action={<StatusPill tone="success">Trip chat</StatusPill>}
        backHref="/messages"
        level="secondary"
        subtitle="Nukus to Urgench · seat request"
        title="Azizbek Karimov"
      />

      <section className="mt-4 rounded-[24px] bg-[rgb(var(--surface))] p-3 shadow-[var(--shadow-md)]">
        <div className="flex items-center gap-3">
          <Avatar name="Azizbek Karimov" />
          <div>
            <h2 className="m-0 text-base font-black">Driver conversation</h2>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Linked to this trip request.
            </p>
          </div>
        </div>
      </section>

      <section aria-label="Chat messages" className="mt-3 grid gap-2.5">
        {messages.map((message) => {
          const own = message.from === "client";
          return (
            <div key={`${message.time}-${message.text}`} className={own ? "flex justify-end" : ""}>
              <div
                className={[
                  "max-w-[82%] rounded-[22px] px-4 py-2.5 shadow-[var(--shadow-xs)]",
                  own
                    ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                    : "bg-[rgb(var(--surface))] text-[rgb(var(--foreground))]",
                ].join(" ")}
              >
                <p className="m-0 text-sm font-semibold">{message.text}</p>
                <p className="m-0 mt-1 text-right text-[11px] font-bold opacity-70">
                  {message.time}
                </p>
              </div>
            </div>
          );
        })}
      </section>

      <form className="sticky bottom-20 mt-4 rounded-full bg-[rgb(var(--surface)/0.96)] p-1.5 shadow-[var(--shadow-floating)] backdrop-blur-xl">
        <label className="sr-only" htmlFor="chat-message">
          Message
        </label>
        <div className="flex items-center gap-2">
          <input
            className="min-h-11 min-w-0 flex-1 rounded-full border-0 bg-[rgb(var(--canvas))] px-4 text-sm font-semibold outline-none"
            id="chat-message"
            placeholder="Message driver"
          />
          <button
            className="min-h-11 rounded-full bg-[rgb(var(--primary))] px-5 text-sm font-black text-[rgb(var(--primary-foreground))]"
            type="button"
          >
            Send
          </button>
        </div>
      </form>
    </ClientShell>
  );
}
