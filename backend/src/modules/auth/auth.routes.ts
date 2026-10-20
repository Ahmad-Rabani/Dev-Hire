import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import {
  loginRateLimiter,
  passwordResetRateLimiter,
  registerRateLimiter,
} from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import * as authController from './auth.controller';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.validation';

const authRouter = Router();

authRouter.post(
  '/register',
  registerRateLimiter,
  validate(registerSchema),
  authController.register,
);

authRouter.post('/login', loginRateLimiter, validate(loginSchema), authController.login);

authRouter.post('/refresh', authController.refresh);

authRouter.post('/logout', authController.logout);

authRouter.get('/me', authenticate, authController.me);

authRouter.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);

authRouter.post(
  '/forgot-password',
  passwordResetRateLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);

authRouter.post(
  '/reset-password',
  passwordResetRateLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword,
);

export { authRouter };
