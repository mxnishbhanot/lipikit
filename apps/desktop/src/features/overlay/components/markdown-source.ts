import type { ReactNode } from 'react';

/**
 * Closes a fence the stream has not finished writing yet.
 *
 * Mid-stream the text routinely ends inside an open ``` block, and an
 * unterminated fence makes the whole remainder of the document render as one
 * unstyled paragraph — the answer visibly "breaks" and then snaps back when
 * the last token lands. Balancing the count costs one line and keeps the code
 * block styled from its first character.
 */
export function balanceFences(markdown: string): string {
  const fences = markdown.match(/^```/gm)?.length ?? 0;
  return fences % 2 === 0 ? markdown : `${markdown}\n\`\`\``;
}

/** Language + raw source of a highlighted `<pre><code>` subtree. */
export function readCodeBlock(node: ReactNode): { language: string; source: string } {
  // rehype-highlight leaves the source split across syntax spans, so the text
  // has to be gathered from the tree rather than read off one child.
  let language = '';
  let source = '';
  const walk = (child: ReactNode): void => {
    if (child === null || child === undefined || typeof child === 'boolean') return;
    if (typeof child === 'string' || typeof child === 'number') {
      source += String(child);
      return;
    }
    if (Array.isArray(child)) {
      for (const entry of child as readonly ReactNode[]) walk(entry);
      return;
    }
    const element = child as { props?: { className?: string; children?: ReactNode } };
    const matched = /language-([\w+-]+)/.exec(element.props?.className ?? '');
    if (matched?.[1] !== undefined && language === '') language = matched[1];
    walk(element.props?.children);
  };
  walk(node);
  return { language, source };
}
