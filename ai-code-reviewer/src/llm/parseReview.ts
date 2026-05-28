import { reviewResponseSchema, type ChunkReviewResult } from './types.js';
import { logger } from '../utils/logger.js';

/** Strip optional markdown code fences from model output. */
export function extractJsonPayload(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

export function parseReviewResponse(raw: string, tokensUsed: number): ChunkReviewResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonPayload(raw));
  } catch {
    logger.error({ raw: raw.slice(0, 500) }, 'LLM returned invalid JSON');
    throw new Error('LLM response was not valid JSON');
  }

  const result = reviewResponseSchema.safeParse(parsed);
  if (!result.success) {
    logger.warn({ issues: result.error.issues }, 'LLM JSON schema mismatch');
    return { comments: [], summary: '', tokensUsed };
  }

  return {
    comments: result.data.comments,
    summary: result.data.summary,
    tokensUsed,
  };
}
