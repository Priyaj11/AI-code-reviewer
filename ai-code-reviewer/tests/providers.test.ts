import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resetConfigForTests } from '../src/config.js';
import { resetLlmProviderForTests, resolveProvider } from '../src/llm/providers/index.js';

describe('LLM provider selection', () => {
  beforeEach(() => {
    resetConfigForTests();
    resetLlmProviderForTests();
  });

  afterEach(() => {
    resetConfigForTests();
    resetLlmProviderForTests();
  });

  it('resolves openai provider', () => {
    expect(resolveProvider('openai').name).toBe('openai');
  });

  it('resolves anthropic provider', () => {
    expect(resolveProvider('anthropic').name).toBe('anthropic');
  });
});
