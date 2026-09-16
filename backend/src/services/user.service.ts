import { prisma } from '../config/prisma';
import { User } from '@prisma/client';

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: User['role'];
  profile_image_url: string | null;
  neighborhood: string | null;
  coffee_preferences: string[];
  email_verified: boolean;
}

// Never include password_hash - this is the only shape that leaves the API.
export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    profile_image_url: user.profile_image_url,
    neighborhood: user.neighborhood,
    coffee_preferences: user.coffee_preferences,
    email_verified: user.email_verified,
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

export async function updateUserProfile(
  id: string,
  input: { name?: string; profile_image_url?: string | null; neighborhood?: string | null; coffee_preferences?: string[] }
): Promise<User | null> {
  return prisma.user.update({ where: { id }, data: input });
}

export async function deleteUserAccount(id: string): Promise<void> {
  await prisma.user.delete({ where: { id } });
}

export async function setEmailVerificationToken(id: string, token: string, expiresAt: Date): Promise<void> {
  await prisma.user.update({ where: { id }, data: { verification_token: token, verification_expires_at: expiresAt } });
}

export async function findUserByVerificationToken(token: string): Promise<User | null> {
  return prisma.user.findFirst({ where: { verification_token: token } });
}

export async function markEmailVerified(id: string): Promise<void> {
  await prisma.user.update({
    where: { id },
    data: { email_verified: true, verification_token: null, verification_expires_at: null },
  });
}

export async function setPasswordResetToken(id: string, token: string, expiresAt: Date): Promise<void> {
  await prisma.user.update({ where: { id }, data: { password_reset_token: token, password_reset_expires_at: expiresAt } });
}

export async function findUserByPasswordResetToken(token: string): Promise<User | null> {
  return prisma.user.findFirst({ where: { password_reset_token: token } });
}

export async function resetPasswordWithToken(id: string, passwordHash: string): Promise<void> {
  await prisma.user.update({
    where: { id },
    data: { password_hash: passwordHash, password_reset_token: null, password_reset_expires_at: null },
  });
}
