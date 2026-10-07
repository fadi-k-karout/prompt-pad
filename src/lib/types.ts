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

/**
 * The pill's free-docked position, all in CSS pixels.
 *
 * The viewport size it was captured against travels with the coordinates
 * because they mean nothing on their own: a rect parked at x=1800 on a 2560px
 * monitor hangs off the edge of a 1280px window. On load the rect is used
 * where it still fits and clamped back into view where it does not, so the pill
 * lands where the user left it without needing a corner-anchored model to stay
 * sane across screens.
 */
export interface WidgetPosition {
  x: number;
  y: number;
  /** Size of the pill at capture time, so the rect can be clamped on resize without a DOM read. */
  w: number;
  h: number;
  vw: number;
  vh: number;
}

export interface StorageSchema {
  prompts: Prompt[];
  widgetPosition: WidgetPosition;
}
