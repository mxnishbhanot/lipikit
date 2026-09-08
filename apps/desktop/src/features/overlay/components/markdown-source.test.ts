import { describe, expect, it } from 'vitest';
import { balanceFences, readCodeBlock } from './markdown-source.js';

describe('balanceFences', () => {
  it('leaves a closed document alone', () => {
    const markdown = '# Title\n\n```ts\nconst a = 1;\n```\n';
    expect(balanceFences(markdown)).toBe(markdown);
  });

  it('closes the fence a stream has not finished writing', () => {
    expect(balanceFences('```ts\nconst a =')).toBe('```ts\nconst a =\n```');
  });

  it('ignores a fence that is not at the start of a line', () => {
    const markdown = 'inline ``` not a fence';
    expect(balanceFences(markdown)).toBe(markdown);
  });
});

describe('readCodeBlock', () => {
  it('gathers the language and the source across highlight spans', () => {
    // The shape rehype-highlight produces: one <code> carrying the language
    // class, with the source split over nested token spans.
    const tree = {
      props: {
        className: 'hljs language-python',
        children: [
          { props: { className: 'hljs-keyword', children: 'def' } },
          ' greet():\n',
          { props: { children: ['    return ', { props: { children: '"hi"' } }] } },
        ],
      },
    };
    expect(readCodeBlock(tree as never)).toEqual({
      language: 'python',
      source: 'def greet():\n    return "hi"',
    });
  });

  it('reports no language for an untagged block', () => {
    expect(readCodeBlock({ props: { className: 'hljs', children: 'plain' } } as never)).toEqual({
      language: '',
      source: 'plain',
    });
  });
});
