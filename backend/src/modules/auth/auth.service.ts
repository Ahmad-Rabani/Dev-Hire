import mongoose from 'mongoose';
import { env } from '../../config/env';
import { conflict, forbidden, unauthorized, badRequest } from '../../utils/AppError';
import { generateOpaqueToken, hashToken } from '../../utils/cryptoTokens';
import { buildFrontendUrl, sendMail } from '../../utils/email';
import { hashPassword, verifyPassword } from '../../utils/password';
import {
  getRefreshExpiryDate,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../utils/tokens';
import { toPublicUser } from '../users/user.mapper';
import { User, type IUserDocument } from '../users/user.model';
import type { PublicUser } from '../users/user.types';
import { RefreshSession } from './refresh-session.model';
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from './auth.validation';

export type AuthTokensResult = {
  accessToken: string;
  user: PublicUser;
  emailDelivery?: { verificationEmailQueued: boolean };
};

type SessionMeta = {
  userAgent?: string;
  ip?: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function issueSession(
  user: IUserDocument,
  meta: SessionMeta,
): Promise<{ accessToken: string; refreshToken: string }> {
  const sessionId = new mongoose.Types.ObjectId();
  const refreshToken = signRefreshToken({
    sub: user._id.toString(),
    sid: sessionId.toString(),
  });

  await RefreshSession.create({
    _id: sessionId,
    user: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: getRefreshExpiryDate(),
    userAgent: meta.userAgent,
    ip: meta.ip,
  });

  const accessToken = signAccessToken({
    sub: user._id.toString(),
    role: user.role,
    email: user.email,
  });

  return { accessToken, refreshToken };
}

export async function registerUser(
  input: RegisterInput,
  meta: SessionMeta,
): Promise<AuthTokensResult & { refreshToken: string }> {
  const email = normalizeEmail(input.email);

  const existing = await User.findOne({ email });
  if (existing) {
    throw conflict('An account with this email already exists');
  }

  const verificationToken = generateOpaqueToken();
  const passwordHash = await hashPassword(input.password);

  let user: IUserDocument;
  try {
    user = await User.create({
      name: input.name.trim(),
      email,
      passwordHash,
      role: input.role,
      status: 'active',
      emailVerified: false,
      emailVerificationTokenHash: hashToken(verificationToken),
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      skills: [],
      portfolio: [],
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw conflict('An account with this email already exists');
    }
    throw error;
  }

  const verifyUrl = buildFrontendUrl(`/verify-email?token=${verificationToken}`);
  const mail = await sendMail({
    to: user.email,
    subject: 'Verify your DevHire email',
    text: `Welcome to DevHire!\n\nVerify your email: ${verifyUrl}\n\nThis link expires in 24 hours.`,
    html: `<p>Welcome to DevHire!</p><p><a href="${verifyUrl}">Verify your email</a></p><p>This link expires in 24 hours.</p>`,
  });

  if (!mail.delivered && env.NODE_ENV !== 'production') {
    // Safe local testing aid — never log the raw token in production.
    const { logger } = await import('../../utils/logger');
    logger.info('Dev verification token (SMTP unavailable)', {
      email: user.email,
      token: verificationToken,
    });
  }

  const session = await issueSession(user, meta);

  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: toPublicUser(user),
    emailDelivery: { verificationEmailQueued: mail.delivered },
  };
}

export async function loginUser(
  input: LoginInput,
  meta: SessionMeta,
): Promise<AuthTokensResult & { refreshToken: string }> {
  const email = normalizeEmail(input.email);
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user) {
    throw unauthorized('Invalid email or password');
  }

  const passwordOk = await verifyPassword(input.password, user.passwordHash);
  if (!passwordOk) {
    throw unauthorized('Invalid email or password');
  }

  if (user.status === 'suspended') {
    throw forbidden('Your account has been suspended');
  }

  const session = await issueSession(user, meta);
  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: toPublicUser(user),
  };
}

