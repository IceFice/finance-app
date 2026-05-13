import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, statusCode = 200) {
  res.status(statusCode).json({ data });
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  requestId: string,
  details?: unknown
) {
  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      requestId,
      timestamp: new Date().toISOString(),
    },
  });
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: { nextCursor: string | null; hasMore: boolean; limit: number }
) {
  res.json({ data, pagination });
}
