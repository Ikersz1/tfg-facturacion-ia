export type ClientKind = "company" | "individual";

export function parseClientKind(v: string | undefined | null): ClientKind {
  return v === "individual" ? "individual" : "company";
}

export function clientKindLabel(kind: ClientKind): string {
  return kind === "individual" ? "Particular" : "Empresa";
}

export function clientKindLabelPlural(kind: ClientKind): string {
  return kind === "individual" ? "Particulares" : "Empresas";
}

export function clientNameLabel(kind: ClientKind): string {
  return kind === "individual" ? "Nombre y apellidos" : "Razón social";
}

export function clientTaxIdLabel(kind: ClientKind): string {
  return kind === "individual" ? "DNI / NIE" : "CIF";
}

export function clientNamePlaceholder(kind: ClientKind): string {
  return kind === "individual"
    ? "Ej. María García López"
    : "Ej. Acme Soluciones S.L.";
}

export function clientTaxIdPlaceholder(kind: ClientKind): string {
  return kind === "individual" ? "12345678Z" : "B12345678";
}
