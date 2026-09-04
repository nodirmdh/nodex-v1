"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "../admin-shell";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

type VehicleStatus = "Submitted" | "In review" | "Changes requested" | "Approved" | "Suspended";

type VehicleRow = {
  id: string;
  vehicle: string;
  plate: string;
  driver: string;
  region: string;
  seats: string;
  documents: string;
  status: VehicleStatus;
  priority: string;
  updated: string;
  photos: string[];
  timeline: Array<{ label: string; time: string }>;
};

const vehicles: VehicleRow[] = [
  {
    id: "vehicle-cobalt",
    vehicle: "Chevrolet Cobalt",
    plate: "95 A 184 AA",
    driver: "Azizbek Karimov",
    region: "Nukus",
    seats: "4 пассажирских места",
    documents: "Проверено 3 из 3",
    status: "In review",
    priority: "Нужно повторно проверить номер и фото салона",
    updated: "11:42 UTC",
    photos: ["Автомобиль спереди", "Автомобиль сзади", "Салон", "Госномер крупным планом"],
    timeline: [
      { label: "Автомобиль отправлен", time: "09:18" },
      { label: "Водитель уже одобрен", time: "09:21" },
      { label: "Документы сверены с госномером", time: "10:04" },
      { label: "Фото салона ожидает проверки", time: "11:42" },
    ],
  },
  {
    id: "vehicle-tracker",
    vehicle: "Chevrolet Tracker",
    plate: "95 B 442 BA",
    driver: "Madina Yusupova",
    region: "Urgench",
    seats: "3 пассажирских места",
    documents: "Проверено 3 из 3",
    status: "Approved",
    priority: "Готов к публикации поездок",
    updated: "10:15 UTC",
    photos: ["Автомобиль спереди", "Автомобиль сзади", "Салон", "Страховой полис"],
    timeline: [
      { label: "Автомобиль отправлен", time: "08:10" },
      { label: "Регистрация проверена", time: "08:44" },
      { label: "Одобрено оператором", time: "10:15" },
    ],
  },
  {
    id: "vehicle-k5",
    vehicle: "Kia K5",
    plate: "01 K 731 KA",
    driver: "Sherzod Rakhimov",
    region: "Tashkent",
    seats: "4 пассажирских места",
    documents: "Проверено 2 из 3",
    status: "Changes requested",
    priority: "Страховой документ не читается",
    updated: "09:58 UTC",
    photos: ["Автомобиль спереди", "Салон", "Госномер крупным планом"],
    timeline: [
      { label: "Автомобиль отправлен", time: "07:40" },
      { label: "Фото страхового полиса не прошло проверку", time: "09:58" },
      { label: "Запрос на исправление подготовлен", time: "10:01" },
    ],
  },
];

const vehicleStatusLabels: Record<VehicleStatus, string> = {
  Submitted: "Отправлено",
  "In review": "На проверке",
  "Changes requested": "Нужны исправления",
  Approved: "Одобрено",
  Suspended: "Приостановлено",
};
function statusTone(status: VehicleStatus): BadgeTone {
  if (status === "Approved") return "success";
  if (status === "Suspended") return "danger";
  if (status === "Changes requested" || status === "In review") return "warning";
  return "info";
}

