import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { InvoicePdfData } from "@/lib/invoice-pdf/types";
import { verifactiQrDataUrl } from "@/lib/invoice-pdf/qr-data-url";

const styles = StyleSheet.create({
  footer: {
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 16,
  },
  verifactu: {
    fontSize: 8,
    color: "#3f3f46",
    maxWidth: 280,
  },
  qr: {
    width: 96,
    height: 96,
  },
});

export function VerifactuPdfFooter({ data }: { data: InvoicePdfData }) {
  const qrSrc = data.verifacti_qr_base64
    ? verifactiQrDataUrl(data.verifacti_qr_base64)
    : null;
  const showVerifactuLegend = Boolean(data.verifacti_uuid);

  if (!showVerifactuLegend && !qrSrc) return null;

  return (
    <View style={styles.footer}>
      <View>
        {showVerifactuLegend ? (
          <Text style={styles.verifactu}>
            Factura verificable en la sede electrónica de la AEAT
          </Text>
        ) : null}
      </View>
      {qrSrc ? <Image src={qrSrc} style={styles.qr} /> : null}
    </View>
  );
}
