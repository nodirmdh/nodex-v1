import Link from "next/link";
import type { ReactNode } from "react";

type IconName =
  | "bell"
  | "calendar"
  | "car"
  | "chevron"
  | "clock"
  | "home"
  | "map"
  | "message"
  | "navigation"
  | "shield"
  | "star"
  | "swap"
  | "user"
  | "users";

const iconPaths: Record<IconName, ReactNode> = {
  bell: <path d="M8 17h8M9 17a3 3 0 0 0 6 0M6 14h12l-1.6-2.2V8.8a4.4 4.4 0 0 0-8.8 0v3L6 14Z" />,
  calendar: (
    <path d="M7 5v3M17 5v3M5 9h14M6 6h12a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />
  ),
  car: (
    <path d="M5 14h14l-1.8-4.2A2 2 0 0 0 15.4 8H8.6a2 2 0 0 0-1.8 1.2L5 14Zm1 0v4m12-4v4M7.5 18h.1m8.8 0h.1" />
  ),
  chevron: <path d="m9 6 6 6-6 6" />,
  clock: <path d="M12 6v6l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  home: <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-5v-5h-4v5H5a1 1 0 0 1-1-1v-7.5Z" />,
  map: (
    <path d="M12 21s6-5.1 6-10a6 6 0 1 0-12 0c0 4.9 6 10 6 10Zm0-8a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
  ),
  message: <path d="M5 18v-4.5A7.5 7.5 0 1 1 9.5 20H6.8A1.8 1.8 0 0 1 5 18Z" />,
  navigation: <path d="m6 12 12-6-5 12-2-5-5-1Z" />,
  shield: <path d="M12 21c5-2.4 7-5.6 7-10V6l-7-3-7 3v5c0 4.4 2 7.6 7 10Zm-3-9 2 2 4-5" />,
  star: <path d="m12 4 2.2 4.7 5.1.6-3.8 3.5 1 5-4.5-2.5-4.5 2.5 1-5-3.8-3.5 5.1-.6L12 4Z" />,
  swap: <path d="M8 4v13m0 0-3-3m3 3 3-3m5 6V7m0 0-3 3m3-3 3 3" />,
  user: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" />,
  users: (
    <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6.5-.5a2.5 2.5 0 1 0 0-5M3.5 19a5.5 5.5 0 0 1 11 0M14 15.5c2.5.3 4.2 1.5 5 3.5" />
  ),
};

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height="18"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="18"
    >
      {iconPaths[name]}
    </svg>
  );
}

const rides = [
  {
    id: "phase5-nukus-urgench-morning",
    from: "Nukus",
    to: "Urgench",
    time: "08:30",
    date: "Tomorrow",
    driver: "Azizbek",
    rating: "4.9",
    vehicle: "Chevrolet Cobalt",
    seats: "3 seats left",
    price: "85k",
    tone: "teal",
    href: "/trips/phase5-nukus-urgench-morning",
  },
  {
    id: "phase5-nukus-khiva-evening",
    from: "Nukus",
    to: "Khiva",
    time: "16:40",
    date: "Today",
    driver: "Madina",
    rating: "4.8",
    vehicle: "Chevrolet Tracker",
    seats: "2 seats left",
    price: "110k",
    tone: "blue",
    href: "/search",
  },
];

const recentRoutes = ["Nukus to Kungrad", "Nukus to Urgench", "Nukus to Khiva"];

function VehicleMark({ tone }: { tone: "teal" | "blue" }) {
  return (
    <div className="relative h-14 w-20 shrink-0 rounded-[22px] bg-[rgb(var(--surface-tint))] shadow-[var(--shadow-xs)]">
      <div
        className={[
          "absolute left-3 right-3 top-5 h-5 rounded-full",
          tone === "teal" ? "bg-[rgb(var(--primary))]" : "bg-[rgb(var(--info))]",
        ].join(" ")}
      />
      <div className="absolute left-6 right-6 top-3 h-5 rounded-t-full bg-[rgb(var(--accent))]" />
      <div className="absolute bottom-3 left-4 h-2.5 w-2.5 rounded-full bg-[rgb(var(--foreground))]" />
      <div className="absolute bottom-3 right-4 h-2.5 w-2.5 rounded-full bg-[rgb(var(--foreground))]" />
    </div>
  );
}

