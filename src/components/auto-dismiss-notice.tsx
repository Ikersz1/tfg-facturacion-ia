"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  message: string;
  tone?: "success" | "warning" | "error";
  durationMs?: number;
};

const toneClass: Record<NonNullable<Props["tone"]>, string> = {
  success:
    "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100",
  warning:
    "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
  error: "bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-100",
};

export function AutoDismissNotice({
  message,
  tone = "success",
  durationMs = 3500,
}: Props) {
  const [visible, setVisible] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!visible) return;
    const timeout = window.setTimeout(() => {
      setVisible(false);
      const params = new URLSearchParams(searchParams.toString());
      if (params.has("notice")) {
        params.delete("notice");
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      }
    }, durationMs);
    return () => window.clearTimeout(timeout);
  }, [visible, durationMs, pathname, router, searchParams]);

  if (!visible) return null;

  return (
    <p className={`mb-4 rounded-md px-4 py-3 text-sm ${toneClass[tone]}`} role="status">
      {message}
    </p>
  );
}
