import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { Buffer } from 'node:buffer';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(input: LoginDto) {
    if (Buffer.byteLength(input.password, 'utf8') > 72) {
      throw new UnauthorizedException('Email or password is incorrect');
    }
    const email = input.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { tenant: { status: 'ACTIVE' } },
          select: {
            id: true,
            tenantId: true,
            role: true,
            tenant: { select: { name: true, slug: true } },
          },
        },
      },
    });

    if (!user?.isActive || !(await compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException('Email or password is incorrect');
    }

    const accessToken = await this.jwt.signAsync({ sub: user.id });
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.config.get<number>('JWT_EXPIRES_IN_SECONDS', 900),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        systemRole: user.systemRole,
        memberships: user.memberships,
      },
    };
  }

  async currentUser(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        systemRole: true,
        memberships: {
          where: { tenant: { status: 'ACTIVE' } },
          select: {
            id: true,
            tenantId: true,
            role: true,
            tenant: { select: { name: true, slug: true } },
          },
        },
      },
    });
    return user;
  }
}
