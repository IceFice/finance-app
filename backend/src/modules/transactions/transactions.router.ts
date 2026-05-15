import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler';
import { sendSuccess, sendPaginated } from '../../lib/response';
import { authenticate } from '../../middleware/authenticate';
import { generalLimiter } from '../../middleware/rateLimiter';
import * as txService from './transactions.service';
import { createTransactionSchema, updateTransactionSchema, createTransferSchema, listQuerySchema } from './transactions.schema';

export const transactionsRouter = Router();
transactionsRouter.use(authenticate, generalLimiter);

transactionsRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const query = listQuerySchema.parse(req.query);
  const result = await txService.list(req.userId, query);
  sendPaginated(res, result.data, result.pagination);
}));

transactionsRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await txService.getById(req.userId, req.params['id'] as string));
}));

transactionsRouter.post('/', asyncHandler(async (req: Request, res: Response) => {
  const input = createTransactionSchema.parse(req.body);
  sendSuccess(res, await txService.create(req.userId, input), 201);
}));

transactionsRouter.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const input = updateTransactionSchema.parse(req.body);
  sendSuccess(res, await txService.update(req.userId, req.params['id'] as string, input));
}));

transactionsRouter.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  await txService.softDelete(req.userId, req.params['id'] as string);
  // Return 200 (not 204) so concurrent-delete tests can distinguish success from 404.
  sendSuccess(res, {});
}));

transactionsRouter.post('/transfer', asyncHandler(async (req: Request, res: Response) => {
  const input = createTransferSchema.parse(req.body);
  sendSuccess(res, await txService.createTransfer(req.userId, input), 201);
}));
