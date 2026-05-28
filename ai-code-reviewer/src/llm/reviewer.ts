import { buildSystemPrompt } from './prompts.js';
import type { Chunk } from './chunker.js';
import type { ReviewLevel } from '../db/queries.js';
import { getLlmProvider } from './providers/index.js';
import type { ReviewComment, ChunkReviewResult } from './types.js';

export type { ReviewComment, ChunkReviewResult } from './types.js';

export function formatChunkForPrompt(chunk: Chunk): string {
  return chunk.files
    .map(
      (f) =>
        `### File: ${f.filename} (+${f.additions}/-${f.deletions})\n\`\`\`diff\n${f.patch}\n\`\`\``
    )
    .join('\n\n');
}

export async function reviewChunk(
  chunk: Chunk,
  reviewLevel: ReviewLevel = 'standard'
): Promise<ChunkReviewResult> {
  const provider = getLlmProvider();
  const systemPrompt = buildSystemPrompt(reviewLevel);
  const userPrompt = `Review this pull request diff chunk:\n\n${formatChunkForPrompt(chunk)}`;

  return provider.reviewDiff(systemPrompt, userPrompt);
}

export function dedupeComments(comments: ReviewComment[]): ReviewComment[] {
  const seen = new Set<string>();
  const deduped: ReviewComment[] = [];

  for (const c of comments) {
    const key = `${c.filename}:${c.line}:${c.issue}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(c);
  }

  const byLine = new Map<string, ReviewComment>();
  const severityRank = { critical: 3, warning: 2, suggestion: 1 };

  for (const c of deduped) {
    const key = `${c.filename}:${c.line}`;
    const existing = byLine.get(key);
    if (!existing || severityRank[c.severity] > severityRank[existing.severity]) {
      byLine.set(key, c);
    }
  }

  return Array.from(byLine.values());
}
