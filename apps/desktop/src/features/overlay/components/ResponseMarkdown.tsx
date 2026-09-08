import { memo, useState, type ReactNode } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Check, Copy } from 'lucide-react';
import { cn } from '@ai-anywhere/ui';
import { balanceFences, readCodeBlock } from './markdown-source.js';

/** Copy-to-clipboard control shared by the code block and its mermaid variant. */
function CopyButton({
  text,
  className,
}: {
  readonly text: string;
  readonly className?: string;
}): JSX.Element {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1_200);
      }}
      aria-label={copied ? 'Copied' : 'Copy code'}
      className={cn(
        'flex items-center gap-1 rounded-control px-1.5 py-0.5 text-caption text-fg-muted',
        'transition-colors duration-fast hover:bg-surface-hover hover:text-fg-primary',
        className,
      )}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

/**
 * A fenced block: language label and its own copy button in a header strip,
 * the highlighted source scrolling horizontally underneath.
 *
 * `mermaid` is recognised but not drawn — the source is shown in a marked
 * placeholder instead, so a diagram in the answer is obvious rather than
 * silently rendered as unlabelled code.
 */
function CodeBlock({ children }: { readonly children?: ReactNode }): JSX.Element {
  const { language, source } = readCodeBlock(children);
  const isMermaid = language === 'mermaid';

  return (
    <div className="my-2 overflow-hidden rounded-card border border-border bg-surface">
      <div className="flex items-center justify-between gap-2 border-b border-border/70 bg-surface-hover/50 px-2.5 py-1">
        <span className="truncate text-caption text-fg-muted">
          {isMermaid ? 'mermaid · preview unavailable' : language || 'text'}
        </span>
        <CopyButton text={source} />
      </div>
      {isMermaid ? (
        <pre className="m-2 overflow-x-auto rounded-control border border-dashed border-border p-2.5 text-caption text-fg-secondary">
          {source}
        </pre>
      ) : (
        <pre className="overflow-x-auto p-2.5 text-caption leading-relaxed">{children}</pre>
      )}
    </div>
  );
}

export interface ResponseMarkdownProps {
  readonly content: string;
  readonly className?: string;
}

/**
 * GitHub-flavoured markdown rendering for the model's answer: headings, lists,
 * tables, task lists, links and highlighted code.
 *
 * Memoised on the raw text because a streaming answer re-renders on every
 * delta, and re-parsing is the expensive half of that.
 */
export const ResponseMarkdown = memo(function ResponseMarkdown({
  content,
  className,
}: ResponseMarkdownProps): JSX.Element {
  return (
    <div className={cn('markdown', className)}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        // `ignoreMissing` so a fence tagged with a language highlight.js does
        // not know renders as plain code instead of throwing the whole answer
        // away.
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
          // Wide tables scroll inside the answer rather than widening the popup.
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto rounded-card border border-border">
              <table>{children}</table>
            </div>
          ),
          // target=_blank is what hands the URL to the real browser: the main
          // process denies the window and calls shell.openExternal.
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer noopener">
              {children}
            </a>
          ),
        }}
      >
        {balanceFences(content)}
      </Markdown>
    </div>
  );
});
