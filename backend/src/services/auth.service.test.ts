import { randomUUID } from 'crypto';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { prisma } from '../config/prisma';
import { loginCafeStaff } from './auth.service';
import { verifyAuthToken } from '../utils/jwt';
import { hashPassword } from '../utils/password';

let createdCafeIds: string[] = [];
let createdUserIds: string[] = [];

afterEach(async () => {
  if (createdCafeIds.length > 0) {
    await prisma.cafe.deleteMany({ where: { id: { in: createdCafeIds } } });
    createdCafeIds = [];
  }
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds = [];
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Cafe Staff Authentication & Session Isolation', () => {
  it('authenticates cafe staff with valid 4-digit PIN and issues token containing cafeId', async () => {
    const pinHash = await hashPassword('4321');
    const cafe = await prisma.cafe.create({
      data: {
        name: `Auth Test Cafe ${randomUUID().slice(0, 8)}`,
        address: '123 Coffee Lane',
        city: 'Dallas',
        state: 'TX',
        scan_pin_hash: pinHash,
      },
    });
    createdCafeIds.push(cafe.id);

    const result = await loginCafeStaff({ cafeId: cafe.id, pin: '4321' });

    expect(result.cafe.id).toBe(cafe.id);
    expect(result.cafe.name).toBe(cafe.name);
    expect(result.user.role).toBe('BARISTA');
    createdUserIds.push(result.user.id);

    const payload = verifyAuthToken(result.token);
    expect(payload.sub).toBe(result.user.id);
    expect(payload.role).toBe('BARISTA');
    expect(payload.cafeId).toBe(cafe.id);
  });

  it('rejects cafe login when PIN is incorrect', async () => {
    const pinHash = await hashPassword('9999');
    const cafe = await prisma.cafe.create({
      data: {
        name: `Auth Test Cafe ${randomUUID().slice(0, 8)}`,
        address: '456 Roaster St',
        city: 'Dallas',
        state: 'TX',
        scan_pin_hash: pinHash,
      },
    });
    createdCafeIds.push(cafe.id);

    await expect(loginCafeStaff({ cafeId: cafe.id, pin: '0000' })).rejects.toMatchObject({
      reason: 'INVALID_PIN',
    });
  });
});
