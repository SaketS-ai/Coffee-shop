import { describe, expect, it, vi } from 'vitest';
import { updateProfile } from './profile.service';
import { prisma } from '../config/prisma';

describe('Profile Service', () => {
  it('updates profile image url successfully', async () => {
    // Mock user in prisma
    const mockUser = {
      id: 'test-user-id',
      name: 'Coffee Lover',
      email: 'lover@socialcup.com',
      role: 'MEMBER',
      cafe_id: null,
      is_active: true,
      profile_image_url: 'https://cdn.socialcup.com/avatars/test.jpg',
      created_at: new Date(),
      updated_at: new Date(),
    };

    vi.spyOn(prisma.user, 'update').mockResolvedValue(mockUser as any);

    const result = await updateProfile('test-user-id', {
      profile_image_url: 'https://cdn.socialcup.com/avatars/test.jpg',
    });

    expect(result.id).toBe('test-user-id');
    expect(result.profile_image_url).toBe('https://cdn.socialcup.com/avatars/test.jpg');
  });

  it('rejects invalid profile_image_url type', async () => {
    await expect(
      updateProfile('test-user-id', {
        profile_image_url: 12345 as any,
      })
    ).rejects.toThrow('profile_image_url must be a string.');
  });
});
