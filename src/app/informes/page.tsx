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
  const baseQs = buildReportsQueryString(data.filters);
  const exportSummaryHref = `/api/informes/export?${baseQs}`;
  const exportLinesHref = `/api/informes/export?${baseQs}&type=lines`;

  return (
    <div className="flex w-full flex-1 flex-col">
      <PageHeader
        eyebrow="Análisis"
        title="Informes"
        actions={<InformesExportLink summaryHref={exportSummaryHref} linesHref={exportLinesHref} />}
      />
      <InformesView data={data} />
    </div>
  );
}
