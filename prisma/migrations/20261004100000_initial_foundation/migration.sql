CREATE TYPE "SystemRole" AS ENUM ('USER', 'SUPERADMIN');
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'STAFF');
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "BranchStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "systemRole" "SystemRole" NOT NULL DEFAULT 'USER',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Tenant" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantMembership" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "MembershipRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TenantMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Branch" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "status" "BranchStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StaffBranchAssignment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "membershipId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StaffBranchAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OwnerInvitation" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "ownerName" TEXT NOT NULL,
  "tenantName" TEXT NOT NULL,
  "tenantSlug" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OwnerInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_systemRole_isActive_idx" ON "User"("systemRole", "isActive");
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");
CREATE UNIQUE INDEX "TenantMembership_tenantId_userId_key" ON "TenantMembership"("tenantId", "userId");
CREATE UNIQUE INDEX "TenantMembership_id_tenantId_key" ON "TenantMembership"("id", "tenantId");
CREATE INDEX "TenantMembership_userId_role_idx" ON "TenantMembership"("userId", "role");
CREATE UNIQUE INDEX "Branch_tenantId_slug_key" ON "Branch"("tenantId", "slug");
CREATE UNIQUE INDEX "Branch_id_tenantId_key" ON "Branch"("id", "tenantId");
CREATE INDEX "Branch_tenantId_status_idx" ON "Branch"("tenantId", "status");
CREATE UNIQUE INDEX "StaffBranchAssignment_membershipId_branchId_key" ON "StaffBranchAssignment"("membershipId", "branchId");
CREATE INDEX "StaffBranchAssignment_tenantId_branchId_idx" ON "StaffBranchAssignment"("tenantId", "branchId");
CREATE UNIQUE INDEX "OwnerInvitation_tokenHash_key" ON "OwnerInvitation"("tokenHash");
CREATE INDEX "OwnerInvitation_email_expiresAt_idx" ON "OwnerInvitation"("email", "expiresAt");

ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffBranchAssignment" ADD CONSTRAINT "StaffBranchAssignment_membershipId_tenantId_fkey" FOREIGN KEY ("membershipId", "tenantId") REFERENCES "TenantMembership"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffBranchAssignment" ADD CONSTRAINT "StaffBranchAssignment_branchId_tenantId_fkey" FOREIGN KEY ("branchId", "tenantId") REFERENCES "Branch"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OwnerInvitation" ADD CONSTRAINT "OwnerInvitation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
