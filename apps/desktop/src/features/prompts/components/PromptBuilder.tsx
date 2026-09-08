import { useState } from 'react';
import { Button, EmptyState, Input } from '@ai-anywhere/ui';
import { PROMPT_VARIABLES } from '@ai-anywhere/prompts';
import { KNOWN_APP_IDS, type CustomPrompt, type KnownAppId } from '@ai-anywhere/shared';
import { HotkeyRecorder } from '../../settings/components/HotkeyRecorder.js';
import { useCustomPrompts, useDeletePrompt, useSavePrompt } from '../api/prompts.queries.js';

interface Draft {
  readonly id?: string;
  readonly label: string;
  readonly group: string;
  readonly template: string;
  readonly appId: KnownAppId | null;
  readonly shortcut: string | null;
}

const EMPTY: Draft = { label: '', group: 'Custom', template: '', appId: null, shortcut: null };

const toDraft = (prompt: CustomPrompt): Draft => ({
  id: prompt.id,
  label: prompt.label,
  group: prompt.group,
  template: prompt.template,
  appId: prompt.appId,
  shortcut: prompt.shortcut,
});

/**
 * Create and edit the prompts the palette offers alongside the built-in
 * catalog. One draft at a time: the list is the navigation, so there is no
 * separate "editing" mode to get out of sync with it.
 */
export function PromptBuilder(): JSX.Element {
  const prompts = useCustomPrompts();
  const save = useSavePrompt();
  const remove = useDeletePrompt();
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const submit = async (): Promise<void> => {
    await save.mutateAsync({
      ...(draft.id === undefined ? {} : { id: draft.id }),
      label: draft.label,
      group: draft.group,
      template: draft.template,
      appId: draft.appId,
      shortcut: draft.shortcut,
    });
    setDraft(EMPTY);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-sm font-semibold">{draft.id === undefined ? 'New prompt' : 'Edit prompt'}</h2>
          <p className="text-xs text-muted-foreground">
            Appears in the popup under its group, and first when its app is in the foreground.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Input
            value={draft.label}
            onChange={(event) => setDraft({ ...draft, label: event.target.value })}
            placeholder="Name, e.g. Bug report"
            aria-label="Prompt name"
          />
          <Input
            value={draft.group}
            onChange={(event) => setDraft({ ...draft, group: event.target.value })}
            placeholder="Group"
            aria-label="Group"
          />
          <select
            value={draft.appId ?? ''}
            onChange={(event) =>
              setDraft({ ...draft, appId: (event.target.value || null) as KnownAppId | null })
            }
            aria-label="Suggest for app"
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">Any app</option>
            {KNOWN_APP_IDS.map((appId) => (
              <option key={appId} value={appId}>
                {appId}
              </option>
            ))}
          </select>
        </div>

        <textarea
          value={draft.template}
          onChange={(event) => setDraft({ ...draft, template: event.target.value })}
          placeholder="Rewrite this for {{app}}:&#10;&#10;{{text}}"
          aria-label="Prompt template"
          rows={6}
          className="resize-y rounded-md border border-input bg-background p-2 font-mono text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            Global shortcut — optional. Runs this prompt on the selected text with no popup in between.
          </span>
          <HotkeyRecorder
            value={draft.shortcut ?? ''}
            onChange={(shortcut) => setDraft({ ...draft, shortcut })}
            onClear={() => setDraft({ ...draft, shortcut: null })}
          />
        </div>

        <div className="flex flex-wrap gap-1">
          {PROMPT_VARIABLES.map((variable) => (
            <button
              key={variable.name}
              type="button"
              title={variable.description}
              onClick={() => setDraft({ ...draft, template: `${draft.template}{{${variable.name}}}` })}
              className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground hover:bg-accent"
            >
              {`{{${variable.name}}}`}
            </button>
          ))}
        </div>

        {save.isError ? (
          <p className="text-xs text-destructive" role="status">
            {save.error.message}
          </p>
        ) : null}

        <div className="flex gap-2">
          <Button size="sm" onClick={() => void submit()} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save prompt'}
          </Button>
          {draft.id === undefined ? null : (
            <Button size="sm" variant="ghost" onClick={() => setDraft(EMPTY)}>
              Cancel
            </Button>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">Your prompts</h2>
        {prompts.data?.length === 0 ? <EmptyState kind="first-prompt" size="sm" /> : null}
        {prompts.data?.map((prompt) => (
          <div
            key={prompt.id}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
          >
            <span className="flex-1 truncate">
              {prompt.label}
              <span className="text-muted-foreground">
                {' · '}
                {prompt.group}
                {prompt.appId === null ? '' : ` · ${prompt.appId}`}
                {prompt.shortcut === null ? '' : ` · ${prompt.shortcut}`}
              </span>
            </span>
            <Button size="sm" variant="ghost" onClick={() => setDraft(toDraft(prompt))}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void remove.mutateAsync(prompt.id)}
              disabled={remove.isPending}
            >
              Delete
            </Button>
          </div>
        ))}
      </section>
    </div>
  );
}
