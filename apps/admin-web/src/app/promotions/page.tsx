import { AdminPageHeader, AdminPanel } from "../admin-shell";
import { Breadcrumbs } from "../admin-components";

export default function PromotionsPage() {
  return <main className="admin-main"><Breadcrumbs items={[{ label: "Admin", href: "/dashboard" }, { label: "Promotions" }]} /><AdminPageHeader title="Promotions" subtitle="Navigation placeholder. Campaign business logic is not implemented in this preview." /><AdminPanel className="p-6"><h2 className="m-0 text-lg font-black">Promotions foundation</h2><p className="max-w-[720px] text-sm font-semibold text-[rgb(var(--text-muted))]">This section is intentionally a placeholder so navigation is complete without fake campaign actions. Connect it when promotions backend foundations exist.</p><button className="mt-3 min-h-10 rounded-[10px] border border-[rgb(var(--border))] px-3 text-sm font-black opacity-60" disabled type="button">Create promotion unavailable in preview</button></AdminPanel></main>;
}