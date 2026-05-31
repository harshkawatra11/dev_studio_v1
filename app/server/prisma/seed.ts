import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const HASH   = bcrypt.hashSync('Password123!', 12);

async function main() {
  console.log('🌱 Seeding database...');

  // Clear all tables (SQLite-compatible — no TRUNCATE)
  await prisma.savedJob.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.application.deleteMany();
  await prisma.jobTag.deleteMany();
  await prisma.job.deleteMany();
  await prisma.company.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // ── Users ──────────────────────────────────────────────────────────────────

  const [emp1, emp2, admin, ...candidates] = await Promise.all([
    prisma.user.create({ data: { email: 'sarah@techcorp.io', passwordHash: HASH, name: 'Sarah Chen', role: "EMPLOYER", bio: 'VP Engineering at TechCorp', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah' } }),
    prisma.user.create({ data: { email: 'marcus@startuphub.io', passwordHash: HASH, name: 'Marcus Rivera', role: "EMPLOYER", bio: 'CTO at StartupHub', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=marcus' } }),
    prisma.user.create({ data: { email: 'admin@jobboard.dev', passwordHash: HASH, name: 'Admin', role: "ADMIN" } }),
    prisma.user.create({ data: { email: 'alex@candidate.dev', passwordHash: HASH, name: 'Alex Johnson', role: "CANDIDATE", bio: 'Full-stack developer, 4 years experience', resumeUrl: 'https://example.com/resume-alex.pdf', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alex' } }),
    prisma.user.create({ data: { email: 'priya@candidate.dev', passwordHash: HASH, name: 'Priya Sharma', role: "CANDIDATE", bio: 'Frontend engineer, React & TypeScript specialist', resumeUrl: 'https://example.com/resume-priya.pdf', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=priya' } }),
    prisma.user.create({ data: { email: 'james@candidate.dev', passwordHash: HASH, name: 'James O\'Brien', role: "CANDIDATE", bio: 'Backend developer with Node.js & Python expertise', resumeUrl: 'https://example.com/resume-james.pdf', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=james' } }),
    prisma.user.create({ data: { email: 'luna@candidate.dev', passwordHash: HASH, name: 'Luna Park', role: "CANDIDATE", bio: 'UI/UX designer turned developer', resumeUrl: 'https://example.com/resume-luna.pdf', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=luna' } }),
    prisma.user.create({ data: { email: 'dave@candidate.dev', passwordHash: HASH, name: 'Dave Kumar', role: "CANDIDATE", bio: 'DevOps engineer, cloud infrastructure specialist', resumeUrl: 'https://example.com/resume-dave.pdf', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dave' } }),
  ]);

  // ── Companies ──────────────────────────────────────────────────────────────

  const [tc, sh] = await Promise.all([
    prisma.company.create({ data: {
      name: 'TechCorp', ownerId: emp1.id,
      logoUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=techcorp',
      website: 'https://techcorp.io', industry: 'Software', location: 'San Francisco, CA',
      size: '51-200',
      description: 'TechCorp builds developer tools used by 50,000+ engineering teams worldwide. We\'re a remote-first company that values autonomy, clear communication, and shipping great software.',
    }}),
    prisma.company.create({ data: {
      name: 'StartupHub', ownerId: emp2.id,
      logoUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=startuphub',
      website: 'https://startuphub.io', industry: 'SaaS / Fintech', location: 'New York, NY',
      size: '11-50',
      description: 'StartupHub is a Series A fintech startup reshaping how early-stage companies manage finances. Fast-paced, ambitious, and backed by top-tier VCs.',
    }}),
  ]);

  // ── Jobs ───────────────────────────────────────────────────────────────────

  const closesAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const jobs = await Promise.all([
    prisma.job.create({ data: {
      title: 'Senior Full-Stack Engineer', companyId: tc.id,
      description: '## About the Role\n\nWe\'re looking for a Senior Full-Stack Engineer to join our platform team. You\'ll own end-to-end features from database design to polished UI.\n\n## What You\'ll Do\n- Design and build scalable APIs using Node.js and TypeScript\n- Build beautiful React interfaces with attention to performance\n- Own the full delivery lifecycle: spec → ship → monitor\n\n## Requirements\n- 4+ years of full-stack experience\n- Strong TypeScript skills (frontend and backend)\n- Experience with PostgreSQL and modern ORMs\n- Bonus: Prisma, TanStack Query, CI/CD',
      location: 'San Francisco, CA', type: "FULL_TIME",
      salaryMin: 150000, salaryMax: 200000, experienceMin: 4, closesAt,
      tags: { create: [{ name: 'TypeScript' }, { name: 'React' }, { name: 'Node.js' }, { name: 'PostgreSQL' }] },
    }}),
    prisma.job.create({ data: {
      title: 'Frontend Engineer (React)', companyId: tc.id,
      description: '## Frontend Engineer\n\nJoin our design systems team to build the component library used across all TechCorp products.\n\n## Requirements\n- 3+ years React experience\n- Strong CSS / animation skills\n- Experience with design systems and Storybook\n- Figma-to-code fluency',
      location: 'Remote', type: "REMOTE",
      salaryMin: 120000, salaryMax: 160000, experienceMin: 3, closesAt,
      tags: { create: [{ name: 'React' }, { name: 'TypeScript' }, { name: 'CSS' }, { name: 'Figma' }] },
    }}),
    prisma.job.create({ data: {
      title: 'Backend Engineer (Node.js)', companyId: tc.id,
      description: '## Backend Engineer\n\nWork on the core API powering TechCorp\'s SaaS platform.\n\n## Stack\n- Node.js + Express\n- PostgreSQL + Prisma\n- Redis, RabbitMQ\n- AWS ECS',
      location: 'Remote', type: "REMOTE",
      salaryMin: 130000, salaryMax: 175000, experienceMin: 3, closesAt,
      tags: { create: [{ name: 'Node.js' }, { name: 'PostgreSQL' }, { name: 'AWS' }, { name: 'Redis' }] },
    }}),
    prisma.job.create({ data: {
      title: 'DevOps Engineer', companyId: tc.id,
      description: '## DevOps Engineer\n\nOwn our infrastructure and CI/CD pipelines. You\'ll be instrumental in our journey from 99.9% to 99.99% uptime.\n\n## Requirements\n- Kubernetes and Docker expertise\n- Terraform / infrastructure as code\n- Strong Linux fundamentals\n- AWS or GCP experience',
      location: 'San Francisco, CA', type: "FULL_TIME",
      salaryMin: 140000, salaryMax: 185000, experienceMin: 4, closesAt,
      tags: { create: [{ name: 'Kubernetes' }, { name: 'Terraform' }, { name: 'AWS' }, { name: 'Docker' }] },
    }}),
    prisma.job.create({ data: {
      title: 'Product Engineer (Fintech)', companyId: sh.id,
      description: '## Product Engineer\n\nAt StartupHub, engineers own products end-to-end. You\'ll build features that directly impact thousands of startup founders managing their finances.\n\n## What We Use\n- React + Next.js frontend\n- Python FastAPI backend\n- Stripe, Plaid integrations\n- PostgreSQL on RDS',
      location: 'New York, NY', type: "FULL_TIME",
      salaryMin: 130000, salaryMax: 170000, experienceMin: 3, closesAt,
      tags: { create: [{ name: 'React' }, { name: 'Python' }, { name: 'Stripe' }, { name: 'Fintech' }] },
    }}),
    prisma.job.create({ data: {
      title: 'Mobile Engineer (React Native)', companyId: sh.id,
      description: '## Mobile Engineer\n\nBuild StartupHub\'s mobile app from 0 to 1. First mobile hire — you\'ll have enormous impact.\n\n## Requirements\n- Strong React Native experience\n- iOS + Android deployment experience\n- REST API integration\n- Bonus: Expo, Reanimated',
      location: 'Remote', type: "REMOTE",
      salaryMin: 115000, salaryMax: 150000, experienceMin: 2, closesAt,
      tags: { create: [{ name: 'React Native' }, { name: 'iOS' }, { name: 'Android' }, { name: 'Expo' }] },
    }}),
    prisma.job.create({ data: {
      title: 'Engineering Intern (Summer 2025)', companyId: sh.id,
      description: '## Summer Engineering Internship\n\nJoin StartupHub for a 12-week internship and ship real features that users will love.\n\n## Requirements\n- Currently enrolled in CS or related\n- Basic React and REST API knowledge\n- Passionate about startups',
      location: 'New York, NY', type: "INTERNSHIP",
      salaryMin: 45, salaryMax: 55, currency: 'USD', experienceMin: 0, closesAt,
      tags: { create: [{ name: 'React' }, { name: 'JavaScript' }, { name: 'Internship' }] },
    }}),
    prisma.job.create({ data: {
      title: 'Contract: Data Engineer', companyId: tc.id,
      description: '## Contract Data Engineer (6 months)\n\nBuild TechCorp\'s data pipeline from scratch. This is a project-based contract with potential to convert full-time.\n\n## Requirements\n- dbt, Airflow, or similar\n- Python data processing\n- BigQuery / Redshift experience\n- Data modeling expertise',
      location: 'Remote', type: "CONTRACT",
      salaryMin: 120, salaryMax: 150, currency: 'USD', experienceMin: 3, closesAt,
      tags: { create: [{ name: 'Python' }, { name: 'dbt' }, { name: 'Airflow' }, { name: 'BigQuery' }] },
    }}),
  ]);

  const RESUME = 'https://example.com/resume.pdf';

  // ── Applications (fill the Kanban) ─────────────────────────────────────────

  const apps = await Promise.all([
    // Job 0 (Senior FS) — various pipeline stages
    prisma.application.create({ data: { candidateId: candidates[0].id, jobId: jobs[0].id, status: "HIRED",     resumeUrl: RESUME, coverLetter: 'Excited about this role at TechCorp!', note: 'Strong candidate, great system design' } }),
    prisma.application.create({ data: { candidateId: candidates[1].id, jobId: jobs[0].id, status: "INTERVIEW",  resumeUrl: RESUME, coverLetter: 'React specialist with 5 years exp.' } }),
    prisma.application.create({ data: { candidateId: candidates[2].id, jobId: jobs[0].id, status: "OFFER",      resumeUrl: RESUME } }),
    prisma.application.create({ data: { candidateId: candidates[3].id, jobId: jobs[0].id, status: "REJECTED",   resumeUrl: RESUME } }),
    prisma.application.create({ data: { candidateId: candidates[4].id, jobId: jobs[0].id, status: "SCREENING",  resumeUrl: RESUME, coverLetter: 'DevOps background, looking to move to full-stack.' } }),

    // Job 1 (Frontend)
    prisma.application.create({ data: { candidateId: candidates[0].id, jobId: jobs[1].id, status: "APPLIED",    resumeUrl: RESUME } }),
    prisma.application.create({ data: { candidateId: candidates[1].id, jobId: jobs[1].id, status: "SCREENING",  resumeUrl: RESUME, coverLetter: 'Design systems are my passion.' } }),

    // Job 2 (Backend)
    prisma.application.create({ data: { candidateId: candidates[2].id, jobId: jobs[2].id, status: "APPLIED",    resumeUrl: RESUME } }),
    prisma.application.create({ data: { candidateId: candidates[3].id, jobId: jobs[2].id, status: "INTERVIEW",  resumeUrl: RESUME } }),

    // Job 4 (Fintech)
    prisma.application.create({ data: { candidateId: candidates[1].id, jobId: jobs[4].id, status: "APPLIED",    resumeUrl: RESUME } }),
    prisma.application.create({ data: { candidateId: candidates[4].id, jobId: jobs[4].id, status: "SCREENING",  resumeUrl: RESUME } }),

    // Job 5 (Mobile)
    prisma.application.create({ data: { candidateId: candidates[3].id, jobId: jobs[5].id, status: "APPLIED",    resumeUrl: RESUME } }),
  ]);

  // ── Interviews ─────────────────────────────────────────────────────────────

  const interviewApps = apps.filter(a => a.status === 'INTERVIEW');
  await Promise.all(interviewApps.map((app, i) =>
    prisma.interview.create({ data: {
      applicationId: app.id,
      scheduledAt:   new Date(Date.now() + (i + 2) * 24 * 60 * 60 * 1000),
      meetLink:      'https://meet.google.com/abc-defg-hij',
      notes:         'Technical interview — system design + coding round',
    }}),
  ));

  // ── Saved Jobs ─────────────────────────────────────────────────────────────

  await Promise.all([
    prisma.savedJob.create({ data: { userId: candidates[0].id, jobId: jobs[1].id } }),
    prisma.savedJob.create({ data: { userId: candidates[0].id, jobId: jobs[3].id } }),
    prisma.savedJob.create({ data: { userId: candidates[1].id, jobId: jobs[0].id } }),
  ]);

  console.log('✅ Seed complete!');
  console.log('\n📋 Demo credentials (password: Password123! for all):');
  console.log('   EMPLOYER:  sarah@techcorp.io   (TechCorp)');
  console.log('   EMPLOYER:  marcus@startuphub.io (StartupHub)');
  console.log('   CANDIDATE: alex@candidate.dev');
  console.log('   CANDIDATE: priya@candidate.dev');
  console.log('   ADMIN:     admin@jobboard.dev\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
