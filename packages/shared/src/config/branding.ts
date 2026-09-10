/**
 * Every user-visible name, URL and address the app prints, in one place.
 *
 * The product name is LipiKit. Keep it here and nowhere else: never re-type
 * any of these strings elsewhere, and never bake them into an asset, so a
 * future change stays one edit to this file and not a grep across fifty
 * components.
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
  appName: 'LipiKit',
  shortName: 'LipiKit',
  tagline: 'The fastest AI command layer for Windows and Linux',
  website: 'https://lipikit.io',
  supportEmail: 'support@lipikit.io',
  issuesUrl: 'https://github.com/mxnishbhanot/lipikit/issues',
  version: '1.0.0',
};

export const { appName, shortName, tagline, website, supportEmail, issuesUrl, version } = BRANDING;
