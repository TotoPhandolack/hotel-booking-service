import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  constructor(private readonly config: ConfigService) {}

  async sendOwnerInvitation(input: {
    email: string;
    ownerName: string;
    tenantName: string;
    token: string;
  }): Promise<void> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    const from = this.config.get<string>('MAIL_FROM');
    if (!apiKey || !from) {
      throw new ServiceUnavailableException('Owner invitations are unavailable until email is configured');
    }

    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
    const invitationUrl = new URL('/accept-invitation', frontendUrl);
    invitationUrl.searchParams.set('token', input.token);
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to: input.email,
      subject: `Set up ${input.tenantName} on Guesthouse Booking`,
      text: `Hello ${input.ownerName},\n\nYou have been invited to manage ${input.tenantName}. Accept the invitation within 24 hours:\n${invitationUrl.toString()}\n\nIf you were not expecting this invitation, you can ignore this email.`,
    });
    if (result.error) {
      throw new ServiceUnavailableException('The invitation email could not be delivered');
    }
  }
}
