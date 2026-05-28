const API_KEY = import.meta.env.VITE_DASHBOARD_API_KEY ?? 'dev-dashboard-key';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export interface RepoSettings {
  id: number;
  repo_owner: string;
  repo_name: string;
  enabled: boolean;
  review_level: 'strict' | 'standard' | 'light';
  ignored_paths: string[];
  assign_reviewer: string | null;
}

export interface UsageStats {
  total_reviews: number;
  total_comments: number;
  total_tokens: number;
  avg_duration_ms: number;
}

export interface DashboardData {
  installation: { id: number; account_login: string; github_installation_id: number };
  repos: RepoSettings[];
  usage: UsageStats;
  recentReviews: Array<{
    id: number;
    repo_owner: string;
    repo_name: string;
    pr_number: number;
    comments_posted: number;
    tokens_used: number;
    duration_ms: number;
    status: string;
    created_at: string;
  }>;
}

export function fetchInstallation(githubInstallationId: number): Promise<DashboardData> {
  return fetchApi(`/installations/${githubInstallationId}`);
}

export function updateRepoSettings(
  githubInstallationId: number,
  owner: string,
  repo: string,
  updates: Partial<Pick<RepoSettings, 'enabled' | 'review_level' | 'ignored_paths' | 'assign_reviewer'>>
): Promise<{ settings: RepoSettings }> {
  return fetchApi(`/installations/${githubInstallationId}/repos/${owner}/${repo}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}
