import { AssistantSettingsPanel } from "@/components/assistant-settings-panel";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

export default function AssistantSettingsPage() {
  const openAiEnabled = Boolean(process.env.OPENAI_API_KEY?.trim());

  return (
    <div className="flex w-full flex-1 flex-col">
      <PageHeader
        back={{ href: "/", ariaLabel: "Volver al inicio" }}
        eyebrow="Cuenta"
        title="Asistente IA"
        description="Copilot de consultas sobre facturación. Configuración, privacidad y acceso al chat flotante."
      />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6">
        <AssistantSettingsPanel openAiEnabled={openAiEnabled} />
      </div>
    </div>
  );
}
