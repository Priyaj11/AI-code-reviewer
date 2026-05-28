import { Worker } from 'bullmq';
import { getRedis } from '../db/redis.js';
import { getOctokit } from '../github/client.js';
import { getPRDiff } from '../github/diff.js';
import { postReviewComments, requestReviewer } from '../github/comments.js';
import { chunkDiff, totalEstimatedTokens } from '../llm/chunker.js';
import { reviewChunk, dedupeComments } from '../llm/reviewer.js';
import {
  getInstallationByGithubId,
  getOrCreateRepoSettings,
  recordReview,
} from '../db/queries.js';
import { REVIEW_QUEUE_NAME, type ReviewJobData } from './queue.js';
import { getConfig } from '../config.js';
import { logger } from '../utils/logger.js';
import { sleep } from '../utils/sleep.js';

async function processReview(job: { data: ReviewJobData }): Promise<void> {
  const { installationId, repoOwner, repoName, prNumber, headSha } = job.data;
  const start = Date.now();

  const installation = await getInstallationByGithubId(installationId);
  const dbInstallationId = installation?.id ?? null;

  const settings = installation
    ? await getOrCreateRepoSettings(installation.id, repoOwner, repoName)
    : null;

  if (settings && !settings.enabled) {
    await recordReview({
      installationId: dbInstallationId,
      repoOwner,
      repoName,
      prNumber,
      headSha,
      commentsPosted: 0,
      tokensUsed: 0,
      chunksProcessed: 0,
      durationMs: Date.now() - start,
      status: 'skipped',
      errorMessage: 'Reviews disabled for repository',
    });
    logger.info({ repoOwner, repoName, prNumber }, 'Review skipped — repo disabled');
    return;
  }

  const octokit = getOctokit(installationId);
  const ignoredPaths = settings?.ignored_paths ?? [];
  const reviewLevel = settings?.review_level ?? 'standard';

  const files = await getPRDiff(octokit, repoOwner, repoName, prNumber, ignoredPaths);

  if (files.length === 0) {
    await recordReview({
      installationId: dbInstallationId,
      repoOwner,
      repoName,
      prNumber,
      headSha,
      commentsPosted: 0,
      tokensUsed: 0,
      chunksProcessed: 0,
      durationMs: Date.now() - start,
      status: 'skipped',
      errorMessage: 'No reviewable files in PR',
    });
    return;
  }

  const chunks = chunkDiff(files);
  const allComments = [];
  let totalTokens = 0;
  const summaries: string[] = [];

  for (const chunk of chunks) {
    const result = await reviewChunk(chunk, reviewLevel);
    allComments.push(...result.comments);
    totalTokens += result.tokensUsed;
    if (result.summary) summaries.push(result.summary);
    await sleep(400);
  }

  const comments = dedupeComments(allComments);
  const summary =
    summaries.length > 0
      ? summaries.join(' ')
      : `Reviewed ${files.length} file(s) across ${chunks.length} chunk(s). Found ${comments.length} issue(s). Estimated ${totalEstimatedTokens(chunks)} input tokens.`;

  const posted = await postReviewComments(
    octokit,
    repoOwner,
    repoName,
    prNumber,
    headSha,
    comments,
    summary
  );

  if (settings?.assign_reviewer) {
    await requestReviewer(octokit, repoOwner, repoName, prNumber, settings.assign_reviewer);
  }

  await recordReview({
    installationId: dbInstallationId,
    repoOwner,
    repoName,
    prNumber,
    headSha,
    commentsPosted: posted,
    tokensUsed: totalTokens,
    chunksProcessed: chunks.length,
    durationMs: Date.now() - start,
    status: 'completed',
  });

  logger.info(
    {
      repo: `${repoOwner}/${repoName}`,
      prNumber,
      files: files.length,
      chunks: chunks.length,
      comments: posted,
      tokens: totalTokens,
      durationMs: Date.now() - start,
    },
    'PR review completed'
  );
}

function startWorker(): Worker<ReviewJobData> {
  getConfig();

  const worker = new Worker<ReviewJobData>(
    REVIEW_QUEUE_NAME,
    async (job) => {
      try {
        await processReview(job);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        logger.error({ err, jobId: job.id, data: job.data }, 'Review job failed');

        const installation = await getInstallationByGithubId(job.data.installationId);
        await recordReview({
          installationId: installation?.id ?? null,
          repoOwner: job.data.repoOwner,
          repoName: job.data.repoName,
          prNumber: job.data.prNumber,
          headSha: job.data.headSha,
          commentsPosted: 0,
          tokensUsed: 0,
          chunksProcessed: 0,
          durationMs: 0,
          status: 'failed',
          errorMessage: message,
        });

        throw err;
      }
    },
    {
      connection: getRedis(),
      concurrency: 5,
      limiter: { max: 10, duration: 1000 },
    }
  );

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Worker job failed');
  });

  logger.info('Review worker started');
  return worker;
}

const isMain = process.argv[1]?.includes('reviewWorker');

if (isMain) {
  startWorker();
}

export { startWorker, processReview };
