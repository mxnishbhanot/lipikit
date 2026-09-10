import type { AppContext, KnownAppId, SelectionSource } from '@lipikit/shared';

/**
 * How one application is recognised, and what it should offer.
 *
 * Three signals, deliberately: the process/window-class name identifies a
 * native app (Slack, VS Code, Discord), the window title separates the web
 * apps that all run inside the same browser process, and a host recovered
 * from that title is the last resort for a site whose name the title does not
 * spell out. So Chrome matches on process name and Gmail matches on title,
 * and the title rules are tried first — "Inbox - Gmail - Google Chrome" is
 * Gmail, not "a browser".
 */
interface AppRule {
  readonly id: KnownAppId;
  readonly label: string;
  /** Matched against the lowercased process / window-class name. */
  readonly processPatterns?: readonly RegExp[];
  /** Matched against the lowercased window title. */
  readonly titlePatterns?: readonly RegExp[];
  /**
   * Matched against a host recovered from the window title, for titles that
   * carry the URL but not the product name ("Pull requests · github.com").
   */
  readonly domainPatterns?: readonly RegExp[];
  /** Reported as the domain when this rule matched inside a browser. */
  readonly domain?: string;
  readonly isBrowser?: boolean;
  /**
   * Commands the palette lists first, best guess leading. The leading id is
   * also what `routeCommandId` routes to, so it is the prompt this app should
   * default to: Slack rewrite for Slack, PR description for GitHub. Ids come
   * from the prompts catalog; an id that no longer exists is dropped by the UI
   * rather than breaking detection.
   */
  readonly suggests: readonly string[];
}

/**
 * Site rules come before browser rules so that the more specific match wins,
 * and native-app rules can sit anywhere because their process names are
 * unambiguous.
 */
const RULES: readonly AppRule[] = [
  // Web apps: identified by title, wherever they are running.
  {
    id: 'gmail',
    label: 'Gmail',
    titlePatterns: [/\bgmail\b/, /\binbox\b.*\bgoogle\b/],
    domainPatterns: [/^mail\.google\.com$/],
    domain: 'mail.google.com',
    suggests: ['email', 'client-reply', 'follow-up', 'professional'],
  },
  {
    id: 'jira',
    label: 'Jira',
    // "[ABC-123] Fix the thing - Jira"; the bare issue key alone is too
    // common in commit messages and chat to match on.
    titlePatterns: [/\bjira\b/, /\batlassian\.net\b/],
    domainPatterns: [/(^|\.)atlassian\.(net|com)$/],
    domain: 'atlassian.net',
    suggests: ['jira-comment', 'standup-update', 'concise'],
  },
  {
    id: 'confluence',
    label: 'Confluence',
    titlePatterns: [/\bconfluence\b/],
    domain: 'atlassian.net',
    suggests: ['improve-english', 'professional', 'expand', 'summarize'],
  },
  {
    id: 'github',
    label: 'GitHub',
    // Matched before the browser rules, like every other web app: a GitHub
    // tab is a PR review surface, not "a Chrome window".
    titlePatterns: [/\bgithub\b/, /\bpull request\b/],
    domainPatterns: [/(^|\.)github\.com$/],
    domain: 'github.com',
    suggests: ['pr-description', 'commit-message', 'explain', 'concise'],
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    titlePatterns: [/\blinkedin\b/],
    domainPatterns: [/(^|\.)linkedin\.com$/],
    domain: 'linkedin.com',
    suggests: ['professional', 'client-reply', 'concise'],
  },

  // Native apps and browser shells.
  {
    id: 'slack',
    label: 'Slack',
    processPatterns: [/^slack$/],
    titlePatterns: [/\bslack\b/],
    domainPatterns: [/(^|\.)slack\.com$/],
    domain: 'app.slack.com',
    suggests: ['slack-update', 'concise', 'friendly'],
  },
  {
    id: 'teams',
    label: 'Microsoft Teams',
    processPatterns: [/^(ms-?)?teams/],
    titlePatterns: [/\bmicrosoft teams\b/],
    domainPatterns: [/(^|\.)teams\.microsoft\.com$/],
    domain: 'teams.microsoft.com',
    suggests: ['slack-update', 'manager-update', 'professional'],
  },
  {
    id: 'discord',
    label: 'Discord',
    processPatterns: [/^discord/],
    titlePatterns: [/\bdiscord\b/],
    domainPatterns: [/(^|\.)discord\.com$/],
    domain: 'discord.com',
    suggests: ['friendly', 'concise', 'slack-update'],
  },
  {
    id: 'outlook',
    label: 'Outlook',
    processPatterns: [/^outlook$/, /^olk$/],
    titlePatterns: [/\boutlook\b/],
    domainPatterns: [/(^|\.)outlook\.(office|live)\.com$/],
    domain: 'outlook.office.com',
    suggests: ['email', 'client-reply', 'professional', 'follow-up'],
  },
  {
    id: 'cursor',
    label: 'Cursor',
    // Checked before VS Code: Cursor is a VS Code fork and its title still
    // ends in "Visual Studio Code" on some builds.
    processPatterns: [/^cursor$/],
    titlePatterns: [/\bcursor\b$/],
    suggests: ['commit-message', 'pr-description', 'explain', 'standup-update'],
  },
  {
    id: 'vscode',
    label: 'VS Code',
    processPatterns: [/^code$/, /^code-insiders$/, /^vscodium$/],
    titlePatterns: [/\bvisual studio code\b/],
    suggests: ['commit-message', 'pr-description', 'explain', 'standup-update'],
  },
  {
    id: 'chrome',
    label: 'Chrome',
    processPatterns: [/^(google-)?chrome/, /^chromium/, /^msedge$/, /^brave/],
    titlePatterns: [/\bgoogle chrome\b/, /\bchromium\b/],
    isBrowser: true,
    suggests: ['improve-english', 'summarize', 'explain'],
  },
  {
    id: 'firefox',
    label: 'Firefox',
    processPatterns: [/^firefox/, /^librewolf/, /^zen/],
    titlePatterns: [/\bmozilla firefox\b/],
    isBrowser: true,
    suggests: ['improve-english', 'summarize', 'explain'],
  },
];

