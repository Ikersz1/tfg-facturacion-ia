"use client";

import type { ReactNode } from "react";
import { openAssistantWidget } from "@/components/assistant-widget";

export function OpenAssistantButton({
  children,
  className,
  question,
  source,
}: {
  children: ReactNode;
  className?: string;
  question?: string;
  source?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => openAssistantWidget({ question, source })}
    >
      {children}
    </button>
  );
}
