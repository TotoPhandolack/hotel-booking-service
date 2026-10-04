import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SystemRoles } from '../common/decorators/system-roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SystemRolesGuard } from '../common/guards/system-roles.guard';
import { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { CreateOwnerInvitationDto } from './dto/create-owner-invitation.dto';
import { InvitationsService } from './invitations.service';

@Controller('admin/owner-invitations')
@UseGuards(JwtAuthGuard, SystemRolesGuard)
@SystemRoles(SystemRole.SUPERADMIN)
export class OwnerInvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post()
  create(@Body() input: CreateOwnerInvitationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.invitations.createOwnerInvitation(input, user.id);
  }
}
