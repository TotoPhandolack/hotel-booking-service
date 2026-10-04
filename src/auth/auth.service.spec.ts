import { UnauthorizedException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const passwordHashPromise = hash('correct horse battery staple', 4);

  it('issues a short-lived access token for an active user', async () => {
    const passwordHash = await passwordHashPromise;
    const user = {
      id: 'u-1',
      email: 'owner@example.com',
      name: 'Guesthouse Owner',
      passwordHash,
      systemRole: 'USER',
      isActive: true,
      memberships: [
        { id: 'm-1', tenantId: 't-1', role: 'OWNER', tenant: { name: 'River House', slug: 'river-house' } },
      ],
    };
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(user) } };
    const jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') };
    const config = { get: jest.fn().mockReturnValue(900) };
    const service = new AuthService(prisma as never, jwt as never, config as never);

    const result = await service.login({ email: ' OWNER@example.com ', password: 'correct horse battery staple' });

    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'owner@example.com' } }),
    );
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'u-1' });
    expect(result.accessToken).toBe('signed-token');
    expect(result.expiresIn).toBe(900);
  });

  it('does not distinguish unknown users from an incorrect password', async () => {
    const prisma = { user: { findUnique: jest.fn().mockResolvedValue(null) } };
    const service = new AuthService(
      prisma as never,
      { signAsync: jest.fn() } as never,
      { get: jest.fn() } as never,
    );

    await expect(service.login({ email: 'missing@example.com', password: 'wrong-password' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
