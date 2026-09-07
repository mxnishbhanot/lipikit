import { appError, err, ok, type ActionId, type Result, type Tone } from '@ai-anywhere/shared';
import { PROMPT_TEMPLATES, TONE_HINTS, type PromptTemplate } from './templates.js';

/**
 * Values for the context variables a template may reference. Everything is
 * optional: a missing variable renders as an empty string rather than leaving
 * a literal `{{app}}` in the prompt for the model to puzzle over.
 */
export interface PromptVariables {
  /** Foreground application label, e.g. 'Slack'. */
  readonly app?: string | null;
  readonly windowTitle?: string | null;
  readonly clipboard?: string | null;
  readonly domain?: string | null;
  /** Style hint for `client-reply`; see REPLY_STYLE_HINTS. */
  readonly style?: string | null;
  /** Pre-rendered conversation memory, or '' when the toggle is off. */
  readonly memory?: string | null;
}

export interface RenderPromptInput {
  readonly action: ActionId;
  readonly text: string;
  readonly tone?: Tone;
  /** Required by `translate` and `custom`; ignored elsewhere. */
  readonly instruction?: string;
  readonly variables?: PromptVariables;
  /**
   * A user-authored prompt body. When set it replaces the template for
   * `action` entirely, so a custom prompt needs no ActionId of its own.
   */
  readonly template?: string;
}

export interface RenderedPrompt {
  readonly system: string;
  readonly prompt: string;
  readonly template: PromptTemplate;
}

/** Documented for the prompt builder's variable help; order is display order. */
export const PROMPT_VARIABLES: readonly { readonly name: string; readonly description: string }[] = [
  { name: 'text', description: 'The selected text' },
  { name: 'selection', description: 'Alias of {{text}}' },
  { name: 'app', description: 'Foreground application, e.g. Slack' },
  { name: 'windowTitle', description: 'Title of the foreground window' },
  { name: 'domain', description: 'Site host, when the app is a browser' },
  { name: 'clipboard', description: 'Current clipboard contents' },
];

/**
 * Substituted last, and never re-scanned: a value that happens to contain
 * `{{clipboard}}` is data, not a further placeholder, so clipboard content
 * cannot inject another variable into the prompt.
 */
function substitute(body: string, values: Readonly<Record<string, string>>): string {
  return body.replaceAll(/\{\{\s*(\w+)\s*\}\}/g, (match, name: string) => values[name] ?? match);
}

export function renderPrompt(input: RenderPromptInput): Result<RenderedPrompt> {
  const template = PROMPT_TEMPLATES[input.action];
  if (input.text.trim().length === 0) {
    return err(appError('VALIDATION', 'No text to work on'));
  }
  const body = input.template ?? template.user;
  const needsInstruction = input.template === undefined && body.includes('{{instruction}}');
  if (needsInstruction && !input.instruction?.trim()) {
    return err(appError('VALIDATION', `Action "${input.action}" requires an instruction`));
  }

  const variables = input.variables ?? {};
  const prompt = substitute(body, {
    tone: TONE_HINTS[input.tone ?? 'neutral'],
    instruction: input.instruction?.trim() ?? '',
    text: input.text,
    // `{{selection}}` is an alias, so a custom prompt can read either way round.
    selection: input.text,
    app: variables.app ?? '',
    windowTitle: variables.windowTitle ?? '',
    clipboard: variables.clipboard ?? '',
    domain: variables.domain ?? '',
    style: variables.style ?? 'professional and neutral',
    memory: variables.memory ?? '',
  });
  return ok({ system: template.system, prompt, template });
}
