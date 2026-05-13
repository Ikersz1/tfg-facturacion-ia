export type CatalogKind = "product" | "service";

export function parseCatalogKind(v: string | undefined | null): CatalogKind {
  return v === "service" ? "service" : "product";
}

export function catalogKindLabel(kind: CatalogKind): string {
  return kind === "service" ? "Servicio" : "Producto";
}

export function catalogKindLabelPlural(kind: CatalogKind): string {
  return kind === "service" ? "Servicios" : "Productos";
}
