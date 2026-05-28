import OpenAI from 'openai';
import { getConfig } from '../../config.js';
import { parseReviewResponse } from '../parseReview.js';
import type { ChunkReviewResult, ReviewLlmProvider } from '../types.js';

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = getConfig().OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required when LLM_PROVIDER=openai');
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

export const openaiProvider: ReviewLlmProvider = {
  name: 'openai',

  async reviewDiff(systemPrompt: string, userPrompt: string): Promise<ChunkReviewResult> {
    const config = getConfig();
    const response = await getClient().chat.completions.create({
      model: config.OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 2000,
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) {
      throw new Error('Empty OpenAI response');
    }

    return parseReviewResponse(raw, response.usage?.total_tokens ?? 0);
  },
};
