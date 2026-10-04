import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { BranchAssignmentGuard } from './branch-assignment.guard';

describe('BranchAssignmentGuard', () => {
  const contextFor = (role: 'OWNER' | 'STAFF', branchId = 'b-1') => {
    const request = {
      user: { id: 'u-1' },
      tenantMembership: { id: 'm-1', tenantId: 't-1', userId: 'u-1', role },
      params: { branchId },
    };
    return {
      context: ({ switchToHttp: () => ({ getRequest: () => request }) }) as unknown as ExecutionContext,
      request,
    };
  };

  it('allows an owner to access an active branch in their guesthouse', async () => {
    const prisma = {
      branch: { findFirst: jest.fn().mockResolvedValue({ id: 'b-1' }) },
      staffBranchAssignment: { findUnique: jest.fn() },
    };
    const guard = new BranchAssignmentGuard(prisma as never);
    await expect(guard.canActivate(contextFor('OWNER').context)).resolves.toBe(true);
    expect(prisma.staffBranchAssignment.findUnique).not.toHaveBeenCalled();
  });

  it('allows staff only when assigned to the requested branch', async () => {
    const prisma = {
      branch: { findFirst: jest.fn().mockResolvedValue({ id: 'b-1' }) },
      staffBranchAssignment: { findUnique: jest.fn().mockResolvedValue({ id: 'a-1' }) },
    };
    const guard = new BranchAssignmentGuard(prisma as never);
    await expect(guard.canActivate(contextFor('STAFF').context)).resolves.toBe(true);
  });

  it('denies staff when the requested branch belongs to another guesthouse', async () => {
    const prisma = {
      branch: { findFirst: jest.fn().mockResolvedValue(null) },
      staffBranchAssignment: { findUnique: jest.fn() },
    };
    const guard = new BranchAssignmentGuard(prisma as never);
    await expect(guard.canActivate(contextFor('STAFF').context)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.staffBranchAssignment.findUnique).not.toHaveBeenCalled();
  });

  it('denies staff who have no assignment for that branch', async () => {
    const prisma = {
      branch: { findFirst: jest.fn().mockResolvedValue({ id: 'b-1' }) },
      staffBranchAssignment: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const guard = new BranchAssignmentGuard(prisma as never);
    await expect(guard.canActivate(contextFor('STAFF').context)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
