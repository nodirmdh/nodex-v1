import Link from "next/link";
import { DriverCard, DriverHeader, DriverIconView, DriverPill, DriverShell } from "../driver-ui";

const supportActions = ["Пожаловаться на пассажира", "Сообщить об инциденте", "Написать в поддержку"];

export default function DriverSafetyPage() {
  return (
    <DriverShell active="profile">
      <DriverHeader
        title="Безопасность"
        subtitle="Инциденты, помощь и поддержка"
        status={<DriverPill tone="info">Под наблюдением</DriverPill>}
      />

      <DriverCard className="mt-4 space-y-3" label="Центр безопасности водителя">
        <div className="flex gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]">
            <DriverIconView name="shield" />
          </span>
          <div>
            <h1 className="m-0 text-xl font-black">Центр безопасности водителя</h1>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Сообщите о пассажире, инциденте в поездке или быстро откройте поддержку.
            </p>
          </div>
        </div>
      </DriverCard>

      <DriverCard className="mt-3 space-y-2" label="Безопасность текущей поездки">
        <h2 className="m-0 text-lg font-black">Текущая поездка</h2>
        {supportActions.map((action) => (
          <Link
            key={action}
            className="flex min-h-11 w-full items-center rounded-[16px] bg-[rgb(var(--canvas))] px-3 text-left text-sm font-black text-[rgb(var(--foreground))] no-underline"
            href="/messages/support"
          >
            {action}
          </Link>
        ))}
      </DriverCard>

      <DriverCard className="mt-3 space-y-3" label="Экстренная помощь">
        <h2 className="m-0 text-lg font-black">Экстренная помощь</h2>
        <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
          Используйте только в срочной ситуации.
        </p>
        <Link
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[rgb(var(--destructive))] px-4 text-sm font-black text-white no-underline"
          href="/safety/sos"
        >
          Открыть экстренные действия
        </Link>
      </DriverCard>
    </DriverShell>
  );
}
