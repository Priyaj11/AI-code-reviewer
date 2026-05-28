import { describe, it, expect } from 'vitest';
import { dedupeComments } from '../src/llm/reviewer.js';

describe('dedupeComments', () => {
  it('removes duplicate line comments keeping higher severity', () => {
    const result = dedupeComments([
      {
        filename: 'a.ts',
        line: 10,
        severity: 'suggestion',
        issue: 'Minor',
        body: 'Suggestion',
      },
      {
        filename: 'a.ts',
        line: 10,
        severity: 'critical',
        issue: 'Bug',
        body: 'Critical bug',
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('critical');
  });

  it('keeps distinct lines', () => {
    const result = dedupeComments([
      {
        filename: 'a.ts',
        line: 1,
        severity: 'warning',
        issue: 'A',
        body: 'A',
      },
      {
        filename: 'a.ts',
        line: 2,
        severity: 'warning',
        issue: 'B',
        body: 'B',
      },
    ]);
    expect(result).toHaveLength(2);
  });
});
