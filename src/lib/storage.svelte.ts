import type { Prompt, PromptDraft, StorageSchema } from "./types";
import { parseTags } from "./format";

const PROMPTS_KEY = "prompts";

/**
 * Coerces whatever storage holds into a real string[].
 *
 * A plain `?? []` is not enough: it only catches null/undefined, so a `tags: ""`
 * already sitting in storage reaches the composer, calls `.join()` on a string
 * and throws. A string is read as the comma-separated form the composer's tag
 * field uses, so those entries stay editable instead of breaking the card.
 */
function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((tag): tag is string => typeof tag === "string");
  }
  if (typeof value === "string") return parseTags(value);
  return [];
}

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toTimestamp(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalize(raw: unknown): Prompt {
  // Storage is not type-checked at runtime, so treat the entry as untrusted
  // rather than as the Prompt the old signature claimed.
  const r = (raw ?? {}) as Record<string, unknown>;
  // Entries can be hand-edited or simply incomplete, so every field is checked
  // rather than assumed -- this is the only boundary where data the extension did
  // not write enters the app.
  const createdAt = toTimestamp(r.createdAt, 0);
  return {
    // The list renders through a keyed each, which throws on duplicate keys, so
    // an entry with no usable id gets a synthetic one rather than colliding with
    // every other id-less entry.
    id: toText(r.id) || crypto.randomUUID(),
    title: toText(r.title),
    content: toText(r.content),
    tags: normalizeTags(r.tags),
    createdAt,
    updatedAt: toTimestamp(r.updatedAt, createdAt),
  };
}

class PromptStorage {
  prompts = $state<Prompt[]>([]);
  isLoaded = $state(false);
  count = $derived(this.prompts.length);

  constructor() {
    this.init();
  }

  private async init() {
    try {
      const result = (await chrome.storage.local.get(
        PROMPTS_KEY,
      )) as Partial<StorageSchema>;
      this.prompts = Array.isArray(result.prompts)
        ? result.prompts.map(normalize)
        : [];
    } catch (err) {
      console.error("Failed to load prompts from storage: ", err);
      this.prompts = [];
    } finally {
      this.isLoaded = true;
    }

    // Another context (the options page, a second tab) writes the same key, so
    // the widget follows along without needing a reload.
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== "local" || !changes[PROMPTS_KEY]) return;
      const next = changes[PROMPTS_KEY].newValue;
      this.prompts = Array.isArray(next) ? next.map(normalize) : [];
    });
  }

  /**
   * Assign before writing so the list reflects the click on the same tick, and
   * restore the snapshot if the write fails. Every mutation below replaces the
   * array rather than editing it in place, which is what makes the snapshot a
   * real point-in-time copy -- and what keeps two rapid calls from reading each
   * other's stale state and clobbering one write with the other.
   */
  private async persist(next: Prompt[]): Promise<void> {
    const previous = this.prompts;
    this.prompts = next;
    try {
      await chrome.storage.local.set({ [PROMPTS_KEY]: next });
    } catch (err) {
      this.prompts = previous;
      throw err;
    }
  }

  getById(id: string): Prompt | undefined {
    return this.prompts.find((prompt) => prompt.id === id);
  }

  async add(data: PromptDraft): Promise<Prompt> {
    const now = Date.now();
    const prompt: Prompt = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    await this.persist([prompt, ...this.prompts]);
    return prompt;
  }

  async update(
    id: string,
    updates: Partial<PromptDraft>,
  ): Promise<Prompt | undefined> {
    const existing = this.prompts.find((prompt) => prompt.id === id);
    if (!existing) return undefined;
    const saved: Prompt = { ...existing, ...updates, updatedAt: Date.now() };
    await this.persist(
      this.prompts.map((prompt) => (prompt.id === id ? saved : prompt)),
    );
    return saved;
  }

  async remove(id: string): Promise<void> {
    if (!this.prompts.some((prompt) => prompt.id === id)) return;
    await this.persist(this.prompts.filter((prompt) => prompt.id !== id));
  }
}

export const promptStore = new PromptStorage();
