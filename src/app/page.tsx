import { HomeDashboard } from "@/components/home-dashboard";
import { PageHeader } from "@/components/page-header";
import { getDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getDashboardData();

  return (
    <div className="flex w-full flex-1 flex-col">
      <PageHeader eyebrow="TFG — Facturación con IA" title="Inicio" />
      <HomeDashboard data={data} />
    </div>
  );
}
