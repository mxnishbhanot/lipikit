import { REPLY_STYLES, type HistoryEntry, type ReplyAnalysis, type ReplyStyle } from '@ai-anywhere/shared';
import type { CommandDescriptor } from './commands.js';

/** How many stored interactions are replayed as conversation memory. */
export const MEMORY_LIMIT = 20;
/** Per-field cap when replaying memory, so 20 long rewrites cannot blow the context window. */
const MEMORY_FIELD_CHARS = 400;

/** One line of guidance per style, in the same spirit as TONE_HINTS. */
export const REPLY_STYLE_HINTS: Record<ReplyStyle, string> = {
  professional: 'professional and neutral: complete sentences, no slang, no exclamation marks',
  friendly: 'warm and conversational, while still precise',
  technical: 'precise and technical: name the components and behaviours involved, assume a technical reader',
  empathetic: "acknowledging the client's frustration first, then addressing the substance",
  support: 'a support-desk voice: short, structured, and explicit about what is needed from the client',
  executive: 'brief and executive: outcome first, three sentences at most, no implementation detail',
};

/**
 * The style picker is a list of ordinary commands, so the popup's existing
 * run / retry / history path covers client replies with no second code path.
 */
export const REPLY_COMMANDS: readonly CommandDescriptor[] = REPLY_STYLES.map((style) => ({
  id: `reply:${style}`,
  label: style.charAt(0).toUpperCase() + style.slice(1),
  group: 'Communication',
  action: 'client-reply',
  replyStyle: style,
}));

const EMPTY_ANALYSIS: ReplyAnalysis = { questions: [], urgency: null, sentiment: null, categories: [] };

const SEPARATOR = /^\s*---\s*$/m;

const oneOf = <T extends string>(value: string, allowed: readonly T[]): T | null =>
  (allowed as readonly string[]).includes(value) ? (value as T) : null;

const split = (value: string, separator: string): readonly string[] =>
  value
    .split(separator)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part.toLowerCase() !== 'none');

/**
 * Pulls the ANALYSIS block off the front of the model's answer.
 *
 * Deliberately forgiving: a model that ignores the format, or an answer that
 * is still streaming and has not reached the separator yet, yields empty
 * analysis and the whole text as the reply. Losing the chips is acceptable;
 * losing the reply is not.
 */
export function parseReply(raw: string): { readonly analysis: ReplyAnalysis; readonly reply: string } {
  const match = SEPARATOR.exec(raw);
  if (!match || !/^\s*ANALYSIS\b/i.test(raw)) {
    return { analysis: EMPTY_ANALYSIS, reply: raw.trim() };
  }
  const head = raw.slice(0, match.index);
  const reply = raw.slice(match.index + match[0].length).trim();

  const field = (name: string): string => {
    const found = new RegExp(`^\\s*${name}\\s*:\\s*(.*)$`, 'im').exec(head);
    return found?.[1]?.trim() ?? '';
  };

  return {
    analysis: {
      questions: split(field('questions'), '|'),
      urgency: oneOf(field('urgency').toLowerCase(), ['low', 'medium', 'high'] as const),
      sentiment: oneOf(field('sentiment').toLowerCase(), ['positive', 'neutral', 'negative'] as const),
      categories: split(field('categories'), ','),
    },
    reply,
  };
}

const clip = (value: string): string =>
  value.length <= MEMORY_FIELD_CHARS ? value : `${value.slice(0, MEMORY_FIELD_CHARS)}…`;

/**
 * Renders stored interactions as conversation memory for the `{{memory}}`
 * variable. `entries` arrives newest-first (that is how history lists), and
 * comes back oldest-first so the model reads it as a transcript.
 *
 * Returns '' for an empty list, so the template can interpolate it
 * unconditionally without leaving a dangling heading.
 */
export function formatMemory(entries: readonly HistoryEntry[]): string {
  const recent = entries.slice(0, MEMORY_LIMIT).reverse();
  if (recent.length === 0) return '';
  // Stored client replies still carry their ANALYSIS block; only the reply
  // itself is conversation, so the header never gets replayed as context.
  const lines = recent.map(
    (entry) => `- them: ${clip(entry.input)}\n  us: ${clip(parseReply(entry.output).reply)}`,
  );
  return `Earlier in this conversation (oldest first), for context only — do not repeat it:\n${lines.join('\n')}\n\n`;
}
