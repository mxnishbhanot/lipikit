import type { AppContext, KnownAppId } from '@ai-anywhere/shared';

/**
 * What to suggest out loud for the app the popup opened over.
 *
 * The context engine already decides which *commands* to list first; this is
 * the sentence that says why, in the words the user would have typed. It is
 * copy, not behaviour: nothing here changes what runs, so a missing entry
 * costs a generic line rather than a broken palette.
 */

/** Why the prompt changed, for the chip beside the app name. */
const TUNING: Partial<Record<KnownAppId, string>> = {
  slack: 'Friendly team reply',
  teams: 'Friendly team reply',
  discord: 'Friendly team reply',
  jira: 'Ticket-shaped status update',
  confluence: 'Long-form document voice',
  github: 'Pull request and commit voice',
  vscode: 'Code and stack traces',
  cursor: 'Code and stack traces',
  gmail: 'Email with a subject and a sign-off',
  outlook: 'Email with a subject and a sign-off',
  linkedin: 'Professional, short, no jargon',
  chrome: 'Whatever the page is',
  firefox: 'Whatever the page is',
};

/**
 * Examples, in the user's language rather than the model's: "Explain the
 * selected error", never "generate an intelligent explanation".
 */
const EXAMPLES: Partial<Record<KnownAppId, readonly string[]>> = {
  slack: ['Rewrite this message professionally', 'Shorten it to two lines', 'Reply like a teammate'],
  teams: ['Rewrite this message professionally', 'Turn this into a status update'],
  discord: ['Make this friendlier', 'Shorten it to two lines'],
  jira: ['Summarise the ticket updates', 'Rewrite this as a Jira comment', 'Pull out the action items'],
  confluence: ['Tighten this paragraph', 'Summarise this page'],
  github: ['Write the PR description', 'Write the commit message', 'Reply to this review comment'],
  vscode: ['Explain the selected error', 'Explain what this code does', 'Write the commit message'],
  cursor: ['Explain the selected error', 'Write the commit message'],
  gmail: ['Improve the tone of this email', 'Reply to this client', 'Write a short follow-up'],
  outlook: ['Improve the tone of this email', 'Reply to this client'],
  linkedin: ['Rewrite this message professionally', 'Shorten it for a DM'],
  chrome: ['Summarise this', 'Explain this in plain language', 'Translate this'],
  firefox: ['Summarise this', 'Explain this in plain language', 'Translate this'],
};

/** Shown when nothing was recognised: still concrete, just not app-specific. */
const FALLBACK: readonly string[] = [
  'Fix the grammar',
  'Make this shorter',
  'Explain this in plain language',
  'Give me the action items',
];

/** Every example is a real palette action; none of them promise a new feature. */
export const examplesFor = (context: AppContext | null): readonly string[] =>
  (context?.appId === null || context?.appId === undefined ? undefined : EXAMPLES[context.appId]) ?? FALLBACK;

/**
 * The half-sentence after the app name: "Slack detected · Friendly team
 * reply". Null when there is nothing more specific to say than the app's own
 * name, so the caller can leave the chip bare instead of padding it.
 */
export const tuningFor = (context: AppContext | null): string | null =>
  context?.appId === null || context?.appId === undefined ? null : (TUNING[context.appId] ?? null);
