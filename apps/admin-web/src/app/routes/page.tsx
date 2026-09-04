"use client";

import { useMemo, useState } from "react";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "../admin-shell";

type RouteRow = {
  id: string;
  name: string;
  corridor: string;
  distance: string;
  duration: string;
  pickupPoints: string[];
  activeTrips: number;
  pendingRequests: number;
  parcelLoad: string;
  status: "Active" | "Paused";
  attention: string;
};

const routes: RouteRow[] = [
  {
    id: "nukus-urgench",
    name: "Nukus → Urgench",
    corridor: "Karakalpakstan · Khorezm",
    distance: "170 км",
    duration: "3 ч 05 мин",
    pickupPoints: ["Центральный вокзал Nukus", "Поворот на Turtkul", "Железнодорожный вокзал Urgench"],
    activeTrips: 18,
    pendingRequests: 42,
    parcelLoad: "Высокая",
    status: "Active",
    attention: "Предложение стабильное, следите за вечерним ростом заявок",
  },
  {
    id: "nukus-khiva",
    name: "Nukus → Khiva",
    corridor: "Karakalpakstan · Khorezm",
    distance: "190 км",
    duration: "3 ч 30 мин",
    pickupPoints: ["Центральный вокзал Nukus", "Рынок Beruniy", "Северные ворота Khiva"],
    activeTrips: 9,
    pendingRequests: 16,
    parcelLoad: "Средняя",
    status: "Active",
    attention: "Нужно уточнить координаты одной точки посадки",
  },
  {
    id: "tashkent-samarkand",
    name: "Tashkent → Samarkand",
    corridor: "Tashkent · Samarkand",
    distance: "305 км",
    duration: "4 ч 20 мин",
    pickupPoints: ["Автовокзал Tashkent", "Контрольная точка Jizzakh", "Стоянка Registan в Samarkand"],
    activeTrips: 12,
    pendingRequests: 28,
    parcelLoad: "Средняя",
    status: "Active",
    attention: "Предложение на выходные сбалансировано",
  },
];

