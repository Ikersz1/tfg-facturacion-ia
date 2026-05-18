import type { PendingPaymentSession } from "@/lib/assistant/types";

export type StoredChatEntry = {
  id: string;
  role: "user" | "assistant";
  text: string;
  links?: { label: string; href: string }[];
};

export type AssistantChatSnapshot = {
  history: StoredChatEntry[];
  pendingPayment?: PendingPaymentSession | null;
};

const STORAGE_KEY = "tfg-assistant-chat-v2";
const MAX_ENTRIES = 40;

export function loadAssistantChatSnapshot(): AssistantChatSnapshot {
  if (typeof window === "undefined") return { history: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { history: [] };
    const parsed = JSON.parse(raw) as AssistantChatSnapshot | StoredChatEntry[];
    if (Array.isArray(parsed)) {
      return { history: sanitizeHistory(parsed) };
    }
    return {
      history: sanitizeHistory(parsed.history ?? []),
      pendingPayment: parsed.pendingPayment ?? null,
    };
  } catch {
    return { history: [] };
  }
}

function sanitizeHistory(entries: StoredChatEntry[]): StoredChatEntry[] {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter(
      (e) =>
        e &&
        typeof e.id === "string" &&
        (e.role === "user" || e.role === "assistant") &&
        typeof e.text === "string",
    )
    .slice(-MAX_ENTRIES);
}

export function saveAssistantChatSnapshot(snapshot: AssistantChatSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        history: sanitizeHistory(snapshot.history),
        pendingPayment: snapshot.pendingPayment ?? null,
      }),
    );
  } catch {
    /* quota or private mode */
  }
}

export function clearAssistantChatHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("tfg-assistant-chat-v1");
  } catch {
    /* ignore */
  }
}

/** @deprecated use loadAssistantChatSnapshot */
export function loadAssistantChatHistory(): StoredChatEntry[] {
  return loadAssistantChatSnapshot().history;
}

/** @deprecated use saveAssistantChatSnapshot */
export function saveAssistantChatHistory(entries: StoredChatEntry[]): void {
  saveAssistantChatSnapshot({ history: entries });
}
