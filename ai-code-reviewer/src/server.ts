import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { getConfig } from './config.js';
import { webhookHandler } from './webhooks/handler.js';
import { dashboardRouter } from './api/dashboard.js';
import { startWorker } from './workers/reviewWorker.js';
import { logger } from './utils/logger.js';
import { closePool } from './db/pool.js';
import { closeRedis } from './db/redis.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const config = getConfig();
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // GitHub webhooks need raw body for HMAC verification
  app.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    (req, res) => void webhookHandler(req, res)
  );

  app.use(express.json());
  app.use('/api', dashboardRouter);

  const dashboardDist = path.join(__dirname, '..', 'dashboard-dist');
  app.use(express.static(dashboardDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/webhook' || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(dashboardDist, 'index.html'), (err) => {
      if (err) next();
    });
  });

  startWorker();

  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, 'AI Code Reviewer server started');
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    server.close();
    await closePool();
    await closeRedis();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Server failed to start');
  process.exit(1);
});
