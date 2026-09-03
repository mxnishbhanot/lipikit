/** ~4 characters per token for Latin scripts; good enough to size a window. */
const CHARS_PER_TOKEN = 4;

export const estimateTokens = (text: string): number => Math.ceil(text.length / CHARS_PER_TOKEN);

/**
 * Trims from the middle, not the end: the start and the tail of a selection
 * carry the intent, and cutting only the end loses the sentence being fixed.
 */
export function fitToBudget(text: string, maxTokens: number): string {
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  if (text.length <= maxChars) return text;
  const marker = '\n\n[...trimmed...]\n\n';
  const keep = Math.max(0, maxChars - marker.length);
  const head = Math.ceil(keep * 0.6);
  const tail = keep - head;
  return `${text.slice(0, head)}${marker}${tail > 0 ? text.slice(-tail) : ''}`;
}
