import { z } from 'zod';

export const commentSchema = z.object({
  filename: z.string(),
  line: z.coerce.number().int().positive(),
  severity: z.enum(['critical', 'warning', 'suggestion']),
  issue: z.string(),
  body: z.string(),
});

export const reviewResponseSchema = z.object({
  comments: z.array(commentSchema).default([]),
  summary: z.string().default(''),
});

export type ReviewComment = z.infer<typeof commentSchema>;

export interface ChunkReviewResult {
  comments: ReviewComment[];
  summary: string;
  tokensUsed: number;
}

export type LlmProvider = 'openai' | 'anthropic';

export interface ReviewLlmProvider {
  readonly name: LlmProvider;
  reviewDiff(systemPrompt: string, userPrompt: string): Promise<ChunkReviewResult>;
}
