import { Card, ClientHeader, ClientShell, Icon, StatusPill } from "../../client-ui";

export default function ClientSosPage() {
  return (
    <ClientShell active="profile">
      <ClientHeader
        backHref="/safety"
        level="secondary"
        title="SOS"
        subtitle="Emergency help for active trips"
      />

      <Card className="mt-4 space-y-3.5" compact>
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[rgb(var(--destructive-soft))] text-[rgb(var(--destructive))]">
          <Icon name="warning" className="h-9 w-9" />
        </div>
        <div className="text-center">
          <StatusPill tone="danger">Confirmation required</StatusPill>
          <h1 className="m-0 mt-3 text-2xl font-black">Emergency help</h1>
          <p className="m-0 mt-2 text-sm font-semibold text-[rgb(var(--text-muted))]">
            Nodex can record this action, attach trip details, and guide you to local emergency
            help. This does not place a phone call automatically.
          </p>
        </div>
        <button
          className="min-h-14 rounded-full bg-[rgb(var(--destructive))] px-4 text-base font-black text-white"
          type="button"
        >
          Hold to start SOS
        </button>
      </Card>

      <Card className="mt-3" compact>
        <h2 className="m-0 mb-3 text-lg font-black">Other safety options</h2>
        <div className="grid gap-2">
          {["Share trip with trusted contact", "Contact Nodex support", "Create safety report"].map(
            (item) => (
              <button
                key={item}
                className="min-h-11 rounded-full bg-[rgb(var(--canvas))] px-4 text-sm font-black text-[rgb(var(--foreground))]"
                type="button"
              >
                {item}
              </button>
            ),
          )}
        </div>
      </Card>
    </ClientShell>
  );
}
