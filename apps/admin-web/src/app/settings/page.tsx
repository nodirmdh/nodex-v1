import { AdminPageHeader, AdminPanel } from "../admin-shell";
import { Breadcrumbs, DetailGrid, Status } from "../admin-components";

export default function SettingsPage() {
  return <main className="admin-main"><Breadcrumbs items={[{ label: "Admin", href: "/dashboard" }, { label: "Settings" }]} /><AdminPageHeader title="Settings" subtitle="Preview environment, roles and operational toggles." /><div className="grid gap-4 lg:grid-cols-2"><AdminPanel className="p-4"><h2 className="m-0 mb-3 text-base font-black">Environment</h2><DetailGrid items={[["Admin preview", <Status key="s" value="Active" />], ["API base", "nodex-api-preview.example.invalid"], ["Mode", "Demo data fallback"]]} /></AdminPanel><AdminPanel className="p-4"><h2 className="m-0 mb-3 text-base font-black">Access</h2><DetailGrid items={[["Role", "Admin Mock"], ["Audit", "Preview visible"], ["Danger actions", "Disabled until API"]]} /></AdminPanel></div></main>;
}