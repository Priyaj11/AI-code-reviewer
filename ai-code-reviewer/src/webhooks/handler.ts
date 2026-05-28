import type { Request, Response } from 'express';
import { getConfig } from '../config.js';
import { verifyWebhookSignature } from './verify.js';
import { markDeliveryProcessed } from '../db/redis.js';
import { reviewQueue } from '../workers/queue.js';
import {
  upsertInstallation,
  deleteInstallation,
} from '../db/queries.js';
import { logger } from '../utils/logger.js';

interface PullRequestPayload {
  action: string;
  installation?: { id: number };
  repository: {
    owner: { login: string };
    name: string;
  };
  pull_request?: {
    number: number;
    head: { sha: string };
  };
}

interface InstallationPayload {
  action: string;
  installation: {
    id: number;
    account: { login: string; type: string };
  };
}

export async function webhookHandler(req: Request, res: Response): Promise<void> {
  const rawBody = req.body as Buffer;
  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  const event = req.headers['x-github-event'] as string | undefined;
  const deliveryId = req.headers['x-github-delivery'] as string | undefined;

  if (!deliveryId) {
    res.status(400).send('Missing delivery ID');
    return;
  }

  const isValid = verifyWebhookSignature(
    rawBody,
    signature,
    getConfig().GITHUB_WEBHOOK_SECRET
  );

  if (!isValid) {
    logger.warn({ deliveryId }, 'Invalid webhook signature');
    res.status(401).send('Invalid signature');
    return;
  }

  const isNew = await markDeliveryProcessed(deliveryId);
  if (!isNew) {
    res.status(200).send('Already processed');
    return;
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody.toString('utf-8')) as Record<string, unknown>;
  } catch {
    res.status(400).send('Invalid JSON');
    return;
  }

  try {
    if (event === 'installation') {
      await handleInstallationEvent(payload as unknown as InstallationPayload);
    } else if (event === 'pull_request') {
      await handlePullRequestEvent(payload as unknown as PullRequestPayload);
    } else if (event === 'ping') {
      logger.info('GitHub ping received');
    }
  } catch (err) {
    logger.error({ err, event, deliveryId }, 'Webhook handler error');
    res.status(500).send('Internal error');
    return;
  }

  res.status(200).send('OK');
}

async function handleInstallationEvent(payload: InstallationPayload): Promise<void> {
  const { action, installation } = payload;

  if (action === 'created') {
    await upsertInstallation(
      installation.id,
      installation.account.login,
      installation.account.type
    );
    logger.info({ installationId: installation.id }, 'Installation created');
  } else if (action === 'deleted') {
    await deleteInstallation(installation.id);
    logger.info({ installationId: installation.id }, 'Installation deleted');
  }
}

async function handlePullRequestEvent(payload: PullRequestPayload): Promise<void> {
  const { action, installation, repository, pull_request: pr } = payload;

  if (!installation?.id || !pr) return;

  if (action !== 'opened' && action !== 'synchronize' && action !== 'reopened') {
    return;
  }

  await reviewQueue.add(
    'review-pr',
    {
      installationId: installation.id,
      repoOwner: repository.owner.login,
      repoName: repository.name,
      prNumber: pr.number,
      headSha: pr.head.sha,
    },
    {
      jobId: `review-${installation.id}-${repository.owner.login}-${repository.name}-${pr.number}-${pr.head.sha}`,
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    }
  );

  logger.info(
    {
      installationId: installation.id,
      repo: `${repository.owner.login}/${repository.name}`,
      pr: pr.number,
      action,
    },
    'Enqueued PR review job'
  );
}
