import type { LlmProvider, ReviewLlmProvider } from '../types.js';
import { openaiProvider } from './openai.js';
import { anthropicProvider } from './anthropic.js';
import { getConfig } from '../../config.js';

let cachedProvider: ReviewLlmProvider | null = null;

export function getLlmProvider(): ReviewLlmProvider {
  if (cachedProvider) return cachedProvider;

  const provider = getConfig().LLM_PROVIDER;
  cachedProvider = provider === 'anthropic' ? anthropicProvider : openaiProvider;
  return cachedProvider;
}

export function resetLlmProviderForTests(): void {
  cachedProvider = null;
}

export function resolveProvider(name: LlmProvider): ReviewLlmProvider {
  return name === 'anthropic' ? anthropicProvider : openaiProvider;
}
