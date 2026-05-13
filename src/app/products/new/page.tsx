import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProductsNewRedirect({ searchParams }: PageProps) {
  const sp = await searchParams;
  const k = typeof sp.kind === "string" && sp.kind === "service" ? "service" : "product";
  redirect(`/catalogo/new?kind=${k}`);
}