export default function AdminVehiclesPage() {
  const [reviewMode, setReviewMode] = useState(false);
  const [selectedId, setSelectedId] = useState(vehicles[0]!.id);
  const selected = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedId) ?? vehicles[0]!,
    [selectedId],
  );

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("review") === "1") {
      setReviewMode(true);
      setSelectedId("vehicle-k5");
    }
  }, []);

  return (
    <main className="p-5">
      <AdminPageHeader
        title="Проверка автомобилей"
        subtitle="Документы, фотографии салона, число мест и допуск автомобиля к публикации поездок."
        actions={
          <>
            <button className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black">
              Экспорт списка
            </button>
            <button className="rounded-[10px] bg-[rgb(var(--primary))] px-3 py-2 text-sm font-black text-[rgb(var(--primary-foreground))]">
              Проверить следующий
            </button>
          </>
        }
      />

      <div className="grid gap-4 min-[1380px]:grid-cols-[minmax(0,1fr)_460px]">
        <AdminPanel className="overflow-hidden" label="Очередь проверки автомобилей">
          <div className="grid gap-3 border-b border-[rgb(var(--border))] p-4 lg:grid-cols-[1fr_auto]">
            <div className="flex flex-wrap gap-2">
              {[
                ["На проверке", "1"],
                ["Одобрено", "1"],
                ["Исправления", "1"],
                ["Среднее время", "18 мин"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-[112px] rounded-[12px] bg-[rgb(var(--surface-muted))] p-3"
                >
                  <div className="text-lg font-black">{value}</div>
                  <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">{label}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-start gap-2">
              <input
                className="min-h-10 w-[260px] rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm outline-none"
                placeholder="Номер, водитель или город"
              />
              <select className="min-h-10 rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm">
                <option>Все статусы</option>
                <option>На проверке</option>
                <option>Нужны исправления</option>
                <option>Одобрено</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] font-black uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Автомобиль</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Водитель</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Места</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Документы</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Статус</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Обновлено</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((vehicle) => (
                  <tr
                    key={vehicle.id}
                    aria-selected={selected.id === vehicle.id}
                    className={[
                      "cursor-pointer border-b border-[rgb(var(--border))] transition hover:bg-[rgb(var(--surface-muted))]",
                      selected.id === vehicle.id
                        ? "bg-[rgb(var(--info-soft))]"
                        : "bg-[rgb(var(--surface))]",
                    ].join(" ")}
                    onClick={() => setSelectedId(vehicle.id)}
                  >
                    <td className="px-4 py-3">
                      <strong>{vehicle.vehicle}</strong>
                      <span className="block text-xs font-semibold text-[rgb(var(--text-muted))]">
                        {vehicle.plate} · {vehicle.region}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{vehicle.driver}</td>
                    <td className="px-4 py-3">{vehicle.seats}</td>
                    <td className="px-4 py-3">{vehicle.documents}</td>
                    <td className="px-4 py-3">
                      <AdminStatusBadge tone={statusTone(vehicle.status)}>
                        {vehicleStatusLabels[vehicle.status]}
                      </AdminStatusBadge>
                    </td>
                    <td className="px-4 py-3 text-[rgb(var(--text-muted))]">{vehicle.updated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <AdminPanel className="overflow-hidden" label="Карточка автомобиля">
          <div className="border-b border-[rgb(var(--border))] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-xl font-black">{selected.vehicle}</h2>
                <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                  {selected.plate} · {selected.driver}
                </p>
              </div>
              <AdminStatusBadge tone={statusTone(selected.status)}>
                {vehicleStatusLabels[selected.status]}
              </AdminStatusBadge>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div className="rounded-[10px] bg-[rgb(var(--surface-muted))] p-3">
                <strong>{selected.region}</strong>
                <span className="block text-xs text-[rgb(var(--text-muted))]">Город работы</span>
              </div>
              <div className="rounded-[10px] bg-[rgb(var(--surface-muted))] p-3">
                <strong>{selected.seats.split(" ")[0]}</strong>
                <span className="block text-xs text-[rgb(var(--text-muted))]">Места</span>
              </div>
              <div className="rounded-[10px] bg-[rgb(var(--surface-muted))] p-3">
                <strong>Одобрен</strong>
                <span className="block text-xs text-[rgb(var(--text-muted))]">Водитель</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <section className="sticky bottom-0 rounded-[12px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3 shadow-[var(--shadow-xs)]">
              <h3 className="m-0 mb-2 text-sm font-black">Документы</h3>
              <div className="grid gap-2">
                {["Свидетельство о регистрации", "Страховой полис", "Технический осмотр"].map(
                  (item) => (
                    <div
                      key={item}
                      className="flex min-h-11 items-center justify-between rounded-[10px] border border-[rgb(var(--border))] px-3 text-sm"
                    >
                      <span>{item}</span>
                      <AdminStatusBadge
                        tone={
                          item === "Страховой полис" && selected.id === "vehicle-k5"
                            ? "warning"
                            : "success"
                        }
                      >
                        {item === "Страховой полис" && selected.id === "vehicle-k5"
                          ? "Нужно заменить"
                          : "Проверено"}
                      </AdminStatusBadge>
                    </div>
                  ),
                )}
              </div>
            </section>

            <section>
              <h3 className="m-0 mb-2 text-sm font-black">Фотографии</h3>
              <div className="grid grid-cols-2 gap-2">
                {selected.photos.map((photo) => (
                  <div
                    key={photo}
                    className="min-h-20 rounded-[12px] border border-[rgb(var(--border))] bg-[linear-gradient(135deg,rgb(var(--surface-muted)),rgb(var(--surface)))] p-3 text-sm font-bold"
                  >
                    {photo}
                    <span className="mt-5 block text-xs font-semibold text-[rgb(var(--text-muted))]">
                      Фото для проверки
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="m-0 mb-2 text-sm font-black">Решение</h3>
              <div className="grid gap-2">
                <textarea
                  className="min-h-20 rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] p-3 text-sm outline-none"
                  defaultValue={
                    reviewMode
                      ? "Фото страхового полиса размыто. Запросите читаемую замену перед одобрением."
                      : ""
                  }
                  placeholder="Укажите причину одобрения, исправления, отклонения или приостановки."
                />
                <div className="grid grid-cols-2 gap-2">
                  <button className="rounded-[10px] bg-[rgb(var(--primary))] px-3 py-2 text-sm font-black text-[rgb(var(--primary-foreground))]">
                    Одобрить
                  </button>
                  <button className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black">
                    Запросить исправление
                  </button>
                  <button className="rounded-[10px] border border-[rgb(var(--warning))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black text-[rgb(var(--warning))]">
                    Отклонить
                  </button>
                  <button className="rounded-[10px] border border-[rgb(var(--destructive))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black text-[rgb(var(--destructive))]">
                    Приостановить
                  </button>
                </div>
              </div>
            </section>

            <section>
              <h3 className="m-0 mb-2 text-sm font-black">История проверки</h3>
              <div className="grid gap-2">
                {selected.timeline.map((event) => (
                  <div
                    key={`${event.time}-${event.label}`}
                    className="grid grid-cols-[48px_1fr] gap-3 text-sm"
                  >
                    <span className="font-black text-[rgb(var(--text-muted))]">{event.time}</span>
                    <span>{event.label}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </AdminPanel>
      </div>
    </main>
  );
}
