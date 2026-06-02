import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/asyncHandler';
import { sendSuccess } from '../../lib/response';
import { authenticate } from '../../middleware/authenticate';
import { reportsLimiter } from '../../middleware/rateLimiter';
import * as reportsService from './reports.service';

export const reportsRouter = Router();
reportsRouter.use(authenticate, reportsLimiter);

const dateRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

reportsRouter.get('/monthly-summary', asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = dateRangeSchema.parse(req.query);
  sendSuccess(res, await reportsService.monthlySummary(req.userId, from, to));
}));

reportsRouter.get('/spending-by-category', asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = dateRangeSchema.parse(req.query);
  sendSuccess(res, await reportsService.spendingByCategory(req.userId, from, to));
}));

reportsRouter.get('/cash-flow', asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = dateRangeSchema.parse(req.query);
  const granularity = z.enum(['day', 'week', 'month']).default('month').parse(req.query.granularity);
  sendSuccess(res, await reportsService.cashFlow(req.userId, from, to, granularity));
}));
