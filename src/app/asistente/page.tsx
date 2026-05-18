import { AssistantPanel } from "@/components/assistant-panel";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default function AsistentePage() {
  return (
    <div className="flex w-full flex-1 flex-col">
      <PageHeader
        eyebrow="IA"
        title="Asistente"
        description="Pregunta sobre clientes, facturas y cobros. Los datos se consultan en tu cuenta; al proveedor de IA solo llegan resúmenes agregados."
      />
      <AssistantPanel />
    </div>
  );
}
