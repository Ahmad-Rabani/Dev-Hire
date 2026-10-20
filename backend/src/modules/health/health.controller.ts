import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse';
import { getHealthStatus } from './health.service';

export function getHealth(_req: Request, res: Response): void {
  const data = getHealthStatus();
  sendSuccess(res, data, {
    message: data.status === 'ok' ? 'DevHire API is healthy' : 'DevHire API is up but database is not connected',
    statusCode: data.status === 'ok' ? 200 : 503,
  });
}
