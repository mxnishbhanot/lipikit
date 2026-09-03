import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** shadcn/ui's class merger: later Tailwind utilities win over earlier ones. */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
