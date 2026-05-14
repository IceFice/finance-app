import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler';
import { sendSuccess } from '../../lib/response';
import { authenticate } from '../../middleware/authenticate';
import { generalLimiter } from '../../middleware/rateLimiter';
import * as accountsService from './accounts.service';
import { createAccountSchema, updateAccountSchema } from './accounts.schema';

export const accountsRouter = Router();
accountsRouter.use(authenticate, generalLimiter);

accountsRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const accounts = await accountsService.list(req.userId);
  sendSuccess(res, accounts);
}));

accountsRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const account = await accountsService.getById(req.userId, req.params['id'] as string);
  sendSuccess(res, account);
}));

accountsRouter.post('/', asyncHandler(async (req: Request, res: Response) => {
  const input = createAccountSchema.parse(req.body);
  const account = await accountsService.create(req.userId, input);
  sendSuccess(res, account, 201);
}));

accountsRouter.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const input = updateAccountSchema.parse(req.body);
  const account = await accountsService.update(req.userId, req.params['id'] as string, input);
  sendSuccess(res, account);
}));

accountsRouter.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  await accountsService.remove(req.userId, req.params['id'] as string);
  res.status(204).end();
}));
