"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { AdminPanel, AdminStatusBadge } from "./admin-shell";
import { toneFor } from "./admin-data";

export type Column<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
};

const statusLabels: Record<string, string> = {
  "All statuses": "Все статусы",
  Active: "Активно",
  Accepted: "Принято",
  Approved: "Одобрено",
  Boarding: "Посадка",
  Blocked: "Заблокировано",
  Cancelled: "Отменено",
  Closed: "Закрыто",
  Clear: "Чисто",
  Completed: "Завершено",
  Disabled: "Выключено",
  Enabled: "Включено",
  Expired: "Истекло",
  High: "Высокий",
  Hold: "На удержании",
  "In Progress": "В работе",
  Low: "Низкий",
  Matched: "Найдено",
  Medium: "Средний",
  "Needs action": "Нужно действие",
  Normal: "Обычный",
  Offline: "Офлайн",
  Open: "Открыто",
  Pending: "Ожидает",
  "Pending driver": "Ожидает водителя",
  Qualified: "Подтверждено",
  Ready: "Готово",
  Rejected: "Отклонено",
  Requested: "Запрошено",
  Resolved: "Решено",
  Restricted: "Ограничен",
  Review: "Проверка",
  Scheduled: "Запланировано",
  Urgent: "Срочно",
  Used: "Использован",
  Watch: "Под наблюдением",
  Yes: "Да",
  No: "Нет",
};