/** Rules whose match implies the window is a browser window. */
const BROWSER_IDS = new Set<KnownAppId>(['chrome', 'firefox']);
/** Rules that are web apps: a match means the host app is a browser too. */
const WEB_APP_IDS = new Set<KnownAppId>(['gmail', 'jira', 'confluence', 'github', 'linkedin']);

/** Fallback suggestions when nothing is recognised. */
const DEFAULT_SUGGESTIONS: readonly string[] = ['improve-english', 'fix-grammar', 'concise'];

const matches = (patterns: readonly RegExp[] | undefined, value: string | null): boolean =>
  value !== null && patterns !== undefined && patterns.some((pattern) => pattern.test(value));

/**
 * Last-resort domain guess for a browser window whose site we do not have a
 * rule for. Browsers do not put the URL in the title, so the only host that
 * can be recovered is one the page put there itself — which real titles do
 * often enough ("Foo — example.com") to be worth two lines.
 */
const HOST_IN_TITLE = /\b((?:[a-z0-9-]+\.)+(?:com|org|net|io|dev|app|co|ai|sh|me|gov|edu))\b/;

const guessDomain = (title: string | null): string | null => {
  const found = title === null ? null : HOST_IN_TITLE.exec(title.toLowerCase());
  return found?.[1] ?? null;
};

/**
 * Pure: everything the OS could tell us in, one context out. Kept free of any
 * OS call so the renderer can derive the context from the `SelectionSource`
 * it already received, instead of paying a second IPC round trip. `now` is a
 * parameter only so the timestamp is assertable in a test.
 */
export function detectApp(source: SelectionSource | null, now: number = Date.now()): AppContext {
  const appName = source?.appName ?? null;
  const windowTitle = source?.windowTitle ?? null;
  const platform = source?.platform ?? null;
  const process = appName?.toLowerCase().replace(/\.exe$/, '') ?? null;
  const title = windowTitle?.toLowerCase() ?? null;
  const host = guessDomain(windowTitle);

  // Title first: it is what distinguishes Gmail from "a Chrome window". Then
  // the host in the title, then the process name.
  const rule =
    RULES.find((candidate) => matches(candidate.titlePatterns, title)) ??
    RULES.find((candidate) => matches(candidate.domainPatterns, host)) ??
    RULES.find((candidate) => matches(candidate.processPatterns, process));

  if (rule === undefined) {
    return {
      appId: null,
      label: appName ?? 'Unknown app',
      appName,
      windowTitle,
      platform,
      browserDomain: null,
      isBrowser: false,
      suggestedCommandIds: DEFAULT_SUGGESTIONS,
      timestamp: now,
    };
  }

  const browserShell = RULES.find(
    (candidate) => BROWSER_IDS.has(candidate.id) && matches(candidate.processPatterns, process),
  );
  const isBrowser = BROWSER_IDS.has(rule.id) || WEB_APP_IDS.has(rule.id) || browserShell !== undefined;

  return {
    appId: rule.id,
    label: rule.label,
    appName,
    windowTitle,
    platform,
    browserDomain: isBrowser ? (rule.domain ?? host) : null,
    isBrowser,
    suggestedCommandIds: rule.suggests,
    timestamp: now,
  };
}

/**
 * Auto prompt routing: the one command this context should run when the user
 * wants the obvious thing (Slack rewrite in Slack, PR description on GitHub,
 * commit message in VS Code). It is the head of `suggestedCommandIds` rather
 * than a second table, so routing cannot drift from what the palette lists.
 */
export function routeCommandId(context: AppContext | null): string | null {
  return context?.suggestedCommandIds[0] ?? null;
}

/** The detection service: one OS read, then the pure rules above. */
export interface AppContextService {
  detect(): Promise<AppContext>;
}

export function createAppContextService(deps: {
  readonly getActiveWindow: () => Promise<SelectionSource>;
}): AppContextService {
  return {
    async detect() {
      return detectApp(await deps.getActiveWindow());
    },
  };
}
