import type { ActionId, ReplyStyle, Tone } from '@lipikit/shared';

export type CommandGroup = 'Developer' | 'Communication' | 'Writing' | 'Productivity';

/**
 * Display order of the groups in the popup; also the tab order of sections.
 *
 * Grouped by the workflow a command belongs to rather than by the machinery
 * behind it: 'Translation' was one command in a section of its own, and 'AI'
 * described how every row here works rather than what any of them do. The
 * order leads with Developer because that is who the palette is aimed at.
 *
 * Only the *display* order lives here. `COMMANDS` keeps catalog order, which
 * is what breaks search-rank ties.
 */
export const COMMAND_GROUPS: readonly CommandGroup[] = [
  'Developer',
  'Communication',
  'Writing',
  'Productivity',
];

/**
 * A user-facing command is a label plus the arguments the generic AI action
 * needs. It is deliberately *not* a new `ActionId`: "Jira Comment" and
 * "Release Notes" are two different instructions to the same `custom`
 * template, and minting an action per label would mean a prompt template, a
 * union member and a history migration for every phrase we think of.
 */
export interface CommandDescriptor {
  readonly id: string;
  readonly label: string;
  readonly group: CommandGroup;
  readonly action: ActionId;
  readonly tone?: Tone;
  /** Voice for a `client-reply` command; meaningless for any other action. */
  readonly replyStyle?: ReplyStyle;
  /** Instruction text for the `custom` / `translate` templates. */
  readonly instruction?: string;
  /**
   * When set, the popup asks for one line of text first and appends it to
   * `instruction`. Used by the commands that cannot be answered from the
   * selection alone: which language, which question.
   */
  readonly inputPlaceholder?: string;
  /** Extra search terms, so "pr" finds "PR Description" and "grammar" finds "Fix Grammar". */
  readonly keywords?: readonly string[];
}

