import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';

const attempts = new Map<string, { count: number; blockedUntil: number }>();

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function makeDeviceToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function checkAttemptLimit(cafeId: string) {
  const current = attempts.get(cafeId);
  if (current?.blockedUntil && current.blockedUntil > Date.now()) {
    throw new AppError(429, 'Too many PIN attempts. Try again later.', 'PIN_RATE_LIMITED');
  }
}

export async function authorizeScanner(cafeId: string, pin: string, label?: string) {
  checkAttemptLimit(cafeId);
  const cafe = await prisma.cafe.findUnique({ where: { id: cafeId }, select: { id: true, scan_pin_hash: true, scan_pin_version: true, is_active: true } });
  if (!cafe || !cafe.is_active || !cafe.scan_pin_hash || !(await bcrypt.compare(pin, cafe.scan_pin_hash))) {
    const current = attempts.get(cafeId) ?? { count: 0, blockedUntil: 0 };
    current.count += 1;
    if (current.count >= 5) {
      current.count = 0;
      current.blockedUntil = Date.now() + 15 * 60 * 1000;
    }
    attempts.set(cafeId, current);
    throw new AppError(401, 'Invalid cafe PIN.', 'INVALID_PIN');
  }
  attempts.delete(cafeId);
  const token = makeDeviceToken();
  await prisma.cafeDevice.create({ data: { cafe_id: cafeId, token_hash: hashToken(token), label: label?.slice(0, 255) } });
  return { token, cafeId, version: cafe.scan_pin_version };
}

export async function requireScannerDevice(cafeId: string, token: string) {
  const device = await prisma.cafeDevice.findUnique({ where: { token_hash: hashToken(token) }, select: { id: true, cafe_id: true } });
  if (!device || device.cafe_id !== cafeId) throw new AppError(401, 'Scanner authorization is invalid.', 'INVALID_SCANNER_DEVICE');
  await prisma.cafeDevice.update({ where: { id: device.id }, data: { last_used_at: new Date() } });
  return device;
}

export async function setCafePin(cafeId: string, pin: string) {
  if (!/^\d{4,8}$/.test(pin)) throw new AppError(400, 'PIN must contain 4 to 8 digits.', 'INVALID_PIN');
  await prisma.cafe.update({ where: { id: cafeId }, data: { scan_pin_hash: await bcrypt.hash(pin, 12), scan_pin_version: { increment: 1 } } });
  await prisma.cafeDevice.deleteMany({ where: { cafe_id: cafeId } });
}

export async function getTodayRedemptions(cafeId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return prisma.redemption.findMany({
    where: { cafe_id: cafeId, status: 'REDEEMED', redeemed_at: { gte: start } },
    orderBy: { redeemed_at: 'desc' },
    include: { user: { select: { name: true, profile_image_url: true } }, drink: { select: { name: true } } },
  });
}