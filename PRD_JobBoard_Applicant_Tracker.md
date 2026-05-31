# PRD — JobBoard: Job Board + Applicant Tracker

**Stack:** Node.js · Express · Prisma ORM · PostgreSQL · React (Vite) · TailwindCSS  
**Auth:** JWT (access + refresh token pattern)  
**Roles:** `EMPLOYER` · `CANDIDATE` · `ADMIN`  
**Version:** 1.0.0  

---

## 1. Product Overview

A full-stack job board where employers post jobs, manage applicants through a Kanban-style pipeline, and candidates apply, track application statuses, and receive email notifications. Each of the four layers — Database, ORM, API, Frontend — has multiple files with clearly scoped responsibilities.

---

## 2. User Roles & Capabilities

| Capability | Candidate | Employer | Admin |
|---|---|---|---|
| Browse & search jobs | ✓ | ✓ | ✓ |
| Apply to a job | ✓ | — | — |
| Track own applications | ✓ | — | — |
| Post jobs | — | ✓ | ✓ |
| Manage applicant pipeline | — | ✓ | ✓ |
| Shortlist / reject candidates | — | ✓ | ✓ |
| Schedule interviews | — | ✓ | — |
| View all jobs & users | — | — | ✓ |
| Suspend users / jobs | — | — | ✓ |

---

## 3. Core Features

1. **Auth** — Register, login, JWT refresh, role-gated routes
2. **Job Listings** — CRUD, filters (location, type, salary, tags), pagination, search
3. **Applications** — Submit with resume upload, cover letter, multi-stage pipeline
4. **Pipeline Management** — Employer moves applicants through stages: `APPLIED → SCREENING → INTERVIEW → OFFER → HIRED / REJECTED`
5. **Interview Scheduling** — Employer sets date/time slot; candidate gets notified
6. **Email Notifications** — On apply, status change, interview scheduled
7. **Saved Jobs** — Candidates bookmark jobs
8. **Company Profiles** — Employer creates a company page linked to their job posts
9. **Admin Dashboard** — Usage stats, moderation tools, user management

---

## 4. Component 1 — Database (PostgreSQL)

### 4.1 File Structure

```
db/
├── migrations/          # Prisma auto-generated migration files
│   ├── 20240601_init/
│   ├── 20240602_add_interviews/
│   └── 20240603_add_saved_jobs/
├── seed.ts              # Seed script: roles, sample jobs, test users
└── schema.prisma        # Single source of truth for all models
```

### 4.2 Entity Relationship Overview

```
User ──< Application >── Job ──< JobTag
 │                        │
 └── Company              └── Company
 │
 └── SavedJob >── Job
 │
 └── Interview >── Application
```

### 4.3 Full Schema (`schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  CANDIDATE
  EMPLOYER
  ADMIN
}

enum JobType {
  FULL_TIME
  PART_TIME
  CONTRACT
  INTERNSHIP
  REMOTE
}

enum ApplicationStatus {
  APPLIED
  SCREENING
  INTERVIEW
  OFFER
  HIRED
  REJECTED
}

model User {
  id            String        @id @default(cuid())
  email         String        @unique
  passwordHash  String
  name          String
  role          Role          @default(CANDIDATE)
  avatarUrl     String?
  bio           String?
  resumeUrl     String?
  isActive      Boolean       @default(true)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  company       Company?
  applications  Application[]
  savedJobs     SavedJob[]
  refreshTokens RefreshToken[]
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model Company {
  id          String   @id @default(cuid())
  name        String
  logoUrl     String?
  website     String?
  description String?
  location    String?
  industry    String?
  size        String?  // e.g. "1-10", "11-50", "51-200"
  ownerId     String   @unique
  owner       User     @relation(fields: [ownerId], references: [id])
  jobs        Job[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Job {
  id            String        @id @default(cuid())
  title         String
  description   String        // rich text / markdown
  location      String
  type          JobType       @default(FULL_TIME)
  salaryMin     Int?
  salaryMax     Int?
  currency      String        @default("USD")
  experienceMin Int?          // years
  isActive      Boolean       @default(true)
  closesAt      DateTime?
  companyId     String
  company       Company       @relation(fields: [companyId], references: [id])
  tags          JobTag[]
  applications  Application[]
  savedBy       SavedJob[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
}

model JobTag {
  id    String @id @default(cuid())
  name  String
  jobId String
  job   Job    @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@unique([jobId, name])
}

model Application {
  id          String            @id @default(cuid())
  status      ApplicationStatus @default(APPLIED)
  coverLetter String?
  resumeUrl   String
  note        String?           // internal employer note
  candidateId String
  candidate   User              @relation(fields: [candidateId], references: [id])
  jobId       String
  job         Job               @relation(fields: [jobId], references: [id])
  interview   Interview?
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@unique([candidateId, jobId])   // one application per job per candidate
}

model Interview {
  id            String      @id @default(cuid())
  applicationId String      @unique
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  scheduledAt   DateTime
  meetLink      String?
  notes         String?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}

model SavedJob {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  jobId       String
  job         Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())

  @@unique([userId, jobId])
}
```

### 4.4 Key DB Design Decisions

- `@@unique([candidateId, jobId])` on `Application` enforces one-application-per-job at DB level, not just app level.
- `RefreshToken` table enables secure token rotation and server-side revocation.
- `JobTag` is a separate table (not a string array) to allow indexed filtering by tag.
- `salaryMin`/`salaryMax` stored as integers (cents or whole currency units) to avoid float precision issues.
- `interview` is 1:1 with `application` — scheduling replaces, not appends.

---

## 5. Component 2 — ORM Layer (Prisma)

### 5.1 File Structure

```
src/
└── prisma/
    ├── client.ts          # Singleton PrismaClient instance
    ├── userRepository.ts  # All User + RefreshToken queries
    ├── jobRepository.ts   # Job CRUD, search, filter, pagination
    ├── applicationRepository.ts  # Application CRUD, pipeline updates
    ├── companyRepository.ts      # Company CRUD
    └── interviewRepository.ts    # Interview create/update
```

### 5.2 File Responsibilities

#### `client.ts`
Exports a singleton `prisma` instance. Prevents connection pool exhaustion in dev (Next.js HMR pattern adapted for Express).

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['query', 'error'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

#### `userRepository.ts`
- `createUser(data)` — hashes password externally, stores hash
- `findByEmail(email)` — login lookup
- `findById(id)` — auth middleware lookup
- `updateProfile(id, data)` — name, bio, avatarUrl, resumeUrl
- `storeRefreshToken(userId, token, expiresAt)`
- `deleteRefreshToken(token)`
- `findRefreshToken(token)`

#### `jobRepository.ts`
- `createJob(data)` — includes nested `tags` create
- `updateJob(id, data)` — upserts tags (delete all, re-insert)
- `deleteJob(id)` — soft delete via `isActive: false`
- `findJobById(id)` — includes company + tags
- `listJobs(filters, pagination)` — filters: `type`, `location`, `tags[]`, `salaryMin`, `keyword` (title/description fulltext), `companyId`; pagination via `skip`/`take`; sorted by `createdAt DESC`
- `searchJobs(query)` — uses Prisma `contains` with `mode: 'insensitive'`

#### `applicationRepository.ts`
- `createApplication(data)` — candidate applies
- `findApplicationById(id)` — includes candidate + job + interview
- `listByJob(jobId, filters)` — employer views applicants; filter by `status`
- `listByCandidate(candidateId)` — candidate tracks own applications
- `updateStatus(id, status, note?)` — pipeline stage change
- `checkDuplicate(candidateId, jobId)` — pre-flight before create

#### `companyRepository.ts`
- `createCompany(data)` — linked to employer `ownerId`
- `updateCompany(id, data)`
- `findByOwner(ownerId)`
- `findCompanyById(id)` — includes jobs

#### `interviewRepository.ts`
- `scheduleInterview(applicationId, data)` — upsert (reschedule replaces)
- `findByApplication(applicationId)`
- `updateInterview(id, data)`

---

## 6. Component 3 — API Layer (Express)

### 6.1 File Structure

```
src/
├── index.ts               # Entry point: app bootstrap, listen
├── app.ts                 # Express app config, middleware registration
├── config/
│   └── env.ts             # Validated env vars (zod)
├── middleware/
│   ├── auth.middleware.ts  # JWT verify, attach req.user
│   ├── role.middleware.ts  # requireRole(...roles) factory
│   ├── validate.middleware.ts  # Zod schema validation wrapper
│   └── error.middleware.ts     # Global error handler
├── routes/
│   ├── index.ts            # Mounts all routers under /api/v1
│   ├── auth.routes.ts      # /auth/*
│   ├── user.routes.ts      # /users/*
│   ├── job.routes.ts       # /jobs/*
│   ├── application.routes.ts   # /applications/*
│   ├── company.routes.ts   # /companies/*
│   └── interview.routes.ts # /interviews/*
├── controllers/
│   ├── auth.controller.ts
│   ├── user.controller.ts
│   ├── job.controller.ts
│   ├── application.controller.ts
│   ├── company.controller.ts
│   └── interview.controller.ts
├── services/
│   ├── auth.service.ts     # JWT sign/verify, bcrypt, token rotation
│   ├── job.service.ts      # Business logic: close expired jobs, etc.
│   ├── application.service.ts  # Pipeline logic, status validation
│   ├── upload.service.ts   # Multer + S3/Cloudinary resume upload
│   └── email.service.ts    # Nodemailer templates: apply, status change, interview
├── schemas/
│   ├── auth.schema.ts      # Zod: register, login bodies
│   ├── job.schema.ts       # Zod: createJob, updateJob, listJobs query
│   ├── application.schema.ts
│   ├── company.schema.ts
│   └── interview.schema.ts
└── utils/
    ├── jwt.ts              # signAccessToken, signRefreshToken, verifyToken
    ├── hash.ts             # bcrypt helpers
    ├── pagination.ts       # parsePaginationQuery, buildMeta
    └── apiResponse.ts      # Standardized { success, data, meta, error } shape
```

### 6.2 API Routes Contract

#### Auth — `/api/v1/auth`

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/register` | — | `{ name, email, password, role }` | `{ user, accessToken, refreshToken }` |
| POST | `/login` | — | `{ email, password }` | `{ user, accessToken, refreshToken }` |
| POST | `/refresh` | — | `{ refreshToken }` | `{ accessToken, refreshToken }` |
| POST | `/logout` | Bearer | `{ refreshToken }` | `204` |
| GET | `/me` | Bearer | — | `{ user }` |

#### Jobs — `/api/v1/jobs`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/` | — | Query: `keyword, type, location, tags, salaryMin, salaryMax, page, limit` |
| GET | `/:id` | — | Includes company + tags |
| POST | `/` | Employer | Create with tags array |
| PATCH | `/:id` | Employer (owner) | Partial update |
| DELETE | `/:id` | Employer (owner) | Soft delete |
| GET | `/company/:companyId` | — | All jobs for a company |

#### Applications — `/api/v1/applications`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/` | Candidate | Multipart: `jobId, coverLetter, resume (file)` |
| GET | `/my` | Candidate | Own applications + statuses |
| GET | `/job/:jobId` | Employer | All applicants for a job; filter by status |
| GET | `/:id` | Owner or Employer | Single application detail |
| PATCH | `/:id/status` | Employer | `{ status, note }` — triggers email |
| DELETE | `/:id` | Candidate | Withdraw (only if APPLIED) |

#### Companies — `/api/v1/companies`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/` | Employer | One company per employer |
| GET | `/:id` | — | Public company profile + active jobs |
| PATCH | `/:id` | Employer (owner) | Update profile |

#### Interviews — `/api/v1/interviews`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/` | Employer | `{ applicationId, scheduledAt, meetLink, notes }` |
| GET | `/:applicationId` | Employer or Candidate | Get interview for an application |
| PATCH | `/:id` | Employer | Reschedule / update notes |

#### Users — `/api/v1/users`

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| PATCH | `/profile` | Bearer | Update name, bio, avatarUrl |
| POST | `/resume` | Candidate | Upload resume file |
| GET | `/saved-jobs` | Candidate | Bookmarked jobs |
| POST | `/saved-jobs/:jobId` | Candidate | Save a job |
| DELETE | `/saved-jobs/:jobId` | Candidate | Unsave |

### 6.3 Middleware Chain

```
Request
  └── cors()
  └── helmet()
  └── express.json()
  └── morgan (logging)
  └── route handler
        └── auth.middleware (if protected)
        └── role.middleware (if role-gated)
        └── validate.middleware (Zod schema)
        └── controller → service → repository
  └── error.middleware (catches all thrown errors)
```

### 6.4 Auth Flow Detail

```
Login
  → bcrypt.compare(password, hash)
  → sign accessToken (15m) + refreshToken (7d)
  → store refreshToken in DB (hashed)
  → return both tokens to client

Refresh
  → verify refreshToken signature
  → lookup in DB (not revoked)
  → issue new accessToken + new refreshToken (rotation)
  → delete old refreshToken from DB

Protected route
  → extract Bearer token from Authorization header
  → verify + decode → attach user to req.user
  → role middleware checks req.user.role
```

### 6.5 Email Triggers (`email.service.ts`)

| Trigger | Recipient | Template |
|---------|-----------|----------|
| Application submitted | Candidate | "Application received for [Job]" |
| Status changed | Candidate | "Your application status: [Status]" |
| Interview scheduled | Candidate | "Interview scheduled for [Date/Time]" |
| New applicant | Employer | "New application for [Job]" |

---

## 7. Component 4 — Frontend (React + Vite)

### 7.1 Tech Choices

- **React 18** + **Vite**
- **TailwindCSS** + **shadcn/ui** components
- **React Router v6** (client-side routing)
- **TanStack Query** (server state: fetching, caching, mutations)
- **React Hook Form** + **Zod** (form validation)
- **Axios** instance with interceptors (auto-attach token, auto-refresh)
- **Zustand** (auth state: user, tokens)

### 7.2 File Structure

```
src/
├── main.tsx                   # Vite entry, React root, QueryClient, Router
├── App.tsx                    # Route definitions, layout wrappers
├── api/
│   ├── axios.ts               # Axios instance, interceptors, token refresh
│   ├── auth.api.ts            # register, login, logout, refresh, getMe
│   ├── jobs.api.ts            # listJobs, getJob, createJob, updateJob, deleteJob
│   ├── applications.api.ts    # apply, getMyApplications, getJobApplications, updateStatus
│   ├── companies.api.ts       # createCompany, getCompany, updateCompany
│   ├── interviews.api.ts      # scheduleInterview, getInterview, updateInterview
│   └── users.api.ts           # updateProfile, uploadResume, savedJobs CRUD
├── store/
│   └── auth.store.ts          # Zustand: user, accessToken, setAuth, clearAuth
├── hooks/
│   ├── useAuth.ts             # Login, register, logout mutations + redirect
│   ├── useJobs.ts             # useQuery wrappers for job list/detail
│   ├── useApplications.ts     # Apply mutation, my applications query
│   ├── usePipeline.ts         # Job applicants query + status mutation (employer)
│   └── useCompany.ts          # Company CRUD mutations
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx         # Role-aware nav links, avatar dropdown
│   │   ├── Sidebar.tsx        # Employer dashboard sidebar
│   │   └── Footer.tsx
│   ├── ui/                    # shadcn/ui re-exports + custom atoms
│   │   ├── Button.tsx
│   │   ├── Badge.tsx          # Status badges with color mapping
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Spinner.tsx
│   │   └── Pagination.tsx
│   ├── jobs/
│   │   ├── JobCard.tsx        # Listing card: title, company, salary, tags, type
│   │   ├── JobFilters.tsx     # Filter panel: keyword, type, location, salary range, tags
│   │   ├── JobForm.tsx        # Create/edit job form (employer)
│   │   └── JobDetail.tsx      # Full job description + apply CTA
│   ├── applications/
│   │   ├── ApplicationCard.tsx     # Candidate's application status card
│   │   ├── ApplyModal.tsx          # Cover letter + resume upload modal
│   │   └── ApplicationDetail.tsx   # Full view: candidate info, resume, timeline
│   ├── pipeline/
│   │   ├── PipelineBoard.tsx       # Kanban columns per ApplicationStatus
│   │   ├── PipelineColumn.tsx      # Single status column with applicant cards
│   │   └── ApplicantCard.tsx       # Draggable card: name, avatar, applied date
│   ├── company/
│   │   ├── CompanyForm.tsx         # Create/edit company profile
│   │   └── CompanyProfile.tsx      # Public company page: logo, info, job list
│   └── interview/
│       ├── InterviewScheduler.tsx  # Date/time picker + meet link input
│       └── InterviewBadge.tsx      # Shows scheduled date on application card
├── pages/
│   ├── public/
│   │   ├── HomePage.tsx            # Hero + featured jobs + search bar
│   │   ├── JobsPage.tsx            # Paginated job list + filters
│   │   ├── JobDetailPage.tsx       # Single job view
│   │   └── CompanyPage.tsx         # Public company profile
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   └── RegisterPage.tsx        # Role selection: Candidate / Employer
│   ├── candidate/
│   │   ├── DashboardPage.tsx       # My applications overview + saved jobs
│   │   ├── ApplicationsPage.tsx    # Full list with status filters
│   │   └── ProfilePage.tsx         # Edit profile, upload resume
│   └── employer/
│       ├── DashboardPage.tsx       # Stats: total jobs, total applicants, hired
│       ├── MyJobsPage.tsx          # Job list with edit/delete/toggle active
│       ├── PostJobPage.tsx         # Job creation form
│       ├── EditJobPage.tsx         # Job edit form
│       ├── PipelinePage.tsx        # Kanban pipeline for a specific job
│       └── CompanySettingsPage.tsx # Company profile editor
├── guards/
│   ├── AuthGuard.tsx          # Redirect to /login if not authenticated
│   └── RoleGuard.tsx          # Redirect if wrong role
├── lib/
│   ├── queryClient.ts         # TanStack QueryClient config
│   └── utils.ts               # cn(), formatSalary(), formatDate(), statusColor()
└── types/
    ├── user.types.ts
    ├── job.types.ts
    ├── application.types.ts
    ├── company.types.ts
    └── interview.types.ts
```

### 7.3 Route Map

```
/                          → HomePage (public)
/jobs                      → JobsPage (public)
/jobs/:id                  → JobDetailPage (public)
/companies/:id             → CompanyPage (public)
/login                     → LoginPage
/register                  → RegisterPage

/candidate/dashboard       → [AuthGuard + RoleGuard(CANDIDATE)]
/candidate/applications    → [AuthGuard + RoleGuard(CANDIDATE)]
/candidate/profile         → [AuthGuard + RoleGuard(CANDIDATE)]

/employer/dashboard        → [AuthGuard + RoleGuard(EMPLOYER)]
/employer/jobs             → [AuthGuard + RoleGuard(EMPLOYER)]
/employer/jobs/new         → [AuthGuard + RoleGuard(EMPLOYER)]
/employer/jobs/:id/edit    → [AuthGuard + RoleGuard(EMPLOYER)]
/employer/jobs/:id/pipeline → [AuthGuard + RoleGuard(EMPLOYER)]
/employer/company          → [AuthGuard + RoleGuard(EMPLOYER)]
```

### 7.4 Key UX Flows

**Candidate Apply Flow**
```
JobDetailPage
  → click "Apply Now"
  → ApplyModal opens
  → upload resume (if no profile resume) + optional cover letter
  → submit → POST /applications
  → optimistic update → redirect to /candidate/applications
```

**Employer Pipeline Flow**
```
MyJobsPage → click "View Pipeline" on a job
  → PipelineBoard renders columns: APPLIED | SCREENING | INTERVIEW | OFFER | HIRED | REJECTED
  → drag ApplicantCard to new column
  → PATCH /applications/:id/status { status }
  → email sent to candidate
  → if dragged to INTERVIEW column → InterviewScheduler modal opens
```

**Token Refresh Flow (axios.ts)**
```
Request with expired accessToken
  → 401 received
  → interceptor queues concurrent requests
  → POST /auth/refresh with refreshToken (from Zustand)
  → new tokens stored
  → queued requests retried with new accessToken
  → if refresh also fails → clearAuth() + redirect /login
```

---

## 8. Environment Variables

```env
# Server
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@localhost:5432/jobboard

# JWT
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_app_password
EMAIL_FROM=JobBoard <noreply@jobboard.com>

# File Upload
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Client
VITE_API_URL=http://localhost:4000/api/v1
```

---

## 9. Project Directory Layout (Mono-repo)

```
jobboard/
├── server/                    # Node + Express backend
│   ├── src/
│   │   ├── index.ts
│   │   ├── app.ts
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── prisma/
│   │   ├── schemas/
│   │   └── utils/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   ├── package.json
│   └── tsconfig.json
│
├── client/                    # React + Vite frontend
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/
│   │   ├── store/
│   │   ├── hooks/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── guards/
│   │   ├── lib/
│   │   └── types/
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.ts
│
├── .env
└── README.md
```

---

## 10. Build & Run

```bash
# 1. Install deps
cd server && npm install
cd ../client && npm install

# 2. Setup DB
cd ../server
npx prisma migrate dev --name init
npx prisma db seed

# 3. Run dev
# Terminal 1
cd server && npm run dev      # Express on :4000

# Terminal 2
cd client && npm run dev      # Vite on :5173
```

---

## 11. What Each Layer Owns — Summary

| Layer | Files | Owns |
|---|---|---|
| **Database** | `schema.prisma`, `seed.ts`, `migrations/` | Tables, relations, constraints, indexes |
| **ORM** | `prisma/client.ts`, `*Repository.ts` × 5 | All DB queries, no business logic |
| **API** | `routes/` × 6, `controllers/` × 6, `services/` × 5, `middleware/` × 4, `schemas/` × 5, `utils/` × 4 | HTTP contract, auth, validation, business logic, email, file upload |
| **Frontend** | `pages/` × 13, `components/` × 20+, `hooks/` × 5, `api/` × 7, `store/`, `guards/`, `types/` | UI, routing, server state, client auth, UX flows |

---

*PRD v1.0 — Ready for Claude Code / Cursor agent execution. Each file section maps directly to a discrete implementation task.*