export const COMMANDS: readonly CommandDescriptor[] = [
  // Writing
  {
    id: 'fix-grammar',
    label: 'Fix Grammar',
    group: 'Writing',
    action: 'fix-grammar',
    keywords: ['spelling', 'typo', 'punctuation', 'proofread'],
  },
  {
    id: 'improve-english',
    label: 'Improve English',
    group: 'Writing',
    action: 'improve',
    keywords: ['clarity', 'polish', 'flow'],
  },
  {
    id: 'professional',
    label: 'Professional',
    group: 'Writing',
    action: 'rewrite',
    tone: 'formal',
    keywords: ['formal', 'business', 'tone'],
  },
  {
    id: 'friendly',
    label: 'Friendly',
    group: 'Writing',
    action: 'rewrite',
    tone: 'friendly',
    keywords: ['warm', 'casual', 'tone'],
  },
  {
    id: 'concise',
    label: 'Concise',
    group: 'Writing',
    action: 'rewrite',
    tone: 'concise',
    keywords: ['tight', 'brief', 'tone'],
  },
  { id: 'expand', label: 'Expand', group: 'Writing', action: 'expand', keywords: ['longer', 'detail'] },
  { id: 'shorten', label: 'Shorten', group: 'Writing', action: 'shorten', keywords: ['trim', 'shorter'] },

  // Developer
  {
    id: 'jira-comment',
    label: 'Jira Comment',
    group: 'Developer',
    action: 'custom',
    instruction:
      'Rewrite the following as a Jira comment: state the current status, what changed, and any blocker. Use Jira-flavoured markdown and keep it scannable.',
    keywords: ['ticket', 'issue', 'atlassian'],
  },
  {
    id: 'slack-update',
    label: 'Slack Reply',
    group: 'Communication',
    action: 'custom',
    instruction:
      'Rewrite the following as a short Slack update for a team channel: plain language, a few lines at most, no corporate padding.',
    keywords: ['channel', 'team', 'post'],
  },
  {
    id: 'pr-description',
    label: 'PR Description',
    group: 'Developer',
    action: 'custom',
    instruction:
      'Rewrite the following as a pull request description in markdown: a one-paragraph summary, a bullet list of the changes, and a short testing note.',
    keywords: ['pr', 'pull request', 'merge request', 'review'],
  },
  {
    id: 'commit-message',
    label: 'Commit Message',
    group: 'Developer',
    action: 'custom',
    instruction:
      'Turn the following into a Conventional Commits message: a subject line of at most 72 characters, a blank line, then a short bullet-point body. Output the message only.',
    keywords: ['git', 'conventional', 'commit'],
  },
  {
    id: 'standup-update',
    label: 'Standup Update',
    group: 'Developer',
    action: 'custom',
    instruction:
      'Rewrite the following as a daily standup update under three headings: Yesterday, Today, Blockers. Leave a heading empty rather than inventing content.',
    keywords: ['daily', 'scrum', 'status'],
  },
  {
    id: 'release-notes',
    label: 'Release Notes',
    group: 'Developer',
    action: 'custom',
    instruction:
      'Rewrite the following as user-facing release notes in markdown, grouped under Added, Changed and Fixed. Omit any group that has no entries.',
    keywords: ['changelog', 'version', 'ship'],
  },

  // Communication
  {
    id: 'email',
    label: 'Email',
    group: 'Communication',
    action: 'custom',
    instruction:
      'Rewrite the following as a complete email with a subject line, a greeting, the body, and a sign-off.',
    keywords: ['mail', 'message', 'write'],
  },
  {
    id: 'client-reply',
    label: 'Client Reply',
    group: 'Communication',
    // Answers the selected client message rather than rewriting it; the same
    // action the client-reply shortcut runs, at its default style. This is the
    // only route to a client reply when that shortcut is unbound, which it is
    // by default.
    action: 'client-reply',
    replyStyle: 'professional',
    keywords: ['customer', 'support', 'response', 'answer'],
  },
  {
    id: 'manager-update',
    label: 'Manager Update',
    group: 'Communication',
    action: 'custom',
    instruction:
      'Rewrite the following as a progress update for a manager: the outcome first, then the detail, then the risks.',
    keywords: ['boss', 'lead', 'report', 'status'],
  },
  {
    id: 'linkedin-message',
    label: 'LinkedIn Message',
    group: 'Communication',
    action: 'custom',
    instruction:
      'Rewrite the following as a short LinkedIn message: one opening line with a reason for writing, one line of substance, one clear ask. No flattery and no buzzwords.',
    keywords: ['recruiter', 'outreach', 'dm', 'connect'],
  },
  {
    id: 'meeting-summary',
    label: 'Meeting Summary',
    group: 'Communication',
    action: 'custom',
    instruction:
      'Turn the following notes or transcript into a meeting summary: what was decided, what is open, and who does what next. Leave a heading out rather than filling it in.',
    keywords: ['notes', 'minutes', 'recap', 'transcript'],
  },
  {
    id: 'follow-up',
    label: 'Follow-up',
    group: 'Communication',
    action: 'custom',
    instruction:
      'Rewrite the following as a polite follow-up message that references the earlier request and asks for one clear next step.',
    keywords: ['nudge', 'reminder', 'chase'],
  },

  {
    id: 'translate',
    label: 'Translate',
    group: 'Writing',
    action: 'translate',
    instruction: 'Target language:',
    inputPlaceholder: 'Target language (e.g. Spanish)',
    keywords: ['language', 'localise', 'localize'],
  },

  // Productivity
  {
    id: 'ask-ai',
    label: 'Ask AI',
    group: 'Productivity',
    action: 'custom',
    inputPlaceholder: 'Ask anything about the selected text',
    keywords: ['question', 'prompt', 'chat'],
  },
  {
    id: 'explain',
    label: 'Explain',
    group: 'Productivity',
    action: 'custom',
    instruction:
      'Explain the following text in plain language, defining any jargon it uses. Answer with the explanation only.',
    keywords: ['what does this mean', 'clarify', 'eli5'],
  },
  {
    id: 'summarize',
    label: 'Summarize',
    group: 'Productivity',
    action: 'summarize',
    keywords: ['tldr', 'summary'],
  },
  {
    id: 'bullet-points',
    label: 'Bullet Points',
    group: 'Productivity',
    action: 'custom',
    instruction:
      'Rewrite the following as a flat bullet list, one idea per bullet, in the order the text makes them. Add nothing that is not already there.',
    keywords: ['list', 'bullets', 'points'],
  },
  {
    id: 'action-items',
    label: 'Action Items',
    group: 'Productivity',
    action: 'custom',
    instruction:
      'Pull the action items out of the following text as a checklist, each line naming the owner if the text says who. If there are none, say so in one line rather than inventing any.',
    keywords: ['todo', 'tasks', 'next steps', 'follow up'],
  },

  // Developer, continued: the four the palette was missing.
  {
    id: 'explain-code',
    label: 'Explain Code',
    group: 'Developer',
    action: 'custom',
    instruction:
      'Explain what the following code does, in order, in plain language. Name the inputs, the outputs and any side effect. Do not rewrite it.',
    keywords: ['what does this do', 'read', 'walkthrough', 'code'],
  },
  {
    id: 'fix-bug',
    label: 'Fix Bug',
    group: 'Developer',
    action: 'custom',
    instruction:
      'The following is code or an error from it. Say what is most likely wrong and why, then give the smallest corrected version. If the cause cannot be told from what is here, say what else you would need.',
    keywords: ['debug', 'error', 'stack trace', 'exception', 'broken'],
  },
  {
    id: 'optimize-sql',
    label: 'Optimize SQL',
    group: 'Developer',
    action: 'custom',
    instruction:
      'Rewrite the following SQL to do the same work with less of it, then list what changed and which index would help. Keep the result set identical.',
    keywords: ['query', 'database', 'explain plan', 'index', 'slow'],
  },
  {
    id: 'review-reply',
    label: 'Code Review Reply',
    group: 'Developer',
    action: 'custom',
    instruction:
      'Write a reply to the following code review comment: answer the point, say what you will change, and keep it short and unbothered. No apologising, no padding.',
    keywords: ['pr comment', 'reviewer', 'feedback', 'respond'],
  },
];

