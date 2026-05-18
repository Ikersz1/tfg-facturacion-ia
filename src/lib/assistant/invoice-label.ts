export function invoiceNumberLabel(input: {
  status: string;
  series: string;
  year: number;
  number: number | null;
}): string {
  if (input.status === "draft" || input.number == null) {
    return `Borrador · serie ${input.series} · ${input.year}`;
  }
  return `${input.series}-${input.year}/${input.number}`;
}
