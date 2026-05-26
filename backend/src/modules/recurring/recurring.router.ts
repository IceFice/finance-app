import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler';
import { sendSuccess } from '../../lib/response';
import { authenticate } from '../../middleware/authenticate';
import { generalLimiter } from '../../middleware/rateLimiter';
import * as recService from './recurring.service';
import { createRecurringSchema, updateRecurringSchema } from './recurring.schema';

export const recurringRouter = Router();
recurringRouter.use(authenticate, generalLimiter);

recurringRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await recService.list(req.userId));
}));

recurringRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await recService.getById(req.userId, req.params['id'] as string));
}));

recurringRouter.post('/', asyncHandler(async (req: Request, res: Response) => {
  const input = createRecurringSchema.parse(req.body);
  sendSuccess(res, await recService.create(req.userId, input), 201);
}));

recurringRouter.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const input = updateRecurringSchema.parse(req.body);
  sendSuccess(res, await recService.update(req.userId, req.params['id'] as string, input));
}));

recurringRouter.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  await recService.remove(req.userId, req.params['id'] as string);
  res.status(204).end();
}));

// Manual trigger: materialize all due rows for the caller right now. The
// hourly scheduler does this automatically, but a user-visible "Apply now"
// button is useful for demos and onboarding.
recurringRouter.post('/apply', asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await recService.applyDueForUser(req.userId));
}));
