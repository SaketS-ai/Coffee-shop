export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && EMAIL_REGEX.test(email) && email.length <= 255;
}

export function isValidName(name: unknown): name is string {
  return typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 255;
}

// Simple, not overly strict: 8+ characters with at least one letter and one number.
export function isValidPassword(password: unknown): password is string {
  return (
    typeof password === 'string' &&
    password.length >= 8 &&
    password.length <= 72 && // bcrypt silently ignores bytes beyond 72
    /[A-Za-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

export function isNonEmptyString(value: unknown, maxLength = 255): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

// undefined/null means "not supplied" - valid, since latitude/longitude are optional.
export function isValidLatitude(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  return typeof value === 'number' && Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  return typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180;
}

export function isValidPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

// credit_price is stored as Prisma Int and must move real money/credits at
// redemption time - a 0 or missing value would let a drink be redeemed for
// free, so unlike isValidPrice this excludes 0. undefined is handled by the
// caller (required on create, optional on update).
export function isValidCreditPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}
