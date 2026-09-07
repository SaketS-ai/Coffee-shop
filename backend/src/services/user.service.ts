import { prisma } from '../config/prisma';
import { User } from '@prisma/client';

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: User['role'];
}

// Never include password_hash - this is the only shape that leaves the API.
export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function createUser(params: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<User> {
  return prisma.user.create({
    data: { name: params.name, email: params.email, password_hash: params.passwordHash },
  });
}
