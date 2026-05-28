import { getPool } from './pool.js';

export type ReviewLevel = 'strict' | 'standard' | 'light';

export interface RepoSettings {
  id: number;
  installation_id: number;
  repo_owner: string;
  repo_name: string;
  enabled: boolean;
  review_level: ReviewLevel;
  ignored_paths: string[];
  assign_reviewer: string | null;
}

export interface Installation {
  id: number;
  github_installation_id: number;
  account_login: string;
  account_type: string;
}

export async function upsertInstallation(
  githubInstallationId: number,
  accountLogin: string,
  accountType: string
): Promise<Installation> {
  const result = await getPool().query<Installation>(
    `INSERT INTO installations (github_installation_id, account_login, account_type)
     VALUES ($1, $2, $3)
     ON CONFLICT (github_installation_id)
     DO UPDATE SET account_login = EXCLUDED.account_login,
                   account_type = EXCLUDED.account_type,
                   updated_at = NOW()
     RETURNING *`,
    [githubInstallationId, accountLogin, accountType]
  );
  return result.rows[0];
}

export async function deleteInstallation(githubInstallationId: number): Promise<void> {
  await getPool().query('DELETE FROM installations WHERE github_installation_id = $1', [
    githubInstallationId,
  ]);
}

export async function getInstallationByGithubId(
  githubInstallationId: number
): Promise<Installation | null> {
  const result = await getPool().query<Installation>(
    'SELECT * FROM installations WHERE github_installation_id = $1',
    [githubInstallationId]
  );
  return result.rows[0] ?? null;
}

export async function getRepoSettings(
  installationId: number,
  repoOwner: string,
  repoName: string
): Promise<RepoSettings | null> {
  const result = await getPool().query<RepoSettings>(
    `SELECT * FROM repo_settings
     WHERE installation_id = $1 AND repo_owner = $2 AND repo_name = $3`,
    [installationId, repoOwner, repoName]
  );
  return result.rows[0] ?? null;
}

export async function getOrCreateRepoSettings(
  installationId: number,
  repoOwner: string,
  repoName: string
): Promise<RepoSettings> {
  const existing = await getRepoSettings(installationId, repoOwner, repoName);
  if (existing) return existing;

  const result = await getPool().query<RepoSettings>(
    `INSERT INTO repo_settings (installation_id, repo_owner, repo_name)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [installationId, repoOwner, repoName]
  );
  return result.rows[0];
}

export async function updateRepoSettings(
  installationId: number,
  repoOwner: string,
  repoName: string,
  updates: Partial<
    Pick<RepoSettings, 'enabled' | 'review_level' | 'ignored_paths' | 'assign_reviewer'>
  >
): Promise<RepoSettings> {
  await getOrCreateRepoSettings(installationId, repoOwner, repoName);

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (updates.enabled !== undefined) {
    fields.push(`enabled = $${idx++}`);
    values.push(updates.enabled);
  }
  if (updates.review_level !== undefined) {
    fields.push(`review_level = $${idx++}`);
    values.push(updates.review_level);
  }
  if (updates.ignored_paths !== undefined) {
    fields.push(`ignored_paths = $${idx++}`);
    values.push(updates.ignored_paths);
  }
  if (updates.assign_reviewer !== undefined) {
    fields.push(`assign_reviewer = $${idx++}`);
    values.push(updates.assign_reviewer);
  }

  fields.push('updated_at = NOW()');
  values.push(installationId, repoOwner, repoName);

  const result = await getPool().query<RepoSettings>(
    `UPDATE repo_settings SET ${fields.join(', ')}
     WHERE installation_id = $${idx++} AND repo_owner = $${idx++} AND repo_name = $${idx}
     RETURNING *`,
    values
  );
  return result.rows[0];
}

export async function listRepoSettings(installationId: number): Promise<RepoSettings[]> {
  const result = await getPool().query<RepoSettings>(
    'SELECT * FROM repo_settings WHERE installation_id = $1 ORDER BY repo_name',
    [installationId]
  );
  return result.rows;
}

export async function recordReview(params: {
  installationId: number | null;
  repoOwner: string;
  repoName: string;
  prNumber: number;
  headSha: string;
  commentsPosted: number;
  tokensUsed: number;
  chunksProcessed: number;
  durationMs: number;
  status: 'completed' | 'failed' | 'skipped';
  errorMessage?: string;
}): Promise<void> {
  await getPool().query(
    `INSERT INTO reviews (
      installation_id, repo_owner, repo_name, pr_number, head_sha,
      comments_posted, tokens_used, chunks_processed, duration_ms, status, error_message
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      params.installationId,
      params.repoOwner,
      params.repoName,
      params.prNumber,
      params.headSha,
      params.commentsPosted,
      params.tokensUsed,
      params.chunksProcessed,
      params.durationMs,
      params.status,
      params.errorMessage ?? null,
    ]
  );
}

export interface UsageStats {
  total_reviews: number;
  total_comments: number;
  total_tokens: number;
  avg_duration_ms: number;
}

export async function getUsageStats(
  installationId: number,
  days = 30
): Promise<UsageStats> {
  const result = await getPool().query<UsageStats>(
    `SELECT
       COUNT(*)::int AS total_reviews,
       COALESCE(SUM(comments_posted), 0)::int AS total_comments,
       COALESCE(SUM(tokens_used), 0)::int AS total_tokens,
       COALESCE(AVG(duration_ms), 0)::int AS avg_duration_ms
     FROM reviews
     WHERE installation_id = $1
       AND created_at >= NOW() - ($2 || ' days')::interval
       AND status = 'completed'`,
    [installationId, days]
  );
  return result.rows[0];
}

export async function getRecentReviews(
  installationId: number,
  limit = 20
): Promise<
  Array<{
    id: number;
    repo_owner: string;
    repo_name: string;
    pr_number: number;
    comments_posted: number;
    tokens_used: number;
    duration_ms: number;
    status: string;
    created_at: Date;
  }>
> {
  const result = await getPool().query(
    `SELECT id, repo_owner, repo_name, pr_number, comments_posted,
            tokens_used, duration_ms, status, created_at
     FROM reviews
     WHERE installation_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [installationId, limit]
  );
  return result.rows;
}
