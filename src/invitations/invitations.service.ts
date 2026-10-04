import {
  ConflictException,
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MembershipRole, SystemRole } from '@prisma/client';
import { hash } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AcceptInvitationDto } from '../auth/dto/accept-invitation.dto';
import { CreateOwnerInvitationDto } from './dto/create-owner-invitation.dto';
import { EmailService } from './email.service';

const INVITATION_LIFETIME_MS = 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async createOwnerInvitation(input: CreateOwnerInvitationDto, createdByUserId: string) {
    const email = input.email.trim().toLowerCase();
    const tenantSlug = input.tenantSlug.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    const existingTenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlug }, select: { id: true } });
    const pendingEmailInvitation = await this.prisma.ownerInvitation.findFirst({
      where: { email, acceptedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    const pendingSlugInvitation = await this.prisma.ownerInvitation.findFirst({
      where: { tenantSlug, acceptedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    if (existingUser || existingTenant || pendingEmailInvitation || pendingSlugInvitation) {
      throw new ConflictException('The email, guesthouse slug, or a pending invitation is already in use');
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const invitation = await this.prisma.ownerInvitation.create({
      data: {
        email,
        ownerName: input.ownerName.trim(),
        tenantName: input.tenantName.trim(),
        tenantSlug,
        tokenHash,
        expiresAt: new Date(Date.now() + INVITATION_LIFETIME_MS),
        createdByUserId,
      },
      select: { id: true, email: true, tenantName: true, expiresAt: true },
    });

    try {
      await this.email.sendOwnerInvitation({
        email,
        ownerName: input.ownerName.trim(),
        tenantName: input.tenantName.trim(),
        token,
      });
    } catch (error) {
      await this.prisma.ownerInvitation.delete({ where: { id: invitation.id } });
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('The invitation email could not be delivered');
    }

    return {
      id: invitation.id,
      email: invitation.email,
      tenantName: invitation.tenantName,
      expiresAt: invitation.expiresAt,
      status: 'sent',
    };
  }

  async accept(input: AcceptInvitationDto) {
    if (Buffer.byteLength(input.password, 'utf8') > 72) {
      throw new BadRequestException('Password must be 72 bytes or fewer');
    }
    const tokenHash = createHash('sha256').update(input.token).digest('hex');
    const invitation = await this.prisma.ownerInvitation.findUnique({ where: { tokenHash } });
    if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) {
      throw new NotFoundException('This invitation is invalid or expired');
    }

    const passwordHash = await hash(input.password, BCRYPT_ROUNDS);
    try {
      const owner = await this.prisma.$transaction(async (tx) => {
        const currentInvitation = await tx.ownerInvitation.findUnique({ where: { id: invitation.id } });
        if (!currentInvitation || currentInvitation.acceptedAt || currentInvitation.expiresAt <= new Date()) {
          throw new NotFoundException('This invitation is invalid or expired');
        }

        const user = await tx.user.create({
          data: {
            email: currentInvitation.email,
            name: currentInvitation.ownerName,
            passwordHash,
            systemRole: SystemRole.USER,
          },
          select: { id: true, email: true, name: true },
        });
        const tenant = await tx.tenant.create({
          data: { name: currentInvitation.tenantName, slug: currentInvitation.tenantSlug },
          select: { id: true, name: true, slug: true },
        });
        await tx.tenantMembership.create({
          data: { tenantId: tenant.id, userId: user.id, role: MembershipRole.OWNER },
        });
        await tx.ownerInvitation.update({
          where: { id: currentInvitation.id },
          data: { acceptedAt: new Date() },
        });
        return { user, tenant };
      });
      return { message: 'Invitation accepted. You can now sign in.', owner };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException('The invitation was already used or its guesthouse slug is unavailable');
      }
      throw error;
    }
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
