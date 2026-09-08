import { BRANDING } from '@ai-anywhere/shared';
import { AppIcon } from '@ai-anywhere/ui';

export interface SplashProps {
  /** The packaged build's version once IPC answers; the config value until. */
  readonly version?: string | undefined;
}

/**
 * What fills the window between the first paint and the settings row that
 * decides whether onboarding or the shell renders. Deliberately minimal — a
 * splash that animates would be a second loading vocabulary competing with
 * the skeletons, and this one is on screen for a few frames on a warm start.
 *
 * Name, icon and version all come from configuration: no brand asset here.
 */
export function Splash({ version }: SplashProps): JSX.Element {
  return (
    <div
      role="status"
      aria-label={`Starting ${BRANDING.appName}`}
      className="flex h-screen flex-col items-center justify-center gap-4 bg-background"
    >
      <AppIcon className="h-16 w-16 text-fg-muted" />
      <div className="text-center">
        <p className="text-body font-medium text-fg-secondary">{BRANDING.appName}</p>
        <p className="mt-1 text-caption tabular-nums text-fg-muted">v{version ?? BRANDING.version}</p>
      </div>
    </div>
  );
}