const byId = new Map(COMMANDS.map((command) => [command.id, command]));

export const findCommand = (id: string): CommandDescriptor | undefined => byId.get(id);

/**
 * The instruction actually sent for a command, once the user has answered its
 * prompt. Returns undefined for commands whose template takes no instruction,
 * so callers can spread it straight into an optional field.
 */
export function resolveInstruction(command: CommandDescriptor, userInput = ''): string | undefined {
  const parts = [command.instruction ?? '', userInput.trim()].filter((part) => part.length > 0);
  return parts.length === 0 ? undefined : parts.join(' ');
}

/** Lowercased haystack per command, built once rather than on every keystroke. */
const haystacks = new Map(
  COMMANDS.map((command) => [
    command.id,
    [command.label, command.group, ...(command.keywords ?? [])].join(' ').toLowerCase(),
  ]),
);

/**
 * Substring search, ranked so a label prefix beats a label hit beats a
 * keyword hit. Ties keep catalog order, which is what makes the unfiltered
 * list stable and groupable.
 */
export function filterCommands(
  query: string,
  commands: readonly CommandDescriptor[] = COMMANDS,
): readonly CommandDescriptor[] {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return commands;

  const scored: { command: CommandDescriptor; rank: number; index: number }[] = [];
  commands.forEach((command, index) => {
    const label = command.label.toLowerCase();
    const rank = label.startsWith(needle)
      ? 0
      : label.includes(needle)
        ? 1
        : (haystacks.get(command.id) ?? label).includes(needle)
          ? 2
          : -1;
    if (rank >= 0) scored.push({ command, rank, index });
  });

  return scored.sort((a, b) => a.rank - b.rank || a.index - b.index).map((entry) => entry.command);
}
