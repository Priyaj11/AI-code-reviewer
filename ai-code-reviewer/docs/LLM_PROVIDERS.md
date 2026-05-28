# LLM Providers: OpenAI vs Anthropic

## Switching providers

Set `LLM_PROVIDER` in `.env`:

```bash
# Use OpenAI (default)
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Use Anthropic (Claude)
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-haiku-20241022
```

Restart the server after changing provider.

## Recommended Anthropic models

| Model | Best for |
|-------|----------|
| `claude-3-5-haiku-20241022` | Fast, lower cost — good for high-volume PR reviews |
| `claude-3-5-sonnet-20241022` | Balanced quality and speed |
| `claude-sonnet-4-20250514` | Highest quality for complex security/logic reviews |

## Architecture

Both providers implement the same `ReviewLlmProvider` interface:

```
reviewChunk() → getLlmProvider() → openai | anthropic
                                      ↓
                              parseReviewResponse() (shared JSON parsing)
```

OpenAI uses native `response_format: json_object`. Anthropic relies on the system prompt JSON contract plus shared parsing (including markdown fence stripping).
