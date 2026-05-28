import { Octokit } from '@octokit/rest';
import { createAppAuth } from '@octokit/auth-app';
import { getConfig } from '../config.js';

/** GitHub Apps authenticate per-installation (per org/user). */
export function getOctokit(installationId: number): Octokit {
  const config = getConfig();
  const privateKey = config.GITHUB_PRIVATE_KEY.replace(/\\n/g, '\n');

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: config.GITHUB_APP_ID,
      privateKey,
      installationId,
    },
  });
}
