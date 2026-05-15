import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler';
import { sendSuccess } from '../../lib/response';
import { authenticate } from '../../middleware/authenticate';
import { generalLimiter } from '../../middleware/rateLimiter';
import * as budgetsService from './budgets.service';
import { createBudgetSchema, updateBudgetSchema } from './budgets.schema';

export const budgetsRouter = Router();
budgetsRouter.use(authenticate, generalLimiter);

budgetsRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await budgetsService.list(req.userId));
}));

// /progress must come BEFORE /:id so Express doesn't treat "progress" as an id
budgetsRouter.get('/progress', asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await budgetsService.progress(req.userId));
}));

budgetsRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await budgetsService.getById(req.userId, req.params['id'] as string));
}));

budgetsRouter.post('/', asyncHandler(async (req: Request, res: Response) => {
  const input = createBudgetSchema.parse(req.body);
  sendSuccess(res, await budgetsService.create(req.userId, input), 201);
}));

budgetsRouter.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const input = updateBudgetSchema.parse(req.body);
  sendSuccess(res, await budgetsService.update(req.userId, req.params['id'] as string, input));
}));

budgetsRouter.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  await budgetsService.remove(req.userId, req.params['id'] as string);
  res.status(204).end();
}));
