import { describe, it, expect } from 'vitest';
import { chunkDiff, estimateTokens, MAX_TOKENS_PER_CHUNK } from '../src/llm/chunker.js';

describe('chunkDiff', () => {
  it('keeps small files in a single chunk', () => {
    const files = [
      { filename: 'a.ts', patch: '+line\n'.repeat(10), additions: 10, deletions: 0 },
      { filename: 'b.ts', patch: '+other\n', additions: 1, deletions: 0 },
    ];
    const chunks = chunkDiff(files);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].files).toHaveLength(2);
  });

  it('splits when combined size exceeds limit', () => {
    const bigPatch = '+x\n'.repeat(MAX_TOKENS_PER_CHUNK * 2);
    const files = [
      { filename: 'big.ts', patch: bigPatch, additions: 1000, deletions: 0 },
      { filename: 'small.ts', patch: '+a\n', additions: 1, deletions: 0 },
    ];
    const chunks = chunkDiff(files);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('splits oversized single files into parts', () => {
    const huge = '+line\n'.repeat(50_000);
    const files = [{ filename: 'huge.ts', patch: huge, additions: 50000, deletions: 0 }];
    const chunks = chunkDiff(files);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.estimatedTokens <= MAX_TOKENS_PER_CHUNK + 500)).toBe(true);
  });
});

describe('estimateTokens', () => {
  it('returns positive estimate for non-empty text', () => {
    expect(estimateTokens('hello world')).toBeGreaterThan(0);
  });
});
