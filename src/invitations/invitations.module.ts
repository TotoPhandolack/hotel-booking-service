import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OwnerInvitationsController } from './owner-invitations.controller';
import { InvitationAcceptanceController } from './invitation-acceptance.controller';
import { InvitationsService } from './invitations.service';
import { EmailService } from './email.service';

@Module({
  imports: [AuthModule],
  controllers: [OwnerInvitationsController, InvitationAcceptanceController],
  providers: [InvitationsService, EmailService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
