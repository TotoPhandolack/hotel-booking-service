import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AcceptInvitationDto } from '../auth/dto/accept-invitation.dto';
import { InvitationsService } from './invitations.service';

@Controller('auth')
export class InvitationAcceptanceController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post('accept-invitation')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  accept(@Body() input: AcceptInvitationDto) {
    return this.invitations.accept(input);
  }
}
