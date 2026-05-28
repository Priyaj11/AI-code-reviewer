import { Redis } from 'ioredis';
import { getConfig } from '../config.js';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(getConfig().REDIS_URL, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: true,
      lazyConnect: false,
    });
  }
  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

/** Idempotency: GitHub may deliver the same webhook more than once. */
export async function markDeliveryProcessed(deliveryId: string): Promise<boolean> {
  const key = `delivery:${deliveryId}`;
  const result = await getRedis().set(key, '1', 'EX', 86_400, 'NX');
  return result === 'OK';
}

export async function isDeliveryProcessed(deliveryId: string): Promise<boolean> {
  const exists = await getRedis().get(`delivery:${deliveryId}`);
  return exists !== null;
}
