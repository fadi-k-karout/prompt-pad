/**
 * A template split into literal text and `{variable}` slots.
 *
 * The preview and the saved prompt are built from the same parse, so the text
 * a user reads while filling the form cannot drift from what gets stored.
 */
export type Segment =
  | { kind: "text"; value: string }
  | { kind: "var"; name: string; value: string; filled: boolean };

/**
 * Substitutes `values` into `template` in a single pass.
 *
 * Single pass is the whole point. Values are read, never re-scanned, so a value
 * that itself contains `{input}` is inserted literally instead of resolving
 * into another variable's slot. Two sequential replacements would corrupt such
 * a value, and looping "until no slots remain" would never terminate.
 *
 * Values are trimmed on read rather than in the form, so the preview and the
 * stored text cannot disagree about what a field contains.
 */
export function renderSegments(
  template: string,
  values: Record<string, string>,
): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;

  for (const match of template.matchAll(/\{([a-z_][a-z0-9_]*)\}/g)) {
    const index = match.index;
    if (index > cursor) {
      segments.push({ kind: "text", value: template.slice(cursor, index) });
    }
    const name = match[1];
    const value = (values[name] ?? "").trim();
    segments.push({ kind: "var", name, value, filled: value.length > 0 });
    cursor = index + match[0].length;
  }

  if (cursor < template.length) {
    segments.push({ kind: "text", value: template.slice(cursor) });
  }

  return segments;
}

/** Flattens segments back into the finished prompt text. */
export function segmentsToText(segments: Segment[]): string {
  return segments.map((segment) => segment.value).join("");
}

/**
 * The variables left unfilled, deduplicated.
 *
 * A slot repeated in the template produces one segment per occurrence, so
 * `guardrail`'s two `{domain}` slots would otherwise report the name twice.
 */
export function findMissingVariables(segments: Segment[]): string[] {
  const missing = new Set<string>();
  for (const segment of segments) {
    if (segment.kind === "var" && !segment.filled) missing.add(segment.name);
  }
  return [...missing];
}

/**
 * `{token}` shapes still present in already-rendered text.
 *
 * Rendering consumes every slot in the template, so nothing here can be a real
 * one. What it catches is a value pasted with braces intact, which would
 * otherwise reach a model as literal `{examples}` with nothing to explain it.
 */
export function findLeftoverTokens(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(/\{([a-z_][a-z0-9_]*)\}/g)) {
    found.add(match[1]);
  }
  return [...found];
}
