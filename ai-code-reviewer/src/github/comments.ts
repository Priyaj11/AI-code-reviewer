import type { Octokit } from '@octokit/rest';
import type { ReviewComment } from '../llm/reviewer.js';
import { logger } from '../utils/logger.js';

function formatComment(c: ReviewComment): string {
  const emoji: Record<ReviewComment['severity'], string> = {
    critical: '🔴',
    warning: '🟡',
    suggestion: '🔵',
  };
  return `${emoji[c.severity]} **${c.issue}**\n\n${c.body}`;
}

/** GitHub requires line to exist in the diff; filter invalid positions. */
function toValidReviewComments(comments: ReviewComment[]) {
  return comments
    .filter((c) => c.filename && c.line > 0 && c.body?.trim())
    .map((c) => ({
      path: c.filename,
      line: c.line,
      side: 'RIGHT' as const,
      body: formatComment(c),
    }));
}

export async function postReviewComments(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  headSha: string,
  comments: ReviewComment[],
  summary: string
): Promise<number> {
  const reviewComments = toValidReviewComments(comments);

  if (reviewComments.length === 0) {
    await octokit.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber,
      commit_id: headSha,
      body: `🤖 **AI Code Review**\n\n${summary}\n\nNo specific inline issues found.`,
      event: 'COMMENT',
    });
    return 0;
  }

  // GitHub allows max 50 comments per review; batch if needed
  const BATCH_SIZE = 50;
  let posted = 0;

  for (let i = 0; i < reviewComments.length; i += BATCH_SIZE) {
    const batch = reviewComments.slice(i, i + BATCH_SIZE);
    const isFirst = i === 0;

    try {
      await octokit.pulls.createReview({
        owner,
        repo,
        pull_number: prNumber,
        commit_id: headSha,
        body: isFirst ? `🤖 **AI Code Review**\n\n${summary}` : '🤖 **AI Code Review** (continued)',
        event: 'COMMENT',
        comments: batch,
      });
      posted += batch.length;
    } catch (err) {
      logger.warn({ err, batchSize: batch.length }, 'Failed to post review batch; retrying individually');
      for (const comment of batch) {
        try {
          await octokit.pulls.createReviewComment({
            owner,
            repo,
            pull_number: prNumber,
            commit_id: headSha,
            path: comment.path,
            line: comment.line,
            side: comment.side,
            body: comment.body,
          });
          posted += 1;
        } catch (innerErr) {
          logger.debug({ innerErr, path: comment.path, line: comment.line }, 'Skipped invalid comment position');
        }
      }
    }
  }

  return posted;
}

export async function requestReviewer(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  reviewer: string
): Promise<void> {
  try {
    await octokit.pulls.requestReviewers({
      owner,
      repo,
      pull_number: prNumber,
      reviewers: [reviewer],
    });
  } catch (err) {
    logger.warn({ err, reviewer }, 'Could not assign reviewer');
  }
}
