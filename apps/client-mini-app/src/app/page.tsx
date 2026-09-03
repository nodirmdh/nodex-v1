"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ClientBottomNav, Icon } from "./client-ui";

type PickerKey = "from" | "to" | "date" | "passengers";
type Mode = "trip" | "parcel" | "repeat";

const cities = ["Nukus", "Urgench", "Khiva", "Kungrad"];
const dates = [
  { label: "Сегодня", value: "today" },
  { label: "Завтра", value: "tomorrow" },
  { label: "Выходные", value: "weekend" },
];
const passengerOptions = [
  { label: "1 пассажир", value: "1" },
  { label: "2 пассажира", value: "2" },
  { label: "3 пассажира", value: "3" },
  { label: "4 пассажира", value: "4" },
];

function Picker({ id, label, value, options, open, onOpen, onSelect }: { id: PickerKey; label: string; value: string; options: Array<{ label: string; value: string }>; open: PickerKey | null; onOpen: (id: PickerKey | null) => void; onSelect: (value: string) => void; }) {
  const selected = options.find((option) => option.value === value)?.label ?? value;
  const expanded = open === id;
  return (
    <div className="relative">
      <button aria-expanded={expanded} className="flex min-h-[60px] w-full items-center justify-between gap-3 rounded-[18px] bg-[rgb(var(--canvas))] px-4 text-left shadow-[inset_0_0_0_1px_rgb(var(--border)/0.65)]" type="button" onClick={() => onOpen(expanded ? null : id)}>
        <span className="min-w-0"><span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-subtle))]">{label}</span><span className="mt-0.5 block truncate text-[18px] font-semibold text-[rgb(var(--foreground))]">{selected}</span></span>
        <span className="text-lg text-[rgb(var(--text-muted))]">⌄</span>
      </button>
      {expanded ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 rounded-[20px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-1.5 shadow-[var(--shadow-floating)]">
          {options.map((option) => (
            <button key={option.value} className={["flex min-h-10 w-full items-center justify-between rounded-[15px] px-3 text-left text-sm font-semibold", option.value === value ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "text-[rgb(var(--foreground))]"].join(" ")} type="button" onClick={() => { onSelect(option.value); onOpen(null); }}>
              {option.label}{option.value === value ? "✓" : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function HomePage() {
  const [from, setFrom] = useState("Nukus");
  const [to, setTo] = useState("Urgench");
  const [date, setDate] = useState("tomorrow");
  const [passengers, setPassengers] = useState("2");
  const [mode, setMode] = useState<Mode>("trip");
  const [openPicker, setOpenPicker] = useState<PickerKey | null>(null);

  const searchHref = useMemo(() => {
    if (mode === "parcel") return "/parcels";
    const repeat = mode === "repeat" ? "&repeat=last" : "";
    return `/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${date}&passengers=${passengers}${repeat}`;
  }, [date, from, mode, passengers, to]);

  return (
    <main className="min-h-screen bg-[rgb(var(--background))] text-[rgb(var(--foreground))]">
      <div className="mx-auto min-h-screen max-w-[430px] bg-[linear-gradient(180deg,rgb(var(--surface-tint))_0%,rgb(var(--background))_24%,rgb(var(--canvas))_100%)] px-5 pb-24 pt-5">
        <header className="flex items-center justify-between gap-3">
          <div><div className="text-sm font-semibold text-[rgb(var(--primary))]">ENVO</div><h1 className="m-0 mt-1 text-[28px] font-semibold leading-tight">Куда едем?</h1></div>
          <div className="flex gap-2"><Link aria-label="Уведомления" className="grid h-11 w-11 place-items-center rounded-full bg-[rgb(var(--surface)/0.9)] text-[rgb(var(--foreground))] shadow-[var(--shadow-xs)]" href="/notifications"><Icon name="bell" /></Link><Link aria-label="Профиль" className="grid h-11 w-11 place-items-center rounded-full bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] shadow-[var(--shadow-sm)]" href="/profile"><Icon name="profile" /></Link></div>
        </header>

        <section className="mt-7 rounded-[26px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-md)]" aria-label="Поиск поездки">
          <div className="grid gap-3">
            <Picker id="from" label="Откуда" open={openPicker} options={cities.map((city) => ({ label: city, value: city }))} value={from} onOpen={setOpenPicker} onSelect={setFrom} />
            <div className="relative"><Picker id="to" label="Куда" open={openPicker} options={cities.map((city) => ({ label: city, value: city }))} value={to} onOpen={setOpenPicker} onSelect={setTo} /><button aria-label="Поменять направление" className="absolute right-3 top-[-22px] grid h-10 w-10 place-items-center rounded-full bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))] shadow-[var(--shadow-md)]" type="button" onClick={() => { setFrom(to); setTo(from); setOpenPicker(null); }}>⇅</button></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2"><Picker id="date" label="Дата" open={openPicker} options={dates} value={date} onOpen={setOpenPicker} onSelect={setDate} /><Picker id="passengers" label="Пассажиры" open={openPicker} options={passengerOptions} value={passengers} onOpen={setOpenPicker} onSelect={setPassengers} /></div>
          <Link href={searchHref} className="mt-4 flex min-h-[54px] items-center justify-center rounded-[18px] bg-[rgb(var(--primary))] text-base font-semibold text-[rgb(var(--primary-foreground))] no-underline shadow-[var(--shadow-sm)]">{mode === "parcel" ? "Отправить посылку" : "Найти поездку"}</Link>
        </section>

        <section className="mt-4 grid grid-cols-3 gap-2" aria-label="Режим">
          {[["trip", "Поездка"], ["parcel", "Посылка"], ["repeat", "Повторить"]].map(([key, label]) => <button key={key} className={["min-h-11 rounded-full px-3 text-sm font-semibold", mode === key ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "bg-[rgb(var(--surface))] text-[rgb(var(--text-muted))]"].join(" ")} type="button" onClick={() => setMode(key as Mode)}>{label}</button>)}
        </section>

        <section className="mt-7 rounded-[22px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-sm)]" aria-label="Ближайшая поездка">
          <div className="flex items-start justify-between gap-3"><div><p className="m-0 text-sm font-medium text-[rgb(var(--text-muted))]">Ближайшая поездка</p><h2 className="m-0 mt-1 text-xl font-semibold">Nukus → Urgench</h2><p className="m-0 mt-1 text-sm text-[rgb(var(--text-muted))]">Завтра · 08:30 · водитель подтверждён</p></div><Link className="rounded-full bg-[rgb(var(--surface-tint))] px-4 py-2 text-sm font-semibold text-[rgb(var(--primary))] no-underline" href="/bookings/phase6-booking-confirmed?state=active">Открыть</Link></div>
        </section>

        <section className="mt-5 rounded-[22px] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-sm)]" aria-label="Быстрые действия">
          <p className="m-0 text-sm font-medium text-[rgb(var(--text-muted))]">Сохранённые маршруты, любимые водители, награды, безопасность и поддержка теперь собраны в профиле.</p>
          <div className="mt-3 grid grid-cols-2 gap-2"><Link className="flex min-h-11 items-center justify-center rounded-[16px] bg-[rgb(var(--canvas))] px-3 text-sm font-semibold text-[rgb(var(--foreground))] no-underline" href="/search?from=Nukus&to=Urgench&repeat=last">Повторить</Link><Link className="flex min-h-11 items-center justify-center rounded-[16px] bg-[rgb(var(--canvas))] px-3 text-sm font-semibold text-[rgb(var(--foreground))] no-underline" href="/profile">Все функции</Link></div>
        </section>
      </div>
      <ClientBottomNav active="home" />
    </main>
  );
}