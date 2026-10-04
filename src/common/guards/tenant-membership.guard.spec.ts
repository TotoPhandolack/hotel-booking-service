import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TenantMembershipGuard } from './tenant-membership.guard';

describe('TenantMembershipGuard', () => {
  const contextFor = (user: unknown, tenantId: string) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user, params: { tenantId } }) }),
    }) as ExecutionContext;

  it('allows a membership and attaches it to the request', async () => {
    const membership = { id: 'm-1', tenantId: 't-1', userId: 'u-1', role: 'OWNER' };
    const prisma = { tenantMembership: { findFirst: jest.fn().mockResolvedValue(membership) } };
    const request: {
      user: { id: string };
      params: { tenantId: string };
      tenantMembership?: typeof membership;
    } = { user: { id: 'u-1' }, params: { tenantId: 't-1' } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    const guard = new TenantMembershipGuard(prisma as never);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.tenantMembership).toEqual(membership);
  });

  it('denies users without membership in the requested tenant', async () => {
    const prisma = { tenantMembership: { findFirst: jest.fn().mockResolvedValue(null) } };
    const guard = new TenantMembershipGuard(prisma as never);
    await expect(guard.canActivate(contextFor({ id: 'u-1' }, 'another-tenant'))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