export async function refreshSession(
  rawRefreshToken: string | undefined,
  meta: SessionMeta,
): Promise<AuthTokensResult & { refreshToken: string }> {
  if (!rawRefreshToken) {
    throw unauthorized('Refresh token required');
  }

  let payload;
  try {
    payload = verifyRefreshToken(rawRefreshToken);
  } catch {
    throw unauthorized('Invalid or expired refresh token');
  }

  const tokenHash = hashToken(rawRefreshToken);
  const session = await RefreshSession.findById(payload.sid);

  if (!session || session.user.toString() !== payload.sub) {
    throw unauthorized('Invalid refresh session');
  }

  // Reuse detection: a previously rotated/revoked token was presented again.
  if (session.revokedAt) {
    await RefreshSession.updateMany(
      { user: session.user, revokedAt: null },
      { $set: { revokedAt: new Date() } },
    );
    throw unauthorized('Refresh token reuse detected. Please sign in again.');
  }

  if (session.expiresAt.getTime() < Date.now()) {
    throw unauthorized('Refresh token expired');
  }

  if (session.tokenHash !== tokenHash) {
    throw unauthorized('Invalid refresh session');
  }

  const user = await User.findById(session.user);
  if (!user) {
    throw unauthorized('User no longer exists');
  }
  if (user.status === 'suspended') {
    throw forbidden('Your account has been suspended');
  }

  // Rotate: revoke current session, issue a new one.
  const next = await issueSession(user, meta);
  session.revokedAt = new Date();
  session.replacedBy = new mongoose.Types.ObjectId(verifyRefreshToken(next.refreshToken).sid);
  await session.save();

  return {
    accessToken: next.accessToken,
    refreshToken: next.refreshToken,
    user: toPublicUser(user),
  };
}

export async function logoutUser(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) {
    return;
  }

  try {
    const payload = verifyRefreshToken(rawRefreshToken);
    const session = await RefreshSession.findById(payload.sid);
    if (session && !session.revokedAt && session.tokenHash === hashToken(rawRefreshToken)) {
      session.revokedAt = new Date();
      await session.save();
    }
  } catch {
    // Logout is idempotent — invalid cookies still clear client-side.
  }
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await User.findById(userId);
  if (!user) {
    throw unauthorized('User no longer exists');
  }
  if (user.status === 'suspended') {
    throw forbidden('Your account has been suspended');
  }
  return toPublicUser(user);
}

export async function verifyEmail(input: VerifyEmailInput): Promise<PublicUser> {
  const tokenHash = hashToken(input.token);
  const user = await User.findOne({
    emailVerificationTokenHash: tokenHash,
    emailVerificationExpires: { $gt: new Date() },
  }).select('+emailVerificationTokenHash +emailVerificationExpires');

  if (!user) {
    throw badRequest('Invalid or expired verification token');
  }

  user.emailVerified = true;
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpires = null;
  await user.save();

  return toPublicUser(user);
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<{ message: string }> {
  const email = normalizeEmail(input.email);
  const user = await User.findOne({ email }).select(
    '+passwordResetTokenHash +passwordResetExpires',
  );

  // Always return the same message to avoid account enumeration.
  const generic = {
    message: 'If an account exists for that email, password reset instructions have been sent.',
  };

  if (!user || user.status === 'suspended') {
    return generic;
  }

  const resetToken = generateOpaqueToken();
  user.passwordResetTokenHash = hashToken(resetToken);
  user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
  await user.save();

  const resetUrl = buildFrontendUrl(`/reset-password?token=${resetToken}`);
  const mail = await sendMail({
    to: user.email,
    subject: 'Reset your DevHire password',
    text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.`,
    html: `<p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 1 hour.</p>`,
  });

  if (!mail.delivered && env.NODE_ENV !== 'production') {
    const { logger } = await import('../../utils/logger');
    logger.info('Dev password-reset token (SMTP unavailable)', {
      email: user.email,
      token: resetToken,
    });
  }

  return generic;
}

export async function resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
  const tokenHash = hashToken(input.token);
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordHash +passwordResetTokenHash +passwordResetExpires');

  if (!user) {
    throw badRequest('Invalid or expired password reset token');
  }

  user.passwordHash = await hashPassword(input.password);
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  await user.save();

  // Invalidate all refresh sessions after a password change.
  await RefreshSession.updateMany(
    { user: user._id, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );

  return { message: 'Password updated successfully. Please sign in with your new password.' };
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  );
}
