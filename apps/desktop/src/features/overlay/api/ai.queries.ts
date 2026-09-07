import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  IPC,
  IPC_EVENTS,
  type ActionId,
  type GenerateRequest,
  type ReplyStyle,
  type Tone,
} from '@ai-anywhere/shared';
import { ipcInvoke, ipcOn } from '../../../lib/ipc-client.js';

export interface RunActionInput {
  readonly action: ActionId;
  readonly text: string;
  readonly appName: string | null;
  readonly windowTitle?: string | null;
  /** A user-authored prompt body; replaces the built-in template. */
  readonly promptTemplate?: string;
  /** Required by `translate` and `custom`. */
  readonly instruction?: string;
  /** Overrides the saved default tone; set by the tone-flavoured commands. */
  readonly tone?: Tone;
  /** Voice for a `client-reply` call. */
  readonly replyStyle?: ReplyStyle;
}

/**
 * One AI call plus its live token stream. The deltas arrive on an event
 * channel rather than the invoke response, so the hook owns both halves:
 * callers get `output` growing as the model writes and a promise that
 * resolves with the finished text.
 */
export function useGenerate(): {
  run: (input: RunActionInput) => Promise<string>;
  cancel: () => void;
  output: string;
  isPending: boolean;
  error: Error | null;
  reset: () => void;
} {
  const [output, setOutput] = useState('');
  // A ref, not state: the event listener must see the current id without
  // being torn down and re-subscribed on every request.
  const requestId = useRef<string | null>(null);

  useEffect(
    () =>
      ipcOn(IPC_EVENTS.aiDelta, (event) => {
        // Late deltas from a cancelled call must not land in the new answer.
        if (event.requestId !== requestId.current) return;
        setOutput((previous) => previous + event.delta);
      }),
    [],
  );

  const mutation = useMutation({
    mutationFn: async (input: RunActionInput) => {
      const id = crypto.randomUUID();
      requestId.current = id;
      setOutput('');
      const request: GenerateRequest = {
        requestId: id,
        action: input.action,
        text: input.text,
        appName: input.appName,
        windowTitle: input.windowTitle ?? null,
        ...(input.instruction === undefined ? {} : { instruction: input.instruction }),
        ...(input.promptTemplate === undefined ? {} : { promptTemplate: input.promptTemplate }),
        ...(input.tone === undefined ? {} : { tone: input.tone }),
        ...(input.replyStyle === undefined ? {} : { replyStyle: input.replyStyle }),
      };
      try {
        const response = await ipcInvoke(IPC.ai.generate, request);
        return response.text;
      } finally {
        requestId.current = null;
      }
    },
    onSuccess: (text) => setOutput(text),
  });

  const { mutateAsync, reset: resetMutation } = mutation;
  // Stable identities: callers subscribe to events in effects that must not
  // re-run on every render of the popup.
  const cancel = useCallback(() => {
    const id = requestId.current;
    if (!id) return;
    requestId.current = null;
    void ipcInvoke(IPC.ai.cancel, { requestId: id });
  }, []);
  const reset = useCallback(() => {
    setOutput('');
    resetMutation();
  }, [resetMutation]);

  return {
    run: mutateAsync,
    cancel,
    output,
    isPending: mutation.isPending,
    error: mutation.error,
    reset,
  };
}
