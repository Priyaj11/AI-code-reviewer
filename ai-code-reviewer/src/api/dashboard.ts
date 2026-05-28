import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { getConfig } from '../config.js';
import {
  getInstallationByGithubId,
  listRepoSettings,
  updateRepoSettings,
  getUsageStats,
  getRecentReviews,
  getOrCreateRepoSettings,
} from '../db/queries.js';

function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-api-key'];
  if (key !== getConfig().DASHBOARD_API_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

const updateSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  review_level: z.enum(['strict', 'standard', 'light']).optional(),
  ignored_paths: z.array(z.string()).optional(),
  assign_reviewer: z.string().nullable().optional(),
});

export const dashboardRouter = Router();

dashboardRouter.use(requireApiKey);

dashboardRouter.get('/installations/:githubInstallationId', async (req, res) => {
  const githubId = Number(req.params.githubInstallationId);
  if (Number.isNaN(githubId)) {
    res.status(400).json({ error: 'Invalid installation ID' });
    return;
  }

  const installation = await getInstallationByGithubId(githubId);
  if (!installation) {
    res.status(404).json({ error: 'Installation not found' });
    return;
  }

  const [repos, usage, recent] = await Promise.all([
    listRepoSettings(installation.id),
    getUsageStats(installation.id),
    getRecentReviews(installation.id),
  ]);

  res.json({ installation, repos, usage, recentReviews: recent });
});

dashboardRouter.get(
  '/installations/:githubInstallationId/repos/:owner/:repo',
  async (req, res) => {
    const githubId = Number(req.params.githubInstallationId);
    const { owner, repo } = req.params;

    const installation = await getInstallationByGithubId(githubId);
    if (!installation) {
      res.status(404).json({ error: 'Installation not found' });
      return;
    }

    const settings = await getOrCreateRepoSettings(installation.id, owner, repo);
    res.json({ settings });
  }
);

dashboardRouter.patch(
  '/installations/:githubInstallationId/repos/:owner/:repo',
  async (req, res) => {
    const githubId = Number(req.params.githubInstallationId);
    const { owner, repo } = req.params;

    const parsed = updateSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const installation = await getInstallationByGithubId(githubId);
    if (!installation) {
      res.status(404).json({ error: 'Installation not found' });
      return;
    }

    const settings = await updateRepoSettings(installation.id, owner, repo, parsed.data);
    res.json({ settings });
  }
);
