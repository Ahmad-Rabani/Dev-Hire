import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env, isDevelopment } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authRouter } from './modules/auth/auth.routes';
import { contractsRouter } from './modules/contracts/contract.routes';
import { healthRouter } from './modules/health/health.routes';
import { jobsRouter } from './modules/jobs/job.routes';
import { proposalsRouter } from './modules/proposals/proposal.routes';
import { freelancersRouter, usersRouter } from './modules/users/user.routes';

/**
 * Create the Express application without listening.
 * Tests and the Socket.IO bootstrap can import this factory safely.
 */
export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      // API-only; adjust if you later serve static assets from Express
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  if (isDevelopment) {
    app.use(morgan('dev'));
  }

  app.get('/', (_req, res) => {
    res.json({
      success: true,
      message: 'DevHire API',
      data: { docs: '/api/v1/health' },
    });
  });

  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/freelancers', freelancersRouter);
  app.use('/api/v1/jobs', jobsRouter);
  app.use('/api/v1/proposals', proposalsRouter);
  app.use('/api/v1/contracts', contractsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
