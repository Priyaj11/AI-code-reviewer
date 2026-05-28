import { Queue } from 'bullmq';
import { getRedis } from '../db/redis.js';

export interface ReviewJobData {
  installationId: number;
  repoOwner: string;
  repoName: string;
  prNumber: number;
  headSha: string;
}

export const REVIEW_QUEUE_NAME = 'review-pr';

export const reviewQueue = new Queue<ReviewJobData>(REVIEW_QUEUE_NAME, {
  connection: getRedis(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 200,
    removeOnFail: 100,
  },
});
