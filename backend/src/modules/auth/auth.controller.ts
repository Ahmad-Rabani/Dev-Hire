import type { Request } from 'express';
import { clearRefreshCookie, REFRESH_COOKIE_NAME, setRefreshCookie } from '../../utils/cookies';
import { sendSuccess } from '../../utils/apiResponse';
import { asyncHandler } from '../../utils/asyncHandler';
import * as authService from './auth.service';
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from './auth.validation';

function sessionMeta(req: Request) {
  return {
    userAgent: req.get('user-agent') ?? undefined,
    ip: req.ip,
  };
}

export const register = asyncHandler(async (req, res) => {
  const body = req.body as RegisterInput;
  const result = await authService.registerUser(body, sessionMeta(req));
  setRefreshCookie(res, result.refreshToken);
  sendSuccess(
    res,
    {
      accessToken: result.accessToken,
      user: result.user,
      emailDelivery: result.emailDelivery,
    },
    { statusCode: 201, message: 'Registration successful' },
  );
});

export const login = asyncHandler(async (req, res) => {
  const body = req.body as LoginInput;
  const result = await authService.loginUser(body, sessionMeta(req));
  setRefreshCookie(res, result.refreshToken);
  sendSuccess(
    res,
    { accessToken: result.accessToken, user: result.user },
    { message: 'Login successful' },
  );
});

export const refresh = asyncHandler(async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  const result = await authService.refreshSession(raw, sessionMeta(req));
  setRefreshCookie(res, result.refreshToken);
  sendSuccess(res, { accessToken: result.accessToken, user: result.user });
});

export const logout = asyncHandler(async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  await authService.logoutUser(raw);
  clearRefreshCookie(res);
  sendSuccess(res, null, { message: 'Logged out' });
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user!.id);
  sendSuccess(res, { user });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const body = req.body as VerifyEmailInput;
  const user = await authService.verifyEmail(body);
  sendSuccess(res, { user }, { message: 'Email verified successfully' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const body = req.body as ForgotPasswordInput;
  const result = await authService.forgotPassword(body);
  sendSuccess(res, result, { message: result.message });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const body = req.body as ResetPasswordInput;
  const result = await authService.resetPassword(body);
  clearRefreshCookie(res);
  sendSuccess(res, result, { message: result.message });
});
