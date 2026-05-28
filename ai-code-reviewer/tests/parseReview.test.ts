import { describe, it, expect } from 'vitest';
import { extractJsonPayload, parseReviewResponse } from '../src/llm/parseReview.js';

describe('extractJsonPayload', () => {
  it('returns raw JSON as-is', () => {
    const json = '{"comments":[],"summary":"ok"}';
    expect(extractJsonPayload(json)).toBe(json);
  });

  it('strips markdown fences', () => {
    const input = '```json\n{"comments":[],"summary":"ok"}\n```';
    expect(extractJsonPayload(input)).toBe('{"comments":[],"summary":"ok"}');
  });
});

describe('parseReviewResponse', () => {
  it('parses valid review JSON', () => {
    const raw = JSON.stringify({
      comments: [
        {
          filename: 'a.ts',
          line: 5,
          severity: 'warning',
          issue: 'Null check',
          body: 'Add guard',
        },
      ],
      summary: 'Looks mostly fine',
    });

    const result = parseReviewResponse(raw, 100);
    expect(result.comments).toHaveLength(1);
    expect(result.summary).toBe('Looks mostly fine');
    expect(result.tokensUsed).toBe(100);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseReviewResponse('not json', 0)).toThrow('not valid JSON');
  });
});
