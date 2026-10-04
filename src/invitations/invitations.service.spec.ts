import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { InvitationsService } from './invitations.service';

describe('InvitationsService', () => {
  it('sends a one-time owner invitation and returns no raw token', async () => {
    const created = {
      id: 'invite-1',
      email: 'owner@example.com',
      tenantName: 'River House',
      expiresAt: new Date(Date.now() + 86_400_000),
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      tenant: { findUnique: jest.fn().mockResolvedValue(null) },
      ownerInvitation: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created),
      },
    };
    const email = { sendOwnerInvitation: jest.fn().mockResolvedValue(undefined) };
    const service = new InvitationsService(prisma as never, email as never);

    const result = await service.createOwnerInvitation(
      {
        email: ' Owner@Example.com ',
        ownerName: ' River Owner ',
        tenantName: ' River House ',
        tenantSlug: 'river-house',
      },
      'admin-1',
    );

    expect(prisma.ownerInvitation.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: 'owner@example.com' }) }),
    );
    expect(email.sendOwnerInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'owner@example.com', tenantName: 'River House' }),
    );
    expect(email.sendOwnerInvitation.mock.calls[0][0].token).toMatch(/^[a-f0-9]{64}$/);
    expect(result).not.toHaveProperty('token');
    expect(result.status).toBe('sent');
  });

  it('removes the stored invitation when email delivery fails', async () => {
    const created = { id: 'invite-1', email: 'owner@example.com', tenantName: 'River House', expiresAt: new Date() };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      tenant: { findUnique: jest.fn().mockResolvedValue(null) },
      ownerInvitation: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created),
        delete: jest.fn().mockResolvedValue(created),
      },
    };
    const email = { sendOwnerInvitation: jest.fn().mockRejectedValue(new ServiceUnavailableException()) };
    const service = new InvitationsService(prisma as never, email as never);

    await expect(
      service.createOwnerInvitation(
        { email: 'owner@example.com', ownerName: 'Owner', tenantName: 'River House', tenantSlug: 'river-house' },
        'admin-1',
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.ownerInvitation.delete).toHaveBeenCalledWith({ where: { id: 'invite-1' } });
  });

  it('rejects an expired invitation before creating the owner', async () => {
    const token = 'a'.repeat(64);
    const invitation = {
      id: 'invite-1',
      tokenHash: createHash('sha256').update(token).digest('hex'),
      email: 'owner@example.com',
      expiresAt: new Date(Date.now() - 1_000),
      acceptedAt: null,
    };
    const prisma = { ownerInvitation: { findUnique: jest.fn().mockResolvedValue(invitation) } };
    const service = new InvitationsService(prisma as never, {} as never);

    await expect(service.accept({ token, password: 'correct horse battery staple' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('accepts an invitation once and creates its user, guesthouse, and owner membership atomically', async () => {
    const token = 'b'.repeat(64);
    const invitation = {
      id: 'invite-1',
      tokenHash: createHash('sha256').update(token).digest('hex'),
      email: 'owner@example.com',
      ownerName: 'Guesthouse Owner',
      tenantName: 'River House',
      tenantSlug: 'river-house',
      expiresAt: new Date(Date.now() + 60_000),
      acceptedAt: null,
    };
    const user = { id: 'user-1', email: invitation.email, name: invitation.ownerName };
    const tenant = { id: 'tenant-1', name: invitation.tenantName, slug: invitation.tenantSlug };
    const tx = {
      ownerInvitation: {
        findUnique: jest.fn().mockResolvedValue(invitation),
        update: jest.fn().mockResolvedValue({ ...invitation, acceptedAt: new Date() }),
      },
      user: { create: jest.fn().mockResolvedValue(user) },
      tenant: { create: jest.fn().mockResolvedValue(tenant) },
      tenantMembership: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      ownerInvitation: { findUnique: jest.fn().mockResolvedValue(invitation) },
      $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) => callback(tx)),
    };
    const service = new InvitationsService(prisma as never, {} as never);

    const result = await service.accept({ token, password: 'correct horse battery staple' });

    expect(tx.tenantMembership.create).toHaveBeenCalledWith({
      data: { tenantId: tenant.id, userId: user.id, role: 'OWNER' },
    });
    expect(tx.ownerInvitation.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: invitation.id }, data: { acceptedAt: expect.any(Date) } }),
    );
    expect(result.owner).toEqual({ user, tenant });
  });
});
