import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';
import { sendError } from '../lib/response';
import { config } from '../config';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  const requestId = req.requestId ?? 'unknown';

  if (err instanceof ZodError) {
    return sendError(res, 422, 'VALIDATION_ERROR', 'Validation failed', requestId, err.flatten().fieldErrors);
  }
  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.code, err.message, requestId, err.details);
  }
  if (typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505') {
    return sendError(res, 409, 'CONFLICT', 'Resource already exists', requestId);
  }
  console.error('[ERROR]', err);
  return sendError(
    res, 500, 'INTERNAL_ERROR',
    config.NODE_ENV === 'development' ? String(err) : 'Internal server error',
    requestId
  );
}
