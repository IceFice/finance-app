import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler';
import { sendSuccess } from '../../lib/response';
import { authenticate } from '../../middleware/authenticate';
import { generalLimiter } from '../../middleware/rateLimiter';
import * as categoriesService from './categories.service';
import { createCategorySchema, updateCategorySchema } from './categories.schema';

export const categoriesRouter = Router();
categoriesRouter.use(authenticate, generalLimiter);

categoriesRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await categoriesService.list(req.userId));
}));

categoriesRouter.post('/', asyncHandler(async (req: Request, res: Response) => {
  const input = createCategorySchema.parse(req.body);
  sendSuccess(res, await categoriesService.create(req.userId, input), 201);
}));

categoriesRouter.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const input = updateCategorySchema.parse(req.body);
  sendSuccess(res, await categoriesService.update(req.userId, req.params['id'] as string, input));
}));

categoriesRouter.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  await categoriesService.remove(req.userId, req.params['id'] as string);
  res.status(204).end();
}));
