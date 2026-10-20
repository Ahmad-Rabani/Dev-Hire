/**
 * Controlled admin provisioning — never expose this via public registration.
 *
 * Usage:
 *   cd backend
 *   npx tsx scripts/create-admin.ts --email admin@devhire.local --password 'AdminPass1' --name 'Platform Admin'
 *
 * Or set ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME in the environment.
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { User } from '../src/modules/users/user.model';
import { hashPassword } from '../src/utils/password';

dotenv.config();

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main(): Promise<void> {
  const email = (readArg('--email') ?? process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = readArg('--password') ?? process.env.ADMIN_PASSWORD ?? '';
  const name = (readArg('--name') ?? process.env.ADMIN_NAME ?? 'DevHire Admin').trim();

  if (!email || !password) {
    console.error('Missing --email/--password (or ADMIN_EMAIL/ADMIN_PASSWORD).');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Admin password must be at least 8 characters.');
    process.exit(1);
  }

  await connectDatabase();

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role === 'admin') {
      console.log(`Admin already exists for ${email}`);
      await disconnectDatabase();
      return;
    }
    console.error(`A non-admin user already exists with email ${email}`);
    process.exit(1);
  }

  await User.create({
    name,
    email,
    passwordHash: await hashPassword(password),
    role: 'admin',
    status: 'active',
    emailVerified: true,
    skills: [],
    portfolio: [],
  });

  console.log(`Admin created: ${email}`);
  await disconnectDatabase();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  if (mongoose.connection.readyState !== 0) {
    await disconnectDatabase();
  }
  process.exit(1);
});
