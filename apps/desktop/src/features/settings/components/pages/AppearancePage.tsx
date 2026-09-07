import type { AppSettings } from '@ai-anywhere/shared';
import { Button } from '@ai-anywhere/ui';
import { Row, Section } from '../fields.js';

const THEMES: readonly AppSettings['theme'][] = ['system', 'light', 'dark'];

export function AppearancePage({
  settings,
  patch,
}: {
  settings: AppSettings;
  patch: (value: Partial<AppSettings>) => void;
}): JSX.Element {
  return (
    <Section
      title="Theme"
      description="Applies to this window and to the popup. 'System' keeps following the OS after the window is open."
    >
      <Row label="Theme">
        <div className="flex gap-2">
          {THEMES.map((theme) => (
            <Button
              key={theme}
              size="sm"
              variant={theme === settings.theme ? 'default' : 'outline'}
              onClick={() => patch({ theme })}
            >
              {theme}
            </Button>
          ))}
        </div>
      </Row>
    </Section>
  );
}