export default function AdminRoutesPage() {
  const [selectedId, setSelectedId] = useState(routes[0]!.id);
  const selected = useMemo(
    () => routes.find((route) => route.id === selectedId) ?? routes[0]!,
    [selectedId],
  );

  return (
    <main className="p-5">
      <AdminPageHeader
        title="Маршруты"
        subtitle="Междугородние направления, точки посадки и состояние маршрутов."
        actions={
          <>
            <button className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black">
              Добавить точку посадки
            </button>
            <button className="rounded-[10px] bg-[rgb(var(--primary))] px-3 py-2 text-sm font-black text-[rgb(var(--primary-foreground))]">
              Создать маршрут
            </button>
          </>
        }
      />

      <div className="grid gap-4 min-[1380px]:grid-cols-[minmax(0,1fr)_450px]">
        <AdminPanel className="overflow-hidden" label="Список маршрутов">
          <div className="grid gap-3 border-b border-[rgb(var(--border))] p-4 lg:grid-cols-[1fr_auto]">
            <div className="flex flex-wrap gap-2">
              {[
                ["Активные маршруты", "39"],
                ["Текущие поездки", "124"],
                ["Точки посадки", "116"],
                ["Требуют внимания", "2"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-[118px] rounded-[12px] bg-[rgb(var(--surface-muted))] p-3"
                >
                  <div className="text-lg font-black">{value}</div>
                  <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">{label}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                className="min-h-10 w-[240px] rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm outline-none"
                placeholder="Город или направление"
              />
              <select className="min-h-10 rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm">
                <option>Все регионы</option>
                <option>Karakalpakstan</option>
                <option>Khorezm</option>
                <option>Tashkent</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] font-black uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Маршрут</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Расстояние</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Поездки</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Заявки</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Посылки</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Статус</th>
                </tr>
              </thead>
              <tbody>
                {routes.map((route) => (
                  <tr
                    key={route.id}
                    className={[
                      "cursor-pointer border-b border-[rgb(var(--border))] transition hover:bg-[rgb(var(--surface-muted))]",
                      selected.id === route.id ? "bg-[rgb(var(--info-soft))]" : "",
                    ].join(" ")}
                    onClick={() => setSelectedId(route.id)}
                  >
                    <td className="px-4 py-3">
                      <strong>{route.name}</strong>
                      <span className="block text-xs font-semibold text-[rgb(var(--text-muted))]">
                        {route.corridor}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {route.distance}
                      <span className="block text-xs text-[rgb(var(--text-muted))]">
                        {route.duration}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-black">{route.activeTrips}</td>
                    <td className="px-4 py-3 font-black">{route.pendingRequests}</td>
                    <td className="px-4 py-3">{route.parcelLoad}</td>
                    <td className="px-4 py-3">
                      <AdminStatusBadge tone={route.status === "Active" ? "success" : "warning"}>
                        {route.status === "Active" ? "Активен" : "Приостановлен"}
                      </AdminStatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>

        <AdminPanel className="overflow-hidden" label="Карточка маршрута">
          <div className="border-b border-[rgb(var(--border))] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="m-0 text-xl font-black">{selected.name}</h2>
                <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                  {selected.corridor}
                </p>
              </div>
              <AdminStatusBadge tone="success">{selected.status === "Active" ? "Активен" : "Приостановлен"}</AdminStatusBadge>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <section>
              <h3 className="m-0 mb-2 text-sm font-black">Текущая нагрузка</h3>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-[10px] bg-[rgb(var(--surface-muted))] p-3">
                  <strong>{selected.activeTrips}</strong>
                  <span className="block text-xs text-[rgb(var(--text-muted))]">Активные поездки</span>
                </div>
                <div className="rounded-[10px] bg-[rgb(var(--surface-muted))] p-3">
                  <strong>{selected.pendingRequests}</strong>
                  <span className="block text-xs text-[rgb(var(--text-muted))]">Заявки на места</span>
                </div>
                <div className="rounded-[10px] bg-[rgb(var(--surface-muted))] p-3">
                  <strong>{selected.parcelLoad}</strong>
                  <span className="block text-xs text-[rgb(var(--text-muted))]">Нагрузка посылками</span>
                </div>
              </div>
            </section>

            <section>
              <h3 className="m-0 mb-2 text-sm font-black">Точки посадки</h3>
              <div className="mb-3 rounded-[12px] bg-[rgb(var(--surface-muted))] p-3">
                <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2 text-xs font-black">
                  <span>{selected.name.split(" → ")[0]}</span>
                  <span className="h-1 rounded-full bg-[rgb(var(--primary))]" />
                  <span>посадка</span>
                  <span className="h-1 rounded-full bg-[rgb(var(--primary))]" />
                  <span>{selected.name.split(" → ")[1]}</span>
                </div>
                <div className="mt-2 flex justify-between text-xs font-semibold text-[rgb(var(--text-muted))]">
                  <span>{selected.activeTrips} поездок</span>
                  <span>{selected.pendingRequests} заявок</span>
                </div>
              </div>
              <div className="grid gap-2">
                {selected.pickupPoints.map((point, index) => (
                  <div
                    key={point}
                    className="grid grid-cols-[28px_1fr_auto] items-center gap-3 rounded-[10px] border border-[rgb(var(--border))] px-3 py-2 text-sm"
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-[rgb(var(--surface-muted))] text-xs font-black">
                      {index + 1}
                    </span>
                    <span className="font-semibold">{point}</span>
                    <AdminStatusBadge tone="success">Активна</AdminStatusBadge>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="m-0 mb-2 text-sm font-black">Управление маршрутом</h3>
              <div className="grid grid-cols-2 gap-2">
                <button className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black">
                  Изменить маршрут
                </button>
                <button className="rounded-[10px] border border-[rgb(var(--warning))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black text-[rgb(var(--warning))]">
                  Приостановить маршрут
                </button>
              </div>
            </section>
          </div>
        </AdminPanel>
      </div>
    </main>
  );
}
