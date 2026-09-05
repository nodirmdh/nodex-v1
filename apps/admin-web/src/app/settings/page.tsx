import { AdminPageHeader, AdminPanel } from "../admin-shell";
import { Breadcrumbs, DetailGrid, Status } from "../admin-components";

export default function SettingsPage() {
  return <main className="admin-main"><Breadcrumbs items={[{ label: "Админ", href: "/dashboard" }, { label: "Настройки" }]} /><AdminPageHeader title="Настройки" subtitle="Роли, доступ и операционные параметры." /><div className="grid gap-4 lg:grid-cols-2"><AdminPanel className="p-4"><h2 className="m-0 mb-3 text-base font-black">Среда</h2><DetailGrid items={[["Панель оператора", <Status key="s" value="Active" />], ["Источник данных", "Сохранённые данные"], ["Режим", "Просмотр"]]} /></AdminPanel><AdminPanel className="p-4"><h2 className="m-0 mb-3 text-base font-black">Доступ</h2><DetailGrid items={[["Роль", "Оператор"], ["Аудит", "Доступен"], ["Критические действия", "Недоступны"]]} /></AdminPanel></div></main>;
}