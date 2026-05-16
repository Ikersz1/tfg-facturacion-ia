import { createClient } from "@/lib/supabase/server";
import { requireAuthUserId } from "@/lib/supabase/require-auth-user";
import { verifactuGetStatus } from "@/lib/verifacti/client";
import { parseVerifactuStatusResponse } from "@/lib/verifacti/parse-status-response";
import { syncVerifactuStatusForInvoice } from "@/lib/verifacti/sync-invoice-status";
import { redirect } from "next/navigation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function fallbackVerifyUrl(uuid: string): string {
  return `https://www.verifacti.com/?uuid=${encodeURIComponent(uuid)}`;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();
  const auth = await requireAuthUserId(supabase);
  if ("error" in auth) {
    return new Response(auth.error, { status: 401 });
  }

  const { data: inv, error } = await supabase
    .from("invoices")
    .select("id, user_id, verifacti_uuid")
    .eq("id", id)
    .single();
  if (error || !inv) {
    return new Response("Factura no encontrada.", { status: 404 });
  }
  if (inv.user_id !== auth.userId) {
    return new Response("No autorizado.", { status: 403 });
  }

  const uuid = (inv.verifacti_uuid as string | null)?.trim();
  if (!uuid) {
    return new Response("Factura sin UUID de Verifacti.", { status: 400 });
  }

  await syncVerifactuStatusForInvoice(supabase, id, "user");

  const statusRes = await verifactuGetStatus(uuid);
  if (statusRes.ok) {
    const parsed = parseVerifactuStatusResponse(statusRes.json);
    const url = (parsed.verificationUrl ?? "").trim();
    if (/^https?:\/\//i.test(url)) {
      redirect(url);
    }
  }

  redirect(fallbackVerifyUrl(uuid));
}
