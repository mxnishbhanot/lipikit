import { appError, err, ok, type ActionId, type Result, type Tone } from '@ai-anywhere/shared';
import { PROMPT_TEMPLATES, TONE_HINTS, type PromptTemplate } from './templates.js';

export interface RenderPromptInput {
  readonly action: ActionId;
  readonly text: string;
  readonly tone?: Tone;
  /** Required by `translate` and `custom`; ignored elsewhere. */
  readonly instruction?: string;
}

export interface RenderedPrompt {
  readonly system: string;
  readonly prompt: string;
  readonly template: PromptTemplate;
}

export function renderPrompt(input: RenderPromptInput): Result<RenderedPrompt> {
  const template = PROMPT_TEMPLATES[input.action];
  if (input.text.trim().length === 0) {
    return err(appError('VALIDATION', 'No text to work on'));
  }
  const needsInstruction = template.user.includes('{{instruction}}');
  if (needsInstruction && !input.instruction?.trim()) {
    return err(appError('VALIDATION', `Action "${input.action}" requires an instruction`));
  }
  const prompt = template.user
    .replaceAll('{{tone}}', TONE_HINTS[input.tone ?? 'neutral'])
    .replaceAll('{{instruction}}', input.instruction?.trim() ?? '')
    .replaceAll('{{text}}', input.text);
  return ok({ system: template.system, prompt, template });
}
