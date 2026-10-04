import { Request } from 'express';
import { MembershipRole, SystemRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  systemRole: SystemRole;
}

export interface AuthenticatedMembership {
  id: string;
  tenantId: string;
  userId: string;
  role: MembershipRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  tenantMembership?: AuthenticatedMembership;
}
