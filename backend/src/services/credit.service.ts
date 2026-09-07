import { prisma } from '../config/prisma';
import { CreditLedger } from '@prisma/client';

// Newest first, and scoped to this one user - callers must always pass the
// authenticated user's own id (see membership.controller.ts), never a
// client-supplied id, so one member can never read another's ledger.
export async function getCreditHistory(userId: string): Promise<CreditLedger[]> {
  return prisma.creditLedger.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
  });
}

// The ledger is the source of truth for "how many credits does this user
// have right now" - it's the balance_after of their most recent entry, not
// a value summed or trusted from the client.
export async function getCurrentBalance(userId: string): Promise<number> {
  const latest = await prisma.creditLedger.findFirst({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
  });
  return latest?.balance_after ?? 0;
}
