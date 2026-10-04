import 'dotenv/config';
import 'reflect-metadata';
import { PrismaClient } from '../generated/prisma/client';
import { SystemRole } from '../generated/prisma/enums';
import { PrismaNeon } from '@prisma/adapter-neon';
import { hash } from 'bcryptjs';

async function bootstrapSuperadmin(): Promise<void> {
  const email = process.env.BOOTSTRAP_SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_SUPERADMIN_PASSWORD;
  const name = process.env.BOOTSTRAP_SUPERADMIN_NAME?.trim() || 'Platform Superadmin';
  if (!email || !password) {
    throw new Error('Set BOOTSTRAP_SUPERADMIN_EMAIL and BOOTSTRAP_SUPERADMIN_PASSWORD for this one-time command');
  }
  if (password.length < 12 || password.length > 72) {
    throw new Error('The bootstrap password must contain between 12 and 72 characters');
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Set DATABASE_URL before bootstrapping the superadmin');
  const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
  try {
    const passwordHash = await hash(password, 12);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(1413566542)`;
      const existingAdmin = await tx.user.findFirst({ where: { systemRole: SystemRole.SUPERADMIN } });
      if (existingAdmin) throw new Error('A superadmin already exists; bootstrap can only run once');
      await tx.user.create({
        data: { email, name, passwordHash, systemRole: SystemRole.SUPERADMIN },
      });
    });
    process.stdout.write(`Created the initial superadmin account for ${email}.\n`);
  } finally {
    await prisma.$disconnect();
  }
}

void bootstrapSuperadmin().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Superadmin bootstrap failed';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
