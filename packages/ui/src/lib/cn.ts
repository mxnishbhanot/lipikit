import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * The type scale is renamed (`text-body`, `text-caption`, `text-hero`…), and
 * tailwind-merge only knows the stock `text-sm`/`text-lg` names — so it filed
 * every one of ours under text *colour* and let a later size drop an earlier
 * colour. That is what made `<Button size="sm">` and `size="lg"` render with
 * no `text-accent-foreground` at all: white-on-emerald, unreadable in dark.
 *
 * Registering the sizes as font sizes is the whole fix; the two page-only
 * sizes from the landing config are listed here too, since one merger serves
 * both apps.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'caption',
            'body',
            'body-lg',
            'title',
            'heading',
            'display',
            'hero',
            'hero-lg',
            'section-title',
          ],
        },
      ],
    },
  },
});

/** shadcn/ui's class merger: later Tailwind utilities win over earlier ones. */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
