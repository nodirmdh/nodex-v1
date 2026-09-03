import { AdminPageHeader } from "../admin-shell";
import { TripsListRealData } from "../admin-real-data";

export default function TripsPage() {
  return <main className="admin-main"><AdminPageHeader title="Поездки" subtitle="Поездки, места, автомобиль, водитель и ETA в одном рабочем списке." /><TripsListRealData /></main>;
}