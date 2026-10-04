import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import * as Joi from 'joi';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { InvitationsModule } from './invitations/invitations.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        PORT: Joi.number().port().default(4000),
        FRONTEND_URL: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
        DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
        DIRECT_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN_SECONDS: Joi.number().integer().min(60).max(86400).default(900),
        RESEND_API_KEY: Joi.string().allow('').optional(),
        MAIL_FROM: Joi.string().allow('').optional(),
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    InvitationsModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
