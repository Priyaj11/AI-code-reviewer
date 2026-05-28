import * as crypto from 'crypto';

/**
 * Verify GitHub webhook HMAC SHA-256 signature.
 * Uses timing-safe comparison to mitigate timing attacks.
 */
export function verifyWebhookSignature(
  payload: Buffer,
  signatureHeader: string | undefined,
  secret: string
): boolean {
  if (!signatureHeader?.startsWith('sha256=')) {
    return false;
  }

  const expected = `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;

  try {
    const sigBuf = Buffer.from(signatureHeader);
    const expectedBuf = Buffer.from(expected);
    if (sigBuf.length !== expectedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(sigBuf, expectedBuf);
  } catch {
    return false;
  }
}
