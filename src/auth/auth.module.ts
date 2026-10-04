import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SystemRolesGuard } from '../common/guards/system-roles.guard';
import { TenantMembershipGuard } from '../common/guards/tenant-membership.guard';
import { BranchAssignmentGuard } from '../common/guards/branch-assignment.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<number>('JWT_EXPIRES_IN_SECONDS', 900) },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    SystemRolesGuard,
    TenantMembershipGuard,
    BranchAssignmentGuard,
  ],
  exports: [JwtAuthGuard, SystemRolesGuard, TenantMembershipGuard, BranchAssignmentGuard],
})
export class AuthModule {}
