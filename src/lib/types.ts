export interface Prompt {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

/** The subset of a Prompt the UI is allowed to set; the store owns identity and timestamps. */
export type PromptDraft = Omit<Prompt, "id" | "createdAt" | "updatedAt">;

export interface StorageSchema {
  prompts: Prompt[];
}
