import Link from "next/link";
import { Card, ClientHeader, ClientShell, Icon, StatusPill } from "../../client-ui";

const safetyOptions = [
  { label: "Share trip with trusted contact", href: "/safety?shared=true" },
  { label: "Contact Nodex support", href: "/messages/support-ticket?safety=support" },
  { label: "Create safety report", href: "/support?safety=report" },
];

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
        <Link
          className="inline-flex min-h-14 items-center justify-center rounded-full bg-[rgb(var(--destructive))] px-4 text-base font-black text-white no-underline"
          href="/messages/support-ticket?safety=sos"
        >
          Hold to start SOS
        </Link>
      </Card>

      <Card className="mt-3" compact>
        <h2 className="m-0 mb-3 text-lg font-black">Other safety options</h2>
        <div className="grid gap-2">
          {safetyOptions.map((item) => (
            <Link
              key={item.label}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--canvas))] px-4 text-center text-sm font-black text-[rgb(var(--foreground))] no-underline"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </Card>
    </ClientShell>
  );
}
