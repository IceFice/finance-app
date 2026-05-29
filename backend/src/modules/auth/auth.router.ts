import { Router, Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler';
import { sendSuccess, sendError } from '../../lib/response';
import { authenticate } from '../../middleware/authenticate';
import { authLimiter, refreshLimiter } from '../../middleware/rateLimiter';
import * as authService from './auth.service';
import {
  registerSchema, loginSchema, changePasswordSchema,
  forgotPasswordSchema, resetPasswordSchema,
} from './auth.schema';
import { isProd } from '../../config';

export const authRouter = Router();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: isProd,          // use validated config, not raw process.env
  sameSite: 'strict' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: '/api/v1/auth',
};

// Capture device metadata for the sessions list + audit trail.
function sessionMeta(req: Request): authService.SessionMeta {
  return {
    userAgent: (req.headers['user-agent'] ?? '').slice(0, 400) || undefined,
    ip: req.ip,
  };
}

authRouter.post('/register', authLimiter, asyncHandler(async (req: Request, res: Response) => {
  const input = registerSchema.parse(req.body);
  const { accessToken, refreshToken, userId } = await authService.register(input, sessionMeta(req));
  res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
  sendSuccess(res, { accessToken, userId }, 201);
}));

authRouter.post('/login', authLimiter, asyncHandler(async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body);
  const { accessToken, refreshToken, userId } = await authService.login(input, sessionMeta(req));
  res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
  sendSuccess(res, { accessToken, userId });
}));

authRouter.post('/refresh', refreshLimiter, asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken as string | undefined;
  if (!token) {
    return sendError(res, 401, 'UNAUTHORIZED', 'No refresh token', req.requestId);
  }
  const { accessToken, refreshToken } = await authService.refresh(token, sessionMeta(req));
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

// ── Sessions ────────────────────────────────────────────────────────────────
authRouter.get('/sessions', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const current = req.cookies?.refreshToken as string | undefined;
  sendSuccess(res, await authService.listSessions(req.userId, current));
}));

// Revoke one session (other device). Path param is the session's family_id.
authRouter.delete('/sessions/:familyId', authenticate, asyncHandler(async (req: Request, res: Response) => {
  await authService.revokeSession(req.userId, req.params['familyId'] as string);
  res.status(204).end();
}));

// "Выйти на всех других устройствах" — keeps the caller's own session alive.
authRouter.post('/sessions/revoke-others', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const current = req.cookies?.refreshToken as string | undefined;
  const revoked = await authService.revokeOtherSessions(req.userId, current);
  sendSuccess(res, { revoked });
}));

authRouter.post('/change-password', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  await authService.changePassword(req.userId, currentPassword, newPassword);
  sendSuccess(res, { message: 'Password changed' });
}));

// ── Forgot / Reset password ────────────────────────────────────────────────
// Both endpoints use authLimiter (5/15min, fail-closed) — the request flow
// is sensitive to abuse (enumeration via timing, brute force on the token).

authRouter.post('/forgot-password', authLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { email } = forgotPasswordSchema.parse(req.body);
  await authService.requestPasswordReset(email, req.ip);
  // Always 200 — no information disclosure about which emails exist.
  sendSuccess(res, { message: 'If the email is registered, a reset link has been sent.' });
}));

authRouter.post('/reset-password', authLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = resetPasswordSchema.parse(req.body);
  await authService.resetPassword(token, password);
  sendSuccess(res, { message: 'Password reset successful' });
}));
