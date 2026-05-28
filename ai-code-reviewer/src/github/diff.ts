import type { Octokit } from '@octokit/rest';

export interface FileDiff {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string;
}

const DEFAULT_SKIP_PATTERNS = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'Cargo.lock',
  'go.sum',
  '.min.js',
  '.min.css',
  '/dist/',
  '/node_modules/',
  '.generated.',
  '.snap',
];

export function shouldSkipFile(filename: string, extraIgnored: string[] = []): boolean {
  const patterns = [...DEFAULT_SKIP_PATTERNS, ...extraIgnored];
  return patterns.some((pattern) => filename.includes(pattern));
}

export async function getPRDiff(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  ignoredPaths: string[] = []
): Promise<FileDiff[]> {
  const files: FileDiff[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
      per_page: perPage,
      page,
    });

    for (const file of data) {
      if (shouldSkipFile(file.filename, ignoredPaths)) continue;
      if (!file.patch && file.status !== 'removed') continue;

      files.push({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch ?? '',
      });
    }

    if (data.length < perPage) break;
    page += 1;
  }

  return files;
}
