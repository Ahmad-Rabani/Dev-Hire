/**
 * Idempotent local demo seed for interviews and walkthroughs.
 *
 * Safety:
 * - Refuses NODE_ENV=production
 * - Uses synthetic emails under @devhire.demo
 * - Upserts by email (safe to re-run)
 * - Does not delete unrelated database documents
 *
 * Usage:
 *   cd backend
 *   npm run seed:demo
 *
 * Demo passwords (local only — never use in production):
 *   Client:     demo-client@devhire.demo / DemoPass1!
 *   Freelancer: demo-freelancer@devhire.demo / DemoPass1!
 *   Admin:      use `npm run create-admin` separately
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { Contract } from '../src/modules/contracts/contract.model';
import { Job } from '../src/modules/jobs/job.model';
import { Proposal } from '../src/modules/proposals/proposal.model';
import { Review } from '../src/modules/reviews/review.model';
import { User } from '../src/modules/users/user.model';
import { hashPassword } from '../src/utils/password';

dotenv.config();

const DEMO_PASSWORD = 'DemoPass1!';
const CLIENT_EMAIL = 'demo-client@devhire.demo';
const FREELANCER_EMAIL = 'demo-freelancer@devhire.demo';

async function upsertDemoUser(input: {
  email: string;
  name: string;
  role: 'client' | 'freelancer';
  extras?: Record<string, unknown>;
}) {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    existing.name = input.name;
    existing.role = input.role;
    existing.status = 'active';
    existing.emailVerified = true;
    existing.passwordHash = passwordHash;
    Object.assign(existing, input.extras ?? {});
    await existing.save();
    return existing;
  }
  return User.create({
    email: input.email,
    name: input.name,
    role: input.role,
    status: 'active',
    emailVerified: true,
    passwordHash,
    skills: [],
    portfolio: [],
    ...(input.extras ?? {}),
  });
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to seed demo data while NODE_ENV=production.');
    process.exit(1);
  }

  await connectDatabase();

  const client = await upsertDemoUser({
    email: CLIENT_EMAIL,
    name: 'Demo Client',
    role: 'client',
    extras: { bio: 'Hiring manager exploring DevHire demo workflows.' },
  });

  const freelancer = await upsertDemoUser({
    email: FREELANCER_EMAIL,
    name: 'Demo Freelancer',
    role: 'freelancer',
    extras: {
      professionalTitle: 'Full-stack TypeScript developer',
      about: 'Builds marketplace features with React, Express, and MongoDB.',
      skills: ['React', 'TypeScript', 'Node.js', 'MongoDB'],
      hourlyRate: 55,
      availability: 'available',
      bio: 'Available for freelance product work.',
    },
  });

  let job = await Job.findOne({ client: client._id, title: 'Build a freelance marketplace MVP' });
  if (!job) {
    job = await Job.create({
      title: 'Build a freelance marketplace MVP',
      description:
        'We need a client/freelancer marketplace with auth, jobs, proposals, contracts, and reviews. Prefer TypeScript across the stack and clear ownership rules on the API.',
      skills: ['React', 'TypeScript', 'Node.js'],
      budgetType: 'fixed',
      budgetMin: 1200,
      budgetMax: 1800,
      currency: 'USD',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'open',
      moderationStatus: 'visible',
      client: client._id,
    });
  } else if (job.status === 'draft' || job.status === 'paused') {
    job.status = 'open';
    job.moderationStatus = 'visible';
    await job.save();
  }

  let proposal = await Proposal.findOne({ job: job._id, freelancer: freelancer._id });
  if (!proposal) {
    proposal = await Proposal.create({
      job: job._id,
      freelancer: freelancer._id,
      coverLetter:
        'I have shipped similar marketplace workflows and can deliver auth, jobs, proposals, and contracts with strong backend authorization.',
      bidAmount: 1500,
      deliveryDays: 21,
      status: 'pending',
    });
  }

  console.log('Demo seed ready (idempotent).');
  console.log('');
  console.log('Login accounts (local demo only):');
  console.log(`  Client:     ${CLIENT_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  Freelancer: ${FREELANCER_EMAIL} / ${DEMO_PASSWORD}`);
  console.log('');
  console.log(`Open job id: ${job._id.toString()} (${job.status})`);
  console.log(`Proposal id: ${proposal._id.toString()} (${proposal.status})`);
  console.log('');
  console.log('Suggested next demo steps:');
  console.log('  1. Log in as client → /client/jobs/{jobId}/proposals → Accept');
  console.log('  2. Add milestones on the contract → freelancer submits → client approves');
  console.log('  3. Complete contract → both leave reviews');
  console.log('  4. Create admin separately: npm run create-admin -- --email ... --password ...');
  console.log('');
  console.log(
    `Existing contracts for this job: ${await Contract.countDocuments({ job: job._id })}`,
  );
  console.log(`Existing reviews in DB: ${await Review.countDocuments({})}`);

  await disconnectDatabase();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  if (mongoose.connection.readyState !== 0) {
    await disconnectDatabase();
  }
  process.exit(1);
});
