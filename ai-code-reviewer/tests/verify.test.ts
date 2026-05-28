import { describe, it, expect } from 'vitest';
import * as crypto from 'crypto';
import { verifyWebhookSignature } from '../src/webhooks/verify.js';

function sign(payload: Buffer, secret: string): string {
  return `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
}

describe('verifyWebhookSignature', () => {
  const secret = 'test-webhook-secret';
  const payload = Buffer.from(JSON.stringify({ action: 'opened' }));

  it('accepts valid signatures', () => {
    expect(verifyWebhookSignature(payload, sign(payload, secret), secret)).toBe(true);
  });

  it('rejects invalid signatures', () => {
    expect(verifyWebhookSignature(payload, sign(payload, 'wrong'), secret)).toBe(false);
  });

  it('rejects missing signature header', () => {
    expect(verifyWebhookSignature(payload, undefined, secret)).toBe(false);
  });

  it('rejects malformed signature prefix', () => {
    expect(verifyWebhookSignature(payload, 'sha1=abc', secret)).toBe(false);
  });
});
