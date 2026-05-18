import { redirect } from "next/navigation";

/** Ruta legada: el asistente vive en el widget global; ajustes en /settings/asistente */
export default function AsistenteLegacyPage() {
  redirect("/settings/asistente");
}
