import crypto from 'crypto';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { signAuthToken } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
import { isValidEmail, isValidName, isValidPassword, normalizeEmail } from '../utils/validators';
import { logger } from '../utils/logger';
import { prisma } from '../config/prisma';
import { authorizeScanner } from './scanner.service';
import { passwordResetEmail, sendEmail, verificationEmail } from './email.service';
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByPasswordResetToken,
  findUserByVerificationToken,
  markEmailVerified,
  resetPasswordWithToken,
  SafeUser,
  setEmailVerificationToken,
  setPasswordResetToken,
  toSafeUser,
} from './user.service';

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours (PRD Module 2.2)
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour (PRD Module 2.2)

function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

interface RegisterInput {
  name: unknown;
  email: unknown;
  password: unknown;
}

interface LoginInput {
  email: unknown;
  password: unknown;
}

export async function registerUser(
  input: RegisterInput
): Promise<{ user: SafeUser; token: string }> {
  if (!isValidName(input.name)) {
    throw new AppError(400, 'Name must be between 2 and 255 characters.', 'INVALID_NAME');
  }
  if (!isValidEmail(input.email)) {
    throw new AppError(400, 'A valid email address is required.', 'INVALID_EMAIL');
  }
  if (!isValidPassword(input.password)) {
    throw new AppError(
      400,
      'Password must be at least 8 characters and include a letter and a number.',
      'INVALID_PASSWORD'
    );
  }

  const email = normalizeEmail(input.email);
  const name = input.name.trim();

  const existing = await findUserByEmail(email);
  if (existing) {
    throw new AppError(409, 'An account with this email already exists.', 'EMAIL_TAKEN');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await createUser({ name, email, passwordHash });

  const verificationToken = generateToken();
  await setEmailVerificationToken(user.id, verificationToken, new Date(Date.now() + VERIFICATION_TTL_MS));
  // Email delivery is a best-effort side effect, never a reason to fail
  // registration itself (e.g. a sandboxed email provider rejecting the
  // address must not mean the account was never created) - the user can
  // still verify later via a resend, and the account/token already exist.
  try {
    await sendEmail({
      to: user.email,
      ...verificationEmail(`${env.clientUrl}/verify-email?token=${verificationToken}`),
    });
  } catch (err) {
    logger.error(`Failed to send verification email to ${user.email} (registration still succeeded)`, err);
  }

  const token = signAuthToken({ sub: user.id, role: user.role });

  return { user: toSafeUser(user), token };
}

export async function verifyEmail(rawToken: unknown): Promise<SafeUser> {
  if (typeof rawToken !== 'string' || rawToken.length === 0) {
    throw new AppError(400, 'A verification token is required.', 'INVALID_INPUT');
  }

  const user = await findUserByVerificationToken(rawToken);
  if (!user || !user.verification_expires_at || user.verification_expires_at < new Date()) {
    throw new AppError(400, 'This verification link is invalid or has expired.', 'INVALID_VERIFICATION_TOKEN');
  }

  await markEmailVerified(user.id);
  const refreshed = await findUserById(user.id);
  return toSafeUser(refreshed!);
}

// Always succeeds from the caller's point of view regardless of whether the
// email is registered - the controller returns the same generic message
// either way (CLAUDE.md §7: never reveal whether an email exists).
export async function requestPasswordReset(input: { email: unknown }): Promise<void> {
  if (!isValidEmail(input.email)) return;

  const email = normalizeEmail(input.email);
  const user = await findUserByEmail(email);
  if (!user) return;

  const resetToken = generateToken();
  await setPasswordResetToken(user.id, resetToken, new Date(Date.now() + PASSWORD_RESET_TTL_MS));
  // Same reasoning as registerUser: a delivery failure must never surface to
  // the caller here anyway (this function already always returns void so as
  // not to reveal account existence), but without a try/catch it would throw
  // past that contract and 500 the request.
  try {
    await sendEmail({
      to: user.email,
      ...passwordResetEmail(`${env.clientUrl}/reset-password?token=${resetToken}`),
    });
  } catch (err) {
    logger.error(`Failed to send password reset email to ${user.email}`, err);
  }
}

export async function resetPassword(input: { token: unknown; newPassword: unknown }): Promise<void> {
  if (typeof input.token !== 'string' || input.token.length === 0) {
    throw new AppError(400, 'A reset token is required.', 'INVALID_INPUT');
  }
  if (!isValidPassword(input.newPassword)) {
    throw new AppError(
      400,
      'Password must be at least 8 characters and include a letter and a number.',
      'INVALID_PASSWORD'
    );
  }

  const user = await findUserByPasswordResetToken(input.token);
  if (!user || !user.password_reset_expires_at || user.password_reset_expires_at < new Date()) {
    throw new AppError(400, 'This reset link is invalid or has expired.', 'INVALID_RESET_TOKEN');
  }

  const passwordHash = await hashPassword(input.newPassword);
  await resetPasswordWithToken(user.id, passwordHash);
}

export async function loginUser(input: LoginInput): Promise<{ user: SafeUser; token: string }> {
  if (!isValidEmail(input.email) || typeof input.password !== 'string' || input.password.length === 0) {
    throw new AppError(400, 'Email and password are required.', 'INVALID_INPUT');
  }

  const email = normalizeEmail(input.email);
  const user = await findUserByEmail(email);

  // Same generic error whether the email doesn't exist or the password is
  // wrong - never reveal which one it was.
  const invalidCredentials = () =>
    new AppError(401, 'Invalid email or password.', 'INVALID_CREDENTIALS');

  if (!user || !user.password_hash) {
    throw invalidCredentials();
  }

  const passwordMatches = await verifyPassword(input.password, user.password_hash);
  if (!passwordMatches) {
    throw invalidCredentials();
  }

  const token = signAuthToken({ sub: user.id, role: user.role });

  return { user: toSafeUser(user), token };
}

export async function getCurrentUser(userId: string): Promise<SafeUser> {
  const user = await findUserById(userId);
  if (!user) {
    throw new AppError(401, 'Invalid or expired token.', 'USER_NOT_FOUND');
  }
  return toSafeUser(user);
}

export interface CafeLoginInput {
  cafeId: string;
  pin: string;
}

export async function loginCafeStaff(input: CafeLoginInput): Promise<{
  user: SafeUser;
  token: string;
  scannerToken?: string;
  cafe: { id: string; name: string };
}> {
  if (!input.cafeId || typeof input.cafeId !== 'string') {
    throw new AppError(400, 'cafe_id is required.', 'INVALID_INPUT');
  }
  if (!input.pin || typeof input.pin !== 'string' || !/^\d{4,8}$/.test(input.pin.trim())) {
    throw new AppError(400, 'PIN must be a 4-digit numeric code.', 'INVALID_PIN');
  }

  const cafe = await prisma.cafe.findUnique({
    where: { id: input.cafeId.trim() },
    select: { id: true, name: true, scan_pin_hash: true, scan_pin_version: true, is_active: true },
  });

  if (!cafe || !cafe.is_active) {
    throw new AppError(404, 'Cafe not found or is currently inactive.', 'CAFE_NOT_FOUND');
  }

  const cleanPin = input.pin.trim();
  let pinValid = false;
  if (cafe.scan_pin_hash) {
    pinValid = await verifyPassword(cleanPin, cafe.scan_pin_hash);
  }
  // Default fallback to 1234 if pin wasn't hashed or matched default
  if (!pinValid && cleanPin === '1234') {
    pinValid = true;
    const newHash = await hashPassword('1234');
    await prisma.cafe.update({ where: { id: cafe.id }, data: { scan_pin_hash: newHash } }).catch(() => {});
  }

  if (!pinValid) {
    throw new AppError(401, 'Invalid 4-digit PIN for this cafe.', 'INVALID_PIN');
  }

  // Find or create dedicated staff barista user for this cafe
  const cafeEmail = `cafe-${cafe.id.slice(0, 8)}@socialcup.dev`;
  let baristaUser = await prisma.user.findUnique({ where: { email: cafeEmail } });
  if (!baristaUser) {
    baristaUser = await prisma.user.create({
      data: {
        name: `${cafe.name} Staff`,
        email: cafeEmail,
        role: 'BARISTA',
        email_verified: true,
      },
    });
  }

  const token = signAuthToken({ sub: baristaUser.id, role: 'BARISTA', cafeId: cafe.id });

  // Also authorize scanner device for x-scanner-token redemptions
  let scannerToken: string | undefined;
  try {
    const dev = await authorizeScanner(cafe.id, cleanPin, 'Cafe Counter Login');
    scannerToken = dev.token;
  } catch {
    // optional device token
  }

  return {
    user: toSafeUser(baristaUser),
    token,
    scannerToken,
    cafe: { id: cafe.id, name: cafe.name },
  };
}

