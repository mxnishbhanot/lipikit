import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button, cn, slideUp } from '@ai-anywhere/ui';
import { IPC, type AppSettings, type Platform, type ProviderId } from '@ai-anywhere/shared';
import { ipcInvoke } from '../../../lib/ipc-client.js';
import { queryKeys } from '../../../lib/query-keys.js';
import { useProviders, useUpdateSettings } from '../../settings/api/settings.queries.js';
import { canAdvance, STEPS, type OnboardingDraft, type StepId } from '../progress.js';
import {
  ApiKeyStep,
  DemoStep,
  ModelStep,
  PermissionsStep,
  PlatformStep,
  ProviderStep,
  WelcomeStep,
} from './steps.js';

/** One dot per step, the reached ones filled — the Linear-style position line. */
function ProgressDots({ index }: { index: number }): JSX.Element {
  return (
    <div className="flex items-center justify-center gap-2" aria-hidden>
      {STEPS.map((step, position) => (
        <span
          key={step}
          className={cn(
            'h-1.5 rounded-full transition-all duration-base ease-calm',
            position === index
              ? 'w-5 bg-accent'
              : position < index
                ? 'w-1.5 bg-accent/50'
                : 'w-1.5 bg-border',
          )}
        />
      ))}
    </div>
  );
}

/**
 * The first-run wizard. Seven screens, one at a time, with the choices written
 * through the same mutations settings uses — so nothing here is a second
 * writer for the same rows, and quitting halfway leaves everything already
 * chosen in place.
 */
export function Onboarding({ settings }: { settings: AppSettings }): JSX.Element {
  const [index, setIndex] = useState(0);
  const step: StepId = STEPS[index] ?? 'welcome';
  const providers = useProviders();
  const update = useUpdateSettings();

  // Platform is detected, not asked: the picker starts on the right answer and
  // the user only confirms it.
  const appInfo = useQuery({
    queryKey: queryKeys.appInfo,
    queryFn: () => ipcInvoke(IPC.app.getInfo, undefined),
    staleTime: Infinity,
  });
  const detected = appInfo.data?.platform ?? null;

  const [platform, setPlatform] = useState<Platform | null>(null);
  const [providerId, setProviderId] = useState<ProviderId | null>(null);
  const [keyValidated, setKeyValidated] = useState(false);
  const [model, setModel] = useState<string | null>(null);

  const descriptor = providers.data?.find((entry) => entry.id === providerId) ?? null;
  // A provider that needs no key is already connected; so is one whose key the
  // step found in the keyring.
  const keyReady = keyValidated || descriptor?.requiresApiKey === false;

  const draft: OnboardingDraft = useMemo(
    () => ({
      platform: platform ?? detected,
      providerId,
      keyReady,
      model,
      hotkey: settings.globalHotkey,
    }),
    [platform, detected, providerId, keyReady, model, settings.globalHotkey],
  );

  const finish = () => update.mutate({ onboardingCompleted: true });

  const next = () => {
    // The provider and model land in settings together, for the same reason
    // the popup's provider switch writes both: a provider without a model it
    // knows about 404s on the first call.
    if (step === 'model' && providerId !== null && model !== null) {
      update.mutate({ defaultProvider: providerId, defaultModel: model });
    }
    if (index === STEPS.length - 1) {
      finish();
      return;
    }
    setIndex(index + 1);
  };

  const body = () => {
    switch (step) {
      case 'welcome':
        return <WelcomeStep />;
      case 'platform':
        return <PlatformStep detected={detected} value={draft.platform} onChange={setPlatform} />;
      case 'provider':
        return (
          <ProviderStep
            value={providerId}
            onChange={(id) => {
              setProviderId(id);
              // A different vendor means a different key and a different model
              // list: neither answer carries over.
              setKeyValidated(false);
              setModel(null);
            }}
          />
        );
      case 'api-key':
        return descriptor === null ? null : (
          <ApiKeyStep descriptor={descriptor} onValidated={() => setKeyValidated(true)} />
        );
      case 'model':
        return descriptor === null ? null : (
          <ModelStep descriptor={descriptor} value={model} onChange={setModel} />
        );
      case 'permissions':
        return (
          <PermissionsStep
            hotkey={settings.globalHotkey}
            onHotkeyChange={(globalHotkey) => update.mutate({ globalHotkey })}
          />
        );
      case 'demo':
        return <DemoStep model={settings.defaultModel} />;
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* The gradient wash is what makes this screen not look like settings.
          Reserved for onboarding and the hero, per the design system. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-accent/[0.07] to-transparent" />

      <header className="flex items-center justify-end px-6 py-4">
        {step === 'demo' ? null : (
          <Button variant="ghost" size="sm" disabled={update.isPending} onClick={finish}>
            Skip setup
          </Button>
        )}
      </header>

      <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-6">
        <div className="w-full max-w-xl py-8">
          {/* mode="wait" so one screen finishes leaving before the next
              arrives: two centred columns cross-fading on top of each other
              reads as a glitch, not a transition. */}
          <AnimatePresence mode="wait">
            <motion.div key={step} variants={slideUp} initial="hidden" animate="visible" exit="exit">
              {body()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <footer className="space-y-4 px-6 pb-7 pt-2">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3">
          <Button
            variant="ghost"
            disabled={index === 0}
            className={cn(index === 0 && 'invisible')}
            onClick={() => setIndex(index - 1)}
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Back
          </Button>
          <Button size="lg" disabled={!canAdvance(step, draft) || update.isPending} onClick={next}>
            {update.isPending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
            {index === STEPS.length - 1 ? 'Launch AI Anywhere' : index === 0 ? 'Get started' : 'Continue'}
            {index === STEPS.length - 1 ? null : <ArrowRight aria-hidden className="h-4 w-4" />}
          </Button>
        </div>
        <ProgressDots index={index} />
        {update.error ? <p className="text-center text-caption text-danger">{update.error.message}</p> : null}
      </footer>
    </div>
  );
}
