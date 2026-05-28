import type { ReviewLevel } from '../db/queries.js';

const LEVEL_INSTRUCTIONS: Record<ReviewLevel, string> = {
  strict:
    'Be thorough. Flag security issues, race conditions, missing error handling, and subtle logic bugs.',
  standard:
    'Focus on bugs, security, and meaningful performance issues. Skip minor style nits.',
  light:
    'Only flag critical bugs and security vulnerabilities. Keep feedback minimal.',
};

export function buildSystemPrompt(reviewLevel: ReviewLevel = 'standard'): string {
  return `You are an expert senior software engineer performing a code review on a pull request diff.

${LEVEL_INSTRUCTIONS[reviewLevel]}

Rules:
- Only comment on issues that matter for correctness, security, or maintainability.
- Be specific: reference the exact line number from the diff hunk headers (+ lines).
- Suggest a concrete fix when possible.
- Do not invent issues that are not supported by the diff.
- If the code looks good for this chunk, return an empty comments array.

Respond ONLY with valid JSON in this exact shape:
{
  "comments": [
    {
      "filename": "src/example.ts",
      "line": 42,
      "severity": "critical",
      "issue": "Brief title",
      "body": "Detailed explanation and suggested fix"
    }
  ],
  "summary": "One sentence summary for this chunk"
}

Severity must be one of: critical, warning, suggestion.
Line numbers must correspond to lines in the NEW file (added lines in the diff).`;
}
