import { cn } from '../lib/cn.js';

export interface AppIconProps {
  /** Tailwind size classes; defaults to 24px so it drops into a toolbar. */
  readonly className?: string;
  /** Set when the icon is the only thing naming the app on a surface. */
  readonly label?: string;
}

/**
 * The placeholder app mark. NOT a logo — the product name and identity are not
 * final, so this is deliberately plain geometry: one rounded plate with two
 * knocked-out shapes, drawn in `currentColor` so it inherits the text colour
 * and needs no light/dark variant.
 *
 * Kept in sync by hand with `apps/desktop/build/icon.svg`, which is the same
 * geometry with a fixed grey ink for the packaged icon files. Replacing the
 * real mark later means editing those two files and rerunning
 * `apps/desktop/scripts/generate-icons.mjs`.
 */
export function AppIcon({ className, label }: AppIconProps): JSX.Element {
  return (
    <svg
      viewBox="0 0 256 256"
      role={label === undefined ? 'presentation' : 'img'}
      aria-label={label}
      aria-hidden={label === undefined}
      className={cn('h-6 w-6', className)}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M56 8h144a48 48 0 0 1 48 48v144a48 48 0 0 1-48 48H56A48 48 0 0 1 8 200V56A48 48 0 0 1 56 8Zm40 40a44 44 0 1 0 0 88 44 44 0 0 0 0-88Zm64 100h32a12 12 0 0 1 12 12v32a12 12 0 0 1-12 12h-32a12 12 0 0 1-12-12v-32a12 12 0 0 1 12-12Z"
      />
    </svg>
  );
}
