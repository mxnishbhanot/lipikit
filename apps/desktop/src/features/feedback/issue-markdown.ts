import { BRANDING } from '@ai-anywhere/shared';

export type ReportKind = 'bug' | 'feature';

export interface FeedbackDraft {
  readonly kind: ReportKind;
  readonly title: string;
  /** What happened, for a bug; what is wanted, for a feature request. */
  readonly body: string;
  /** Bug only: the steps that reproduce it. */
  readonly steps: string;
  /** Bug only: what the user expected instead. */
  readonly expected: string;
  /** Diagnostics block from main; omitted from the issue when empty. */
  readonly diagnostics: string;
  readonly screenshotPath: string | null;
  readonly logPath: string | null;
}

export const emptyDraft = (kind: ReportKind): FeedbackDraft => ({
  kind,
  title: '',
  body: '',
  steps: '',
  expected: '',
  diagnostics: '',
  screenshotPath: null,
  logPath: null,
});

/**
 * The whole submission path: the app never posts anywhere, so the issue is
 * text the user pastes. Empty sections are dropped rather than shipped as
 * headings with nothing under them — a maintainer reading five blank sections
 * learns less than one filled one.
 */
export function buildIssueMarkdown(draft: FeedbackDraft): string {
  const section = (heading: string, content: string): string[] =>
    content.trim().length === 0 ? [] : [`## ${heading}`, content.trim(), ''];

  const bug = draft.kind === 'bug';
  const attachments = [
    draft.screenshotPath === null ? '' : `- Screenshot: \`${draft.screenshotPath}\` (attach the file)`,
    draft.logPath === null ? '' : `- Logs: \`${draft.logPath}\` (attach the file)`,
  ]
    .filter((line) => line.length > 0)
    .join('\n');

  return [
    `# ${draft.title.trim() || (bug ? 'Bug report' : 'Feature request')}`,
    '',
    ...section(bug ? 'What happened' : 'What I want', draft.body),
    ...(bug ? section('Steps to reproduce', draft.steps) : []),
    ...(bug ? section('Expected', draft.expected) : []),
    ...section('Attachments', attachments),
    ...(draft.diagnostics.trim().length === 0
      ? []
      : ['## Diagnostics', '', '```', draft.diagnostics.trim(), '```', '']),
  ]
    .join('\n')
    .trimEnd();
}

/** Prefilled `new issue` URL, so the markdown lands in the form already typed. */
export function issueUrl(draft: FeedbackDraft): string {
  const params = new URLSearchParams({
    title: draft.title.trim(),
    body: buildIssueMarkdown(draft),
    labels: draft.kind,
  });
  return `${BRANDING.issuesUrl.replace(/\/$/, '')}/new?${params.toString()}`;
}