function visibleStatus(value: string) {
  return statusLabels[value] ?? value;
}

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav className="mb-3 flex flex-wrap items-center gap-1 text-xs font-semibold text-[rgb(var(--text-muted))]" aria-label="Breadcrumbs">
      {items.map((item, index) => (
        <span className="flex items-center gap-1" key={`${item.label}-${index}`}>
          {index > 0 ? <span>/</span> : null}
          {item.href ? (
            <Link className="text-[rgb(var(--primary))] no-underline hover:underline" href={item.href}>
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function Toolbar({
  query,
  onQuery,
  filters,
  activeFilter,
  onFilter,
  placeholder,
  count,
}: {
  query: string;
  onQuery: (value: string) => void;
  filters: string[];
  activeFilter: string;
  onFilter: (value: string) => void;
  placeholder: string;
  count: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          aria-label="Поиск по таблице"
          className="min-h-10 w-[min(360px,72vw)] rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm outline-none focus:border-[rgb(var(--primary))]"
          onChange={(event) => onQuery(event.target.value)}
          placeholder={placeholder}
          value={query}
        />
        <select
          aria-label="Фильтр таблицы"
          className="min-h-10 rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-sm font-semibold text-[rgb(var(--foreground))]"
          onChange={(event) => onFilter(event.target.value)}
          value={activeFilter}
        >
          {filters.map((filter) => (
            <option key={filter} value={filter}>{visibleStatus(filter)}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <AdminStatusBadge tone="info">{count} записей</AdminStatusBadge>
        <button className="min-h-10 rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm font-semibold hover:bg-[rgb(var(--surface-muted))]" type="button">
          Экспорт
        </button>
      </div>
    </div>
  );
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  hrefFor,
  empty = "По текущим фильтрам ничего не найдено.",
}: {
  rows: T[];
  columns: Array<Column<T>>;
  hrefFor: (row: T) => string;
  empty?: string;
}) {
  const [sortKey, setSortKey] = useState(columns[0]?.key ?? "");
  const [page, setPage] = useState(1);
  const sortedRows = useMemo(() => {
    const column = columns.find((item) => item.key === sortKey);
    if (!column?.sortValue) return rows;
    return [...rows].sort((a, b) => String(column.sortValue?.(a)).localeCompare(String(column.sortValue?.(b))));
  }, [columns, rows, sortKey]);
  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <>
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-[rgb(var(--canvas))]">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="border-b border-[rgb(var(--border))] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-[rgb(var(--text-muted))]">
                  <button className="font-bold uppercase tracking-[0.06em] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--foreground))]" onClick={() => setSortKey(column.key)} type="button">
                    {column.label}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr key={row.id} className="group border-b border-[rgb(var(--border))] hover:bg-[rgb(var(--surface-muted))]">
                {columns.map((column, index) => (
                  <td key={`${row.id}-${column.key}`} className="truncate px-4 py-3 align-middle">
                    <Link className="block min-h-8 text-[rgb(var(--foreground))] no-underline" href={hrefFor(row)}>
                      {column.render(row)}
                      {index === columns.length - 1 ? <span className="sr-only">Открыть детали</span> : null}
                    </Link>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageRows.length === 0 ? <div className="p-6 text-sm font-semibold text-[rgb(var(--text-muted))]">{empty}</div> : null}
      <div className="flex items-center justify-between border-t border-[rgb(var(--border))] px-4 py-3 text-sm">
        <span className="font-semibold text-[rgb(var(--text-muted))]">Страница {safePage} из {totalPages}</span>
        <div className="flex gap-2">
          <button className="min-h-9 rounded-[8px] border border-[rgb(var(--border))] px-3 font-semibold disabled:opacity-45" disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">Назад</button>
          <button className="min-h-9 rounded-[8px] border border-[rgb(var(--border))] px-3 font-semibold disabled:opacity-45" disabled={safePage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} type="button">Вперёд</button>
        </div>
      </div>
    </>
  );
}

export function Status({ value }: { value: string }) {
  return <AdminStatusBadge tone={toneFor(value)}>{visibleStatus(value)}</AdminStatusBadge>;
}

export function DetailGrid({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <div className="grid gap-2">
      {items.map(([label, value]) => (
        <div className="grid grid-cols-[150px_1fr] gap-3 text-sm" key={label}>
          <span className="text-[rgb(var(--text-muted))]">{label}</span>
          <strong className="min-w-0 text-right">{value}</strong>
        </div>
      ))}
    </div>
  );
}

export function Tabs({ tabs }: { tabs: Array<{ label: string; content: ReactNode }> }) {
  const [active, setActive] = useState(tabs[0]?.label ?? "");
  const current = tabs.find((tab) => tab.label === active) ?? tabs[0];
  return (
    <AdminPanel className="overflow-hidden">
      <div className="flex gap-1 overflow-x-auto border-b border-[rgb(var(--border))] p-2">
        {tabs.map((tab) => (
          <button
            className={`min-h-9 rounded-[8px] px-3 text-sm font-semibold ${tab.label === active ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--surface-muted))]"}`}
            key={tab.label}
            onClick={() => setActive(tab.label)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-4">{current?.content}</div>
    </AdminPanel>
  );
}

export function QuickActionModal({
  label,
  title,
  children,
  action = "Подтвердить",
}: {
  label: string;
  title: string;
  children: ReactNode;
  action?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="min-h-9 rounded-[8px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm font-semibold hover:bg-[rgb(var(--surface-muted))]" onClick={() => setOpen(true)} type="button">
        {label}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/36 p-4" role="dialog" aria-modal="true" aria-label={title}>
          <div className="w-full max-w-[520px] rounded-[12px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-[var(--shadow-lg)]">
            <div className="flex items-start justify-between gap-3">
              <h2 className="m-0 text-xl font-black">{title}</h2>
              <button aria-label="Закрыть окно" className="grid h-8 w-8 place-items-center rounded-[8px] border border-[rgb(var(--border))]" onClick={() => setOpen(false)} type="button"><X size={16} /></button>
            </div>
            <div className="mt-3 text-sm text-[rgb(var(--text-muted))]">{children}</div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="min-h-9 rounded-[8px] border border-[rgb(var(--border))] px-3 text-sm font-semibold" onClick={() => setOpen(false)} type="button">Отмена</button>
              <button className="min-h-9 rounded-[8px] bg-[rgb(var(--primary))] px-3 text-sm font-semibold text-[rgb(var(--primary-foreground))]" onClick={() => setOpen(false)} type="button">{action}</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function LinkedValue({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="font-black text-[rgb(var(--primary))] no-underline hover:underline" href={href}>{children}</Link>;
}
