import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantMembershipGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    const tenantIdParam = request.params.tenantId;
    const tenantId = Array.isArray(tenantIdParam) ? tenantIdParam[0] : tenantIdParam;
    if (!user) throw new UnauthorizedException();
    if (!tenantId) throw new ForbiddenException('Tenant scope is required');

    const membership = await this.prisma.tenantMembership.findFirst({
      where: { tenantId, userId: user.id, tenant: { status: 'ACTIVE' } },
      select: { id: true, tenantId: true, userId: true, role: true },
    });
    if (!membership) throw new ForbiddenException('You do not have access to this guesthouse');
    request.tenantMembership = membership;
    return true;
  }
}
