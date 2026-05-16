import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { InvoicePdfData } from "@/lib/invoice-pdf/types";
import { formatDateEs, formatMoneyPdf, formatQtyPdf } from "@/lib/invoice-pdf/format";
import { VerifactuPdfFooter } from "@/lib/invoice-pdf/verifactu-pdf-footer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#18181b",
  },
  title: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#52525b",
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 24,
    marginBottom: 20,
  },
  col: {
    flex: 1,
  },
  label: {
    fontSize: 8,
    color: "#71717a",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#d4d4d8",
    paddingBottom: 4,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e4e4e7",
  },
  colDesc: { flex: 3 },
  colQty: { width: 44, textAlign: "right" },
  colUnit: { width: 56, textAlign: "right" },
  colRate: { width: 36, textAlign: "right" },
  colNet: { width: 56, textAlign: "right" },
  colTax: { width: 52, textAlign: "right" },
  colTotal: { width: 58, textAlign: "right" },
  totalsBox: {
    marginTop: 12,
    marginLeft: "auto",
    width: 220,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
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
  vatSection: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: "#e4e4e7",
  },
  warn: {
    fontSize: 8,
    color: "#b45309",
    marginTop: 8,
  },
});

export function InvoicePdfClassicDocument({ data }: { data: InvoicePdfData }) {
  return (
    <Document title={`Factura ${data.numberLabel}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>FACTURA</Text>
        <Text style={styles.subtitle}>{data.numberLabel}</Text>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>Emisor</Text>
            {data.issuer ? (
              <>
                <Text style={styles.bold}>{data.issuer.legal_name}</Text>
                <Text>NIF: {data.issuer.tax_id}</Text>
                <Text>{data.issuer.address}</Text>
              </>
            ) : (
              <Text style={styles.warn}>
                Completa los datos fiscales del emisor en Ajustes → Datos fiscales.
              </Text>
            )}
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Cliente</Text>
            <Text style={styles.bold}>{data.client.name}</Text>
            {data.client.tax_id ? <Text>NIF: {data.client.tax_id}</Text> : null}
            {data.client.address ? <Text>{data.client.address}</Text> : null}
          </View>
          <View style={[styles.col, { flex: 0.7 }]}>
            <Text style={styles.label}>Fechas</Text>
            <Text>Emisión: {formatDateEs(data.issue_date)}</Text>
            {data.due_date ? (
              <Text>Vencimiento: {formatDateEs(data.due_date)}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>Concepto</Text>
          <Text style={styles.colQty}>Cant.</Text>
          <Text style={styles.colUnit}>P. unit.</Text>
          <Text style={styles.colRate}>IVA %</Text>
          <Text style={styles.colNet}>Base</Text>
          <Text style={styles.colTax}>Cuota</Text>
          <Text style={styles.colTotal}>Total</Text>
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
            <Text key={v.tax_rate} style={{ marginBottom: 2 }}>
              IVA {v.tax_rate}%: base {formatMoneyPdf(v.base)} · cuota{" "}
              {formatMoneyPdf(v.tax)}
            </Text>
          ))}
        </View>

        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text>Base imponible</Text>
            <Text>{formatMoneyPdf(data.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>IVA</Text>
            <Text>{formatMoneyPdf(data.tax_amount)}</Text>
          </View>
          <View style={styles.totalGrand}>
            <Text>Total</Text>
            <Text>{formatMoneyPdf(data.total)}</Text>
          </View>
        </View>

        <VerifactuPdfFooter data={data} />
      </Page>
    </Document>
  );
}