function RideCard({ ride }: { ride: (typeof rides)[number] }) {
  return (
    <Link
      href={ride.href}
      className="block rounded-[26px] bg-[rgb(var(--surface))] p-4 text-[rgb(var(--foreground))] no-underline shadow-[var(--shadow-md)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[13px] font-semibold text-[rgb(var(--text-muted))]">
            <Icon name="clock" className="h-4 w-4" />
            {ride.date}, {ride.time}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xl font-extrabold leading-none">{ride.from}</span>
            <Icon name="navigation" className="h-4 w-4 text-[rgb(var(--primary))]" />
            <span className="text-xl font-extrabold leading-none">{ride.to}</span>
          </div>
        </div>
        <span className="rounded-full bg-[rgb(var(--primary))] px-3 py-2 text-sm font-extrabold text-[rgb(var(--primary-foreground))] shadow-[var(--shadow-sm)]">
          {ride.price}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <VehicleMark tone={ride.tone as "teal" | "blue"} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-xs font-extrabold text-[rgb(var(--primary))]">
              {ride.driver[0]}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold">{ride.driver}</div>
              <div className="truncate text-xs font-medium text-[rgb(var(--text-muted))]">
                {ride.vehicle}
              </div>
            </div>
          </div>
        </div>
        <div className="grid justify-items-end gap-1 text-xs font-bold">
          <span className="flex items-center gap-1 text-[rgb(var(--gold))]">
            <Icon name="star" className="h-3.5 w-3.5" />
            {ride.rating}
          </span>
          <span className="rounded-full bg-[rgb(var(--surface-blue))] px-2.5 py-1 text-[rgb(var(--info))]">
            {ride.seats}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      <div className="mx-auto min-h-screen max-w-[430px] overflow-hidden bg-[linear-gradient(180deg,rgb(var(--surface-tint))_0%,rgb(var(--background))_34%,rgb(var(--canvas))_100%)] px-4 pb-28 pt-4">
        <header className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-[rgb(var(--primary))]">Nodex</div>
            <h1 className="m-0 text-[1.55rem] font-extrabold leading-tight tracking-normal">
              Where to today?
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              aria-label="Notifications"
              className="grid h-11 w-11 place-items-center rounded-full bg-[rgb(var(--surface)/0.86)] shadow-[var(--shadow-xs)] backdrop-blur"
            >
              <Icon name="bell" />
            </button>
            <button
              aria-label="Profile"
              className="grid h-11 w-11 place-items-center rounded-full bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] shadow-[var(--shadow-sm)]"
            >
              <Icon name="user" />
            </button>
          </div>
        </header>

        <section className="mt-5 rounded-[30px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-floating)]">
          <div className="relative">
            <div className="absolute bottom-14 left-[21px] top-12 border-l-2 border-dashed border-[rgb(var(--primary)/0.25)]" />
            <div className="grid gap-3">
              <div className="flex min-h-[62px] items-center gap-3 rounded-[22px] bg-[rgb(var(--canvas))] px-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[rgb(var(--surface))] text-[rgb(var(--primary))] shadow-[var(--shadow-xs)]">
                  <Icon name="navigation" />
                </span>
                <span className="grid">
                  <span className="text-[11px] font-extrabold uppercase text-[rgb(var(--text-subtle))]">
                    From
                  </span>
                  <span className="text-lg font-extrabold">Nukus</span>
                </span>
              </div>

              <button
                aria-label="Swap origin and destination"
                className="absolute right-3 top-[58px] z-10 grid h-10 w-10 place-items-center rounded-full bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] shadow-[var(--shadow-md)]"
              >
                <Icon name="swap" />
              </button>

              <div className="flex min-h-[62px] items-center gap-3 rounded-[22px] bg-[rgb(var(--canvas))] px-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[rgb(var(--surface))] text-[rgb(var(--accent))] shadow-[var(--shadow-xs)]">
                  <Icon name="map" />
                </span>
                <span className="grid">
                  <span className="text-[11px] font-extrabold uppercase text-[rgb(var(--text-subtle))]">
                    To
                  </span>
                  <span className="text-lg font-extrabold">Urgench</span>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="flex min-h-[48px] items-center gap-2 rounded-[18px] bg-[rgb(var(--surface-tint))] px-3 text-left text-sm font-extrabold text-[rgb(var(--primary))]">
              <Icon name="calendar" className="h-4 w-4" />
              Tomorrow
            </button>
            <button className="flex min-h-[48px] items-center gap-2 rounded-[18px] bg-[rgb(var(--surface-blue))] px-3 text-left text-sm font-extrabold text-[rgb(var(--info))]">
              <Icon name="users" className="h-4 w-4" />2 passengers
            </button>
          </div>

          <Link
            href="/search?from=Nukus&to=Urgench"
            className="mt-4 flex min-h-[52px] items-center justify-center rounded-[18px] bg-[rgb(var(--primary))] text-base font-extrabold text-[rgb(var(--primary-foreground))] no-underline shadow-[var(--shadow-md)]"
          >
            Search trips
          </Link>
        </section>

        <section className="mt-4 rounded-[24px] bg-[rgb(var(--foreground))] p-4 text-[rgb(var(--background))] shadow-[var(--shadow-md)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold opacity-70">Upcoming request</div>
              <div className="mt-1 text-lg font-extrabold">Nukus to Urgench</div>
              <div className="text-sm font-medium opacity-75">Tomorrow, 08:30</div>
            </div>
            <span className="rounded-full bg-[rgb(var(--warning-soft))] px-3 py-1.5 text-xs font-extrabold text-[rgb(var(--warning))]">
              Pending driver
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs font-semibold opacity-80">
            <Icon name="shield" className="h-4 w-4" />
            Contact unlocks after driver confirmation
          </div>
        </section>

        <section className="mt-5">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="m-0 text-lg font-extrabold">Recommended rides</h2>
              <p className="m-0 text-sm font-medium text-[rgb(var(--text-muted))]">
                Verified drivers near your route
              </p>
            </div>
            <Link
              href="/search"
              className="flex items-center gap-1 text-sm font-extrabold text-[rgb(var(--primary))] no-underline"
            >
              See all
              <Icon name="chevron" className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-3">
            {rides.map((ride) => (
              <RideCard key={ride.id} ride={ride} />
            ))}
          </div>
        </section>

        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="m-0 text-lg font-extrabold">Popular routes</h2>
            <Icon name="car" className="h-5 w-5 text-[rgb(var(--primary))]" />
          </div>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {recentRoutes.map((route) => (
              <Link
                key={route}
                href="/search"
                className="min-w-[150px] rounded-[22px] bg-[rgb(var(--surface))] p-3 text-[rgb(var(--foreground))] no-underline shadow-[var(--shadow-sm)]"
              >
                <span className="block text-sm font-extrabold">{route}</span>
                <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[rgb(var(--text-muted))]">
                  <Icon name="clock" className="h-3.5 w-3.5" />4 rides today
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <nav className="fixed inset-x-4 bottom-4 z-[var(--z-nav)] mx-auto max-w-[398px] rounded-full bg-[rgb(var(--surface)/0.94)] p-1.5 shadow-[var(--shadow-floating)] backdrop-blur-xl">
        <div className="grid grid-cols-4 gap-1">
          {[
            { label: "Home", icon: "home" as const, active: true, href: "/" },
            { label: "Trips", icon: "car" as const, active: false, href: "/bookings" },
            { label: "Messages", icon: "message" as const, active: false, href: "/messages" },
            { label: "Profile", icon: "user" as const, active: false, href: "/profile" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={[
                "grid min-h-[54px] place-items-center rounded-full px-2 text-[11px] font-bold no-underline",
                item.active
                  ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] shadow-[var(--shadow-sm)]"
                  : "text-[rgb(var(--text-muted))]",
              ].join(" ")}
            >
              <Icon name={item.icon} className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
