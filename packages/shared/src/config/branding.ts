/**
 * Every user-visible name, URL and address the app prints, in one place.
 *
 * The product name is NOT final. Nothing here is a branding decision — it is
 * a placeholder that exists so the real name, when it lands, is one edit to
 * this file and not a grep across fifty components. Never re-type any of
 * these strings elsewhere, and never bake them into an asset.
 *
 * Deliberately not exported through the theme: accent colours are independent
 * of the brand, so a rename cannot change how the app looks.
 */
export interface Branding {
  /** Full name, for headings, window titles and tray tooltips. */
  readonly appName: string;
  /** Short form for tight spots: menus, notification titles, file names. */
  readonly shortName: string;
  readonly tagline: string;
  readonly website: string;
  readonly supportEmail: string;
  /** Where bug reports and feature requests go; the Feedback page links here. */
  readonly issuesUrl: string;
  /**
   * Marketing version for the splash screen and About page. The packaged
   * build's real version comes from `app.getVersion()` over IPC; this is the
   * fallback for a dev renderer that has not heard back yet.
   */
  readonly version: string;
}

export const BRANDING: Branding = {
  appName: 'AI Anywhere (Temporary)',
  shortName: 'AI Anywhere',
  tagline: 'AI writing assistant available anywhere via a global hotkey',
  website: 'https://example.invalid/ai-anywhere',
  supportEmail: 'support@example.invalid',
  issuesUrl: 'https://example.invalid/ai-anywhere/issues',
  version: '1.0.0',
};

export const { appName, shortName, tagline, website, supportEmail, issuesUrl, version } = BRANDING;
