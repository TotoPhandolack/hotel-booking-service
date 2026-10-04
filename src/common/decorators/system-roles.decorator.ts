import { SetMetadata } from '@nestjs/common';
import { SystemRole } from '@prisma/client';

export const SYSTEM_ROLES_KEY = 'system-roles';
export const SystemRoles = (...roles: SystemRole[]) => SetMetadata(SYSTEM_ROLES_KEY, roles);
