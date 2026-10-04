import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { MembershipRole } from '../../generated/prisma/enums';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BranchAssignmentGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    const membership = request.tenantMembership;
    const branchIdParam = request.params.branchId;
    const branchId = Array.isArray(branchIdParam) ? branchIdParam[0] : branchIdParam;
    if (!user || !membership) throw new UnauthorizedException();
    if (!branchId) throw new ForbiddenException('Branch scope is required');

    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId: membership.tenantId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!branch) throw new ForbiddenException('Branch does not belong to this guesthouse');
    if (membership.role === MembershipRole.OWNER) return true;

    const assignment = await this.prisma.staffBranchAssignment.findUnique({
      where: { membershipId_branchId: { membershipId: membership.id, branchId } },
      select: { id: true },
    });
    if (!assignment) throw new ForbiddenException('You are not assigned to this branch');
    return true;
  }
}
