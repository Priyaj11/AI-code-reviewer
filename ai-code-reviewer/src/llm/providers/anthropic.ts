import Anthropic from '@anthropic-ai/sdk';
import { getConfig } from '../../config.js';
import { parseReviewResponse } from '../parseReview.js';
import type { ChunkReviewResult, ReviewLlmProvider } from '../types.js';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = getConfig().ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export const anthropicProvider: ReviewLlmProvider = {
  name: 'anthropic',

  async reviewDiff(systemPrompt: string, userPrompt: string): Promise<ChunkReviewResult> {
    const config = getConfig();
    const response = await getClient().messages.create({
      model: config.ANTHROPIC_MODEL,
      max_tokens: 2000,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    const raw = textBlock?.type === 'text' ? textBlock.text : '';
    if (!raw) {
      throw new Error('Empty Anthropic response');
    }

    const tokensUsed =
      (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

    return parseReviewResponse(raw, tokensUsed);
  },
};
