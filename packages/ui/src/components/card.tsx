import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

type DivProps = HTMLAttributes<HTMLDivElement>;

const make = (name: string, classes: string) => {
  const Component = forwardRef<HTMLDivElement, DivProps>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn(classes, className)} {...props} />
  ));
  Component.displayName = name;
  return Component;
};

export const Card = make('Card', 'rounded-lg border border-border bg-card text-card-foreground shadow-sm');
export const CardHeader = make('CardHeader', 'flex flex-col space-y-1.5 p-6');
export const CardTitle = make('CardTitle', 'text-lg font-semibold leading-none tracking-tight');
export const CardDescription = make('CardDescription', 'text-sm text-muted-foreground');
export const CardContent = make('CardContent', 'p-6 pt-0');
export const CardFooter = make('CardFooter', 'flex items-center p-6 pt-0');
