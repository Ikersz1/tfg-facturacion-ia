import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { InvoicePdfData } from "@/lib/invoice-pdf/types";
import { formatDateEs, formatMoneyPdf, formatQtyPdf } from "@/lib/invoice-pdf/format";
import { VerifactuPdfFooter } from "@/lib/invoice-pdf/verifactu-pdf-footer";

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#18181b",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#27272a",
  },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
  },
  numBlock: {
    alignItems: "flex-end",
  },
  numLabel: {
    fontSize: 7,
    color: "#71717a",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  numValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  dates: {
    fontSize: 8,
    color: "#3f3f46",
    marginTop: 4,
  },
  pairRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 14,
  },
  box: {
    flex: 1,
    padding: 10,
    backgroundColor: "#fafafa",
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  label: {
    fontSize: 7,
    color: "#71717a",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  bold: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
  small: {
    fontSize: 8,
    marginTop: 2,
    color: "#3f3f46",
  },
  warn: {
    fontSize: 8,
    color: "#b45309",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#27272a",
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontSize: 7,
  },
  th: {
    color: "#fafafa",
    fontFamily: "Helvetica-Bold",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e4e4e7",
  },
  colDesc: { flex: 3 },
  colQty: { width: 40, textAlign: "right" },
  colUnit: { width: 52, textAlign: "right" },
  colRate: { width: 32, textAlign: "right" },
  colNet: { width: 52, textAlign: "right" },
  colTax: { width: 48, textAlign: "right" },
  colTotal: { width: 54, textAlign: "right" },
  vatSection: {
    marginTop: 8,
    paddingTop: 6,
  },
  vatLine: {
    fontSize: 7,
    color: "#52525b",
    marginBottom: 2,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
    gap: 12,
  },
  totalsCard: {
    width: 200,
    borderWidth: 1,
    borderColor: "#18181b",
    padding: 10,
  },
  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    fontSize: 8,
  },
  totalGrand: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#18181b",
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
});

export function InvoicePdfCompactDocument({ data }: { data: InvoicePdfData }) {
  return (
    <Document title={`Factura ${data.numberLabel}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.title}>FACTURA</Text>
            <Text style={styles.dates}>
              Emisión {formatDateEs(data.issue_date)}
              {data.due_date ? ` · Venc. ${formatDateEs(data.due_date)}` : ""}
            </Text>
          </View>
          <View style={styles.numBlock}>
            <Text style={styles.numLabel}>Número</Text>
            <Text style={styles.numValue}>{data.numberLabel}</Text>
          </View>
        </View>

        <View style={styles.pairRow}>
          <View style={styles.box}>
            <Text style={styles.label}>Emisor</Text>
            {data.issuer ? (
              <>
                <Text style={styles.bold}>{data.issuer.legal_name}</Text>
                <Text style={styles.small}>NIF {data.issuer.tax_id}</Text>
                <Text style={styles.small}>{data.issuer.address}</Text>
              </>
            ) : (
              <Text style={styles.warn}>
                Completa datos fiscales del emisor en Ajustes → Datos fiscales.
              </Text>
            )}
          </View>
          <View style={styles.box}>
            <Text style={styles.label}>Cliente</Text>
            <Text style={styles.bold}>{data.client.name}</Text>
            {data.client.tax_id ? (
              <Text style={styles.small}>NIF {data.client.tax_id}</Text>
            ) : null}
            {data.client.address ? (
              <Text style={styles.small}>{data.client.address}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={[styles.colDesc, styles.th]}>Concepto</Text>
          <Text style={[styles.colQty, styles.th]}>Cant.</Text>
          <Text style={[styles.colUnit, styles.th]}>P. unit.</Text>
          <Text style={[styles.colRate, styles.th]}>IVA</Text>
          <Text style={[styles.colNet, styles.th]}>Base</Text>
          <Text style={[styles.colTax, styles.th]}>Cuota</Text>
          <Text style={[styles.colTotal, styles.th]}>Total</Text>
        </View>

        {data.lines.map((line) => (
          <View key={line.line_number} style={styles.tableRow}>
            <Text style={styles.colDesc}>{line.description}</Text>
            <Text style={styles.colQty}>{formatQtyPdf(line.quantity)}</Text>
            <Text style={styles.colUnit}>{formatMoneyPdf(line.unit_price)}</Text>
            <Text style={styles.colRate}>{line.tax_rate}%</Text>
            <Text style={styles.colNet}>{formatMoneyPdf(line.line_net)}</Text>
            <Text style={styles.colTax}>{formatMoneyPdf(line.line_tax)}</Text>
            <Text style={styles.colTotal}>{formatMoneyPdf(line.line_total)}</Text>
          </View>
        ))}

        <View style={styles.vatSection}>
          {data.vatRows.map((v) => (
            <Text key={v.tax_rate} style={styles.vatLine}>
              IVA {v.tax_rate}% · base {formatMoneyPdf(v.base)} · cuota{" "}
              {formatMoneyPdf(v.tax)}
            </Text>
          ))}
        </View>

        <View style={styles.totalsRow}>
          <View style={styles.totalsCard}>
            <View style={styles.totalLine}>
              <Text>Base imponible</Text>
              <Text>{formatMoneyPdf(data.subtotal)}</Text>
            </View>
            <View style={styles.totalLine}>
              <Text>IVA</Text>
              <Text>{formatMoneyPdf(data.tax_amount)}</Text>
            </View>
            <View style={styles.totalGrand}>
              <Text>Total</Text>
              <Text>{formatMoneyPdf(data.total)}</Text>
            </View>
          </View>
        </View>

        <VerifactuPdfFooter data={data} />
      </Page>
    </Document>
  );
}
