import { randomUUID } from 'node:crypto';
import {
  appError,
  err,
  IPC_EVENTS,
  ok,
  type GenerateRequest,
  type GenerateResponse,
  type Logger,
  type Result,
} from '@lipikit/shared';
import { mapProviderError, type GenerateTextRequest, type ProviderRegistry } from '@lipikit/providers';
import { formatMemory, MEMORY_LIMIT, REPLY_STYLE_HINTS, renderPrompt } from '@lipikit/prompts';
import type { ClipboardService } from '@lipikit/platform';
import type { HistoryRepository, SettingsRepository } from '@lipikit/database';
import type { WindowManager } from '../windows/window-manager.js';

/**
 * The AI half of the round trip: settings + prompt template + provider call,
 * with history written on success. It lives in main because it is the only
 * thing that needs the registry, the DB and the renderer push channel at once;
 * the provider adapters themselves know nothing about any of that.
 */
export interface AiService {
  generate(request: GenerateRequest): Promise<Result<GenerateResponse>>;
  /** Abort an in-flight call: the user closed the popup or hit Escape. */
  cancel(requestId: string): Result<void>;
}

export interface AiServiceDeps {
  readonly providers: ProviderRegistry;
  readonly settings: SettingsRepository;
  readonly history: HistoryRepository;
  readonly windows: WindowManager;
  /** Only read when a prompt actually references {{clipboard}}. */
  readonly clipboard: ClipboardService;
  readonly logger: Logger;
}

export function createAiService(deps: AiServiceDeps): AiService {
  const scoped = deps.logger.child('ai');
  const inFlight = new Map<string, AbortController>();

  return {
    async generate(request) {
      if (inFlight.has(request.requestId)) {
        return err(appError('VALIDATION', 'That request is already running'));
      }
      const settings = deps.settings.get();
      if (!settings.ok) return settings;

      const providerId = request.providerId ?? settings.value.defaultProvider;
      const model = request.model ?? settings.value.defaultModel;

      // Reading the clipboard is a real side effect on some Linux backends
      // (it shells out to wl-paste/xclip), so it happens only for prompts
      // that ask for it rather than on every call.
      const body = request.promptTemplate ?? '';
      const clipboard = body.includes('{{clipboard}}') ? await deps.clipboard.readText() : null;

      // Conversation memory is the stored history replayed back to the model.
      // It is a separate opt-in from history itself, because keeping a local
      // log and sending that log to a provider are different decisions.
      const useMemory =
        request.action === 'client-reply' &&
        settings.value.conversationMemoryEnabled &&
        settings.value.historyEnabled;
      const past = useMemory ? deps.history.list({ limit: MEMORY_LIMIT, offset: 0 }) : null;
      if (past && !past.ok) scoped.warn('memory unreadable', { reason: past.error.message });
      const memory = past?.ok === true ? formatMemory(past.value) : '';

      const prompt = renderPrompt({
        action: request.action,
        text: request.text,
        tone: request.tone ?? settings.value.defaultTone,
        ...(request.instruction === undefined ? {} : { instruction: request.instruction }),
        ...(request.promptTemplate === undefined ? {} : { template: request.promptTemplate }),
        variables: {
          app: request.appName ?? null,
          windowTitle: request.windowTitle ?? null,
          clipboard,
          memory,
          ...(request.replyStyle === undefined ? {} : { style: REPLY_STYLE_HINTS[request.replyStyle] }),
        },
      });
      if (!prompt.ok) return prompt;

      const provider = deps.providers.get(providerId);
      if (!provider.ok) return provider;

      const controller = new AbortController();
      inFlight.set(request.requestId, controller);
      const streamed = settings.value.streamingEnabled;
      const call: GenerateTextRequest = {
        model,
        system: prompt.value.system,
        prompt: prompt.value.prompt,
        temperature: settings.value.temperature,
        maxTokens: settings.value.maxTokens,
        timeoutMs: settings.value.requestTimeoutMs,
        signal: controller.signal,
      };

      try {
        let text: string;
        let inputTokens: number | null = null;
        let outputTokens: number | null = null;

        if (streamed) {
          // Deltas go straight to the renderer so the popup fills in as the
          // model writes; the accumulated text is still returned, so the
          // caller never has to reassemble the stream itself.
          const parts: string[] = [];
          for await (const chunk of provider.value.streamText(call)) {
            parts.push(chunk.delta);
            deps.windows.sendToOverlay(IPC_EVENTS.aiDelta, {
              requestId: request.requestId,
              delta: chunk.delta,
            });
          }
          text = parts.join('');
        } else {
          const result = await provider.value.generateText(call);
          if (!result.ok) return result;
          text = result.value.text;
          inputTokens = result.value.inputTokens;
          outputTokens = result.value.outputTokens;
        }

        if (text.trim().length === 0) {
          return err(appError('PROVIDER_UNAVAILABLE', 'The model returned an empty response'));
        }

        if (settings.value.historyEnabled) {
          const stored = deps.history.insert({
            id: randomUUID(),
            action: request.action,
            providerId,
            model,
            input: request.text,
            output: text,
            tone: request.tone ?? settings.value.defaultTone,
            appName: request.appName ?? null,
            createdAt: Date.now(),
          });
          // A failed history write must not lose the user their rewrite.
          if (!stored.ok) scoped.warn('history insert failed', { reason: stored.error.message });
        }

        return ok({
          requestId: request.requestId,
          text,
          providerId,
          model,
          inputTokens,
          outputTokens,
          streamed,
        });
      } catch (cause) {
        const error = mapProviderError(cause);
        scoped.warn('generate failed', { providerId, model, code: error.code });
        return err(error);
      } finally {
        inFlight.delete(request.requestId);
      }
    },

    cancel(requestId) {
      const controller = inFlight.get(requestId);
      if (!controller) return err(appError('NOT_FOUND', 'No such in-flight request'));
      controller.abort();
      inFlight.delete(requestId);
      return ok(undefined);
    },
  };
}
