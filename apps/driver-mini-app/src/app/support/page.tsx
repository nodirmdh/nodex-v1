import Link from "next/link";
import { DriverCard, DriverHeader, DriverPill, DriverShell } from "../driver-ui";

const categories = ["Поездка", "Пассажир", "Неявка", "Безопасность", "Автомобиль", "Подписка", "Посылка", "Другое"];

export default function DriverSupportPage() {
  return (
    <DriverShell active="messages">
      <DriverHeader
        title="Поддержка"
        subtitle="Выберите тему и продолжите в едином чате ENVO"
        status={<DriverPill tone="warning">В работе</DriverPill>}
      />

      <DriverCard className="mt-5 space-y-3" label="Единая поддержка">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="m-0 text-lg font-black">Поддержка ENVO</h1>
            <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Один чат для документов, поездки, посылки и безопасности. Вложения отправляются внутри переписки.
            </p>
          </div>
          <DriverPill tone="info">1 чат</DriverPill>
        </div>
        <Link
          className="flex min-h-11 items-center justify-center rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] no-underline"
          href="/messages/support"
        >
          Открыть чат поддержки
        </Link>
      </DriverCard>

      <DriverCard className="mt-4" label="Темы обращения">
        <h2 className="m-0 text-base font-black">С чем нужна помощь?</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {categories.map((item) => (
            <Link
              key={item}
              className="flex min-h-11 items-center justify-center rounded-[16px] bg-[rgb(var(--canvas))] px-3 text-center text-sm font-semibold text-[rgb(var(--foreground))] no-underline"
              href="/messages/support"
            >
              {item}
            </Link>
          ))}
        </div>
      </DriverCard>

      <DriverCard className="mt-4 space-y-2" label="Быстрые переходы">
        <Link className="flex min-h-10 items-center justify-center rounded-full bg-[rgb(var(--canvas))] px-3 text-xs font-semibold text-[rgb(var(--primary))] no-underline" href="/safety">Безопасность</Link>
        <Link className="flex min-h-10 items-center justify-center rounded-full bg-[rgb(var(--canvas))] px-3 text-xs font-semibold text-[rgb(var(--primary))] no-underline" href="/trip-demo">Активная поездка</Link>
      </DriverCard>
    </DriverShell>
  );
}
