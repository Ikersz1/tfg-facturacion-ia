export type StoredChatEntry = {
  id: string;
  role: "user" | "assistant";
  text: string;
  links?: { label: string; href: string }[];
};

const STORAGE_KEY = "tfg-assistant-chat-v1";
const MAX_ENTRIES = 40;

export function loadAssistantChatHistory(): StoredChatEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredChatEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e) =>
          e &&
          typeof e.id === "string" &&
          (e.role === "user" || e.role === "assistant") &&
          typeof e.text === "string",
      )
      .slice(-MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function saveAssistantChatHistory(entries: StoredChatEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    /* quota or private mode */
  }
}

export function clearAssistantChatHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
