import type { ActionId, Tone } from '@lipikit/shared';

export interface PromptTemplate {
  readonly action: ActionId;
  readonly label: string;
  readonly system: string;
  /** `{{text}}`, `{{tone}}`, `{{instruction}}` are the only placeholders. */
  readonly user: string;
  readonly supportsTone: boolean;
}

export const TONE_HINTS: Record<Tone, string> = {
  neutral: 'a neutral, plain tone',
  formal: 'a formal, professional tone',
  casual: 'a casual, relaxed tone',
  friendly: 'a warm, friendly tone',
  confident: 'a direct, confident tone',
  concise: 'the most concise phrasing that keeps the meaning',
};

const BASE_SYSTEM =
  'You are a writing assistant embedded in a desktop app. Return only the rewritten text: no preamble, no explanation, no quotes. Preserve the original language, formatting, and markup unless asked otherwise.';

/** Prompts are data, versioned with the app, not strings inside components. */
export const PROMPT_TEMPLATES: Record<ActionId, PromptTemplate> = {
  rewrite: {
    action: 'rewrite',
    label: 'Rewrite',
    system: BASE_SYSTEM,
    user: 'Rewrite the following text in {{tone}}:\n\n{{text}}',
    supportsTone: true,
  },
  improve: {
    action: 'improve',
    label: 'Improve writing',
    system: BASE_SYSTEM,
    user: 'Improve the clarity and flow of the following text, keeping its meaning and {{tone}}:\n\n{{text}}',
    supportsTone: true,
  },
  shorten: {
    action: 'shorten',
    label: 'Make shorter',
    system: BASE_SYSTEM,
    user: 'Shorten the following text substantially without losing information:\n\n{{text}}',
    supportsTone: false,
  },
  expand: {
    action: 'expand',
    label: 'Make longer',
    system: BASE_SYSTEM,
    user: 'Expand the following text with relevant detail, in {{tone}}:\n\n{{text}}',
    supportsTone: true,
  },
  'fix-grammar': {
    action: 'fix-grammar',
    label: 'Fix spelling & grammar',
    system: BASE_SYSTEM,
    user: 'Correct spelling, grammar, and punctuation in the following text. Change nothing else:\n\n{{text}}',
    supportsTone: false,
  },
  translate: {
    action: 'translate',
    label: 'Translate',
    system: BASE_SYSTEM,
    user: 'Translate the following text. {{instruction}}\n\n{{text}}',
    supportsTone: false,
  },
  summarize: {
    action: 'summarize',
    label: 'Summarize',
    system: BASE_SYSTEM,
    user: 'Summarize the following text in a few sentences:\n\n{{text}}',
    supportsTone: false,
  },
  'client-reply': {
    action: 'client-reply',
    label: 'Client reply',
    system: [
      'You draft replies on behalf of the user to messages they have received from a client.',
      '',
      'Hard rules, in priority order:',
      '1. Never invent information. If a fact is not in the client message or the context provided, do not state it.',
      '2. Never promise a timeline, a date, a delivery, a fix or a refund. Say what happens next, never when it lands.',
      '3. When the message reports a problem that cannot be resolved from the text alone, say it is being investigated.',
      '4. Always close with a concrete next step, or the one question that unblocks it.',
      '5. Reply in the language the client wrote in. No placeholders like [Name], no subject line, no signature.',
      '',
      'Answer in exactly this format and nothing else:',
      '',
      'ANALYSIS',
      "questions: <each question the client asked, separated by ' | ', or none>",
      'urgency: low | medium | high',
      'sentiment: positive | neutral | negative',
      'categories: <comma separated, from: technical issue, feature request, complaint, deployment issue, invoice issue, bug report, question, other>',
      '---',
      '<the reply, ready to send>',
    ].join('\n'),
    // The message is fenced with <<< >>> rather than ---, because --- is the
    // separator the model must emit between its analysis and the reply.
    user: '{{memory}}The client wrote:\n\n<<<\n{{text}}\n>>>\n\nWrite the reply in a voice that is {{style}}.',
    supportsTone: false,
  },
  custom: {
    action: 'custom',
    label: 'Custom instruction',
    system: BASE_SYSTEM,
    user: '{{instruction}}\n\n{{text}}',
    supportsTone: false,
  },
};
