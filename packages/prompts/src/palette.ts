import { COMMANDS, type CommandDescriptor } from './commands.js';
import type { AppContext, CustomPrompt } from '@ai-anywhere/shared';

/**
 * A palette row is either a built-in command or a user prompt. The only
 * difference at run time is that a user prompt carries its own body, so it is
 * the built-in descriptor plus one field rather than a separate type the list
 * would have to branch on.
 */
export type PaletteCommand = CommandDescriptor & { readonly template?: string };

/** Prefix keeps user ids from ever colliding with a built-in command id. */
export const customCommandId = (promptId: string): string => `custom:${promptId}`;

const fromPrompt = (prompt: CustomPrompt): PaletteCommand => ({
  id: customCommandId(prompt.id),
  label: prompt.label,
  // Free-text group: the palette renders whatever groups it is given, so a
  // user's "Standups" section needs no change here.
  group: prompt.group as PaletteCommand['group'],
  action: 'custom',
  template: prompt.template,
  keywords: ['custom'],
});

export const mergeCommands = (prompts: readonly CustomPrompt[]): readonly PaletteCommand[] => [
  ...COMMANDS,
  ...prompts.map(fromPrompt),
];

/**
 * What to offer first for the detected app: the app's own suggestions, then
 * any user prompt tagged for that app. Ids that no longer exist are dropped,
 * so a renamed command degrades to a shorter list rather than a blank row.
 */
export function suggestedFor(
  context: AppContext | null,
  commands: readonly PaletteCommand[],
  prompts: readonly CustomPrompt[],
): readonly PaletteCommand[] {
  if (context === null) return [];
  const byId = new Map(commands.map((command) => [command.id, command]));
  const ids = [
    ...prompts
      .filter((prompt) => prompt.appId !== null && prompt.appId === context.appId)
      .map((prompt) => customCommandId(prompt.id)),
    ...context.suggestedCommandIds,
  ];
  const seen = new Set<string>();
  return ids
    .filter((id) => !seen.has(id) && seen.add(id))
    .map((id) => byId.get(id))
    .filter((command): command is PaletteCommand => command !== undefined);
}
