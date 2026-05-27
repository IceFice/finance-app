import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler';
import { sendSuccess, sendError } from '../../lib/response';
import { authenticate } from '../../middleware/authenticate';
import { authLimiter, refreshLimiter } from '../../middleware/rateLimiter';
import * as authService from './auth.service';
import { registerSchema, loginSchema, changePasswordSchema } from './auth.schema';
import { isProd } from '../../config';

export const authRouter = Router();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: isProd,          // use validated config, not raw process.env
  sameSite: 'strict' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth',
};

authRouter.post('/register', authLimiter, asyncHandler(async (req: Request, res: Response) => {
  const input = registerSchema.parse(req.body);
  const { accessToken, refreshToken, userId } = await authService.register(input);
  res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
  sendSuccess(res, { accessToken, userId }, 201);
}));

authRouter.post('/login', authLimiter, asyncHandler(async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body);
  const { accessToken, refreshToken, userId } = await authService.login(input);
  res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
  sendSuccess(res, { accessToken, userId });
}));

authRouter.post('/refresh', refreshLimiter, asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken as string | undefined;
  if (!token) {
    return sendError(res, 401, 'UNAUTHORIZED', 'No refresh token', req.requestId);
  }
  const { accessToken, refreshToken } = await authService.refresh(token);
  res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
  sendSuccess(res, { accessToken });
}));

authRouter.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken as string | undefined;
  if (token) await authService.logout(token);
  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
  res.status(204).end();
}));

authRouter.get('/me', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const profile = await authService.getProfile(req.userId);
  sendSuccess(res, profile);
}));

authRouter.post('/change-password', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  await authService.changePassword(req.userId, currentPassword, newPassword);
  sendSuccess(res, { message: 'Password changed' });
}));
