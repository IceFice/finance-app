import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler';
import { sendSuccess } from '../../lib/response';
import { authenticate } from '../../middleware/authenticate';
import { generalLimiter } from '../../middleware/rateLimiter';
import * as goalsService from './goals.service';
import { createGoalSchema, updateGoalSchema } from './goals.schema';

export const goalsRouter = Router();
goalsRouter.use(authenticate, generalLimiter);

goalsRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await goalsService.list(req.userId));
}));

goalsRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await goalsService.getById(req.userId, req.params['id'] as string));
}));

goalsRouter.post('/', asyncHandler(async (req: Request, res: Response) => {
  const input = createGoalSchema.parse(req.body);
  sendSuccess(res, await goalsService.create(req.userId, input), 201);
}));

goalsRouter.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const input = updateGoalSchema.parse(req.body);
  sendSuccess(res, await goalsService.update(req.userId, req.params['id'] as string, input));
}));

goalsRouter.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  await goalsService.remove(req.userId, req.params['id'] as string);
  res.status(204).end();
}));
