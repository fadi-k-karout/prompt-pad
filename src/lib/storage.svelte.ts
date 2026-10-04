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
  loadError = $state<string | null>(null);
  count = $derived(this.prompts.length);

  private queue: Promise<void> = Promise.resolve();
  private watching = false;

  constructor() {
    void this.reload();
  }

  /**
   * Reads storage. Runs once on startup and again to retry a failed read.
   *
   * `isLoaded` flips only when a read actually succeeded: an empty list standing
   * in for a failed one would render as "no prompts yet", and the first save
   * would then overwrite the key and drop everything that was really there.
   */
  async reload(): Promise<void> {
    this.loadError = null;
    try {
      const result = (await chrome.storage.local.get(
        PROMPTS_KEY,
      )) as Partial<StorageSchema>;
      this.prompts = Array.isArray(result.prompts)
        ? result.prompts.map(normalize)
        : [];
      this.isLoaded = true;
    } catch (err) {
      console.error("Failed to load prompts from storage: ", err);
      this.isLoaded = false;
      this.loadError =
        err instanceof Error ? err.message : "Could not read saved prompts.";
    }

    // Another context (the options page, a second tab) writes the same key, so
    // the widget follows along without needing a reload. Registered after the
    // read, once only, so that a retry cannot stack duplicate listeners.
    if (this.watching) return;
    this.watching = true;
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== "local" || !changes[PROMPTS_KEY]) return;
      const next = changes[PROMPTS_KEY].newValue;
      this.prompts = Array.isArray(next) ? next.map(normalize) : [];
    });
  }

  /**
   * Runs each mutation start to finish -- computing `next`, writing it, rolling
   * it back -- before the next one begins.
   *
   * `next` is built inside the step, from the list as it stands at that moment,
   * so two rapid calls cannot read each other's stale state and clobber one
   * write with the other. `previous` is likewise a real point-in-time copy:
   * every mutation below replaces the array instead of editing it in place. The
   * rollback only restores a list the write was actually built from, which is
   * what keeps a failed write from resurrecting a prompt that never landed.
   */
  private enqueue(build: (current: Prompt[]) => Prompt[]): Promise<void> {
    const run = this.queue.then(async () => {
      const previous = this.prompts;
      const next = build(previous);
      // An update or delete for a prompt that is gone changes nothing, and a
      // write of the unchanged list would only echo back through onChanged.
      if (next === previous) return;
      this.prompts = next;
      try {
        await chrome.storage.local.set({ [PROMPTS_KEY]: next });
      } catch (err) {
        this.prompts = previous;
        throw err;
      }
    });
    // The chain keeps flowing past a rejection; only the caller's copy fails, so
    // the next save still runs instead of inheriting the earlier error.
    this.queue = run.then(
      () => {},
      () => {},
    );
    return run;
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
    await this.enqueue((current) => [prompt, ...current]);
    return prompt;
  }

  async update(
    id: string,
    updates: Partial<PromptDraft>,
  ): Promise<Prompt | undefined> {
    let saved: Prompt | undefined;
    await this.enqueue((current) => {
      const existing = current.find((prompt) => prompt.id === id);
      if (!existing) return current;
      const updated: Prompt = {
        ...existing,
        ...updates,
        updatedAt: Date.now(),
      };
      saved = updated;
      return current.map((prompt) => (prompt.id === id ? updated : prompt));
    });
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.enqueue((current) =>
      current.some((prompt) => prompt.id === id)
        ? current.filter((prompt) => prompt.id !== id)
        : current,
    );
  }
}

export const promptStore = new PromptStorage();
