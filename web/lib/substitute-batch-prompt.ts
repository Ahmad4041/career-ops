/** Naive substitution for batch-prompt placeholders (batch-runner uses sed). */
export function substituteBatchPrompt(template: string, values: Record<string, string>): string {
  let out = template;
  for (const [key, raw] of Object.entries(values)) {
    out = out.split(`{{${key}}}`).join(raw);
  }
  return out;
}
