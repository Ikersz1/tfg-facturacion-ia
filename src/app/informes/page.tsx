import { InformesExportLink } from "@/components/informes-export-link";
import { InformesView } from "@/components/informes-view";
import { PageHeader } from "@/components/page-header";
import { buildReportsQueryString, getReportsData } from "@/lib/reports-data";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InformesPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const data = await getReportsData(sp);
  const exportHref = `/api/informes/export?${buildReportsQueryString(data.filters)}`;

  return (
    <div className="flex w-full flex-1 flex-col">
      <PageHeader eyebrow="Análisis" title="Informes" actions={<InformesExportLink href={exportHref} />} />
      <InformesView data={data} />
    </div>
  );
}
