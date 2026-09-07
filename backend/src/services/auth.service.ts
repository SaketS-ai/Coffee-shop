import { AppError } from '../utils/AppError';
import { signAuthToken } from '../utils/jwt';
import { hashPassword, verifyPassword } from '../utils/password';
import { isValidEmail, isValidName, isValidPassword, normalizeEmail } from '../utils/validators';
import { createUser, findUserByEmail, findUserById, SafeUser, toSafeUser } from './user.service';

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

  const token = signAuthToken({ sub: user.id, role: user.role });

  return { user: toSafeUser(user), token };
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
