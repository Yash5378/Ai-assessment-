# Recruitment Portal

A full-stack recruitment platform where **HR / Recruiters** post job openings, review applicants and search candidates by skill, while **Candidates** publish a skill profile, search jobs (by role, skills, location, experience, salary and company), apply with a cover letter, and track their application status through the review pipeline.

Built as a Claude Code assessment project with a focus on clean architecture, security, validation, and single-command Docker startup.

---

## Architecture

```
                        ┌─────────────────────────────────────────────────┐
                        │                 Docker network                  │
                        │                                                 │
 Browser ── :3000 ──►   │  ┌───────────┐        ┌───────────┐   ┌──────┐  │
 http://localhost:3000  │  │  client   │  /api  │  server   │   │  db  │  │
                        │  │  (nginx)  ├───────►│ (Express) ├──►│ (PG) │  │
                        │  │ React SPA │ proxy  │  REST API │   │      │  │
                        │  └───────────┘        └───────────┘   └──┬───┘  │
                        │                                          │      │
                        │                                   db_data volume│
                        └─────────────────────────────────────────────────┘
```

- **client** — React (Vite) single-page app, served by nginx. nginx also proxies `/api/*` to the backend, so the UI and API share one origin and the httpOnly auth cookie works without any CORS complexity.
- **server** — Node.js/Express REST API in a layered structure (routes → controllers → services → db). Runs migrations and seeds test data automatically on startup.
- **db** — PostgreSQL 16 with a named volume for persistence. **Not** exposed to the host: only the API can reach it, and it can never conflict with a Postgres already running on your machine.
- **Uploaded resumes** are stored on a second named volume (`uploads_data`) mounted into the API container, so they persist across restarts and rebuilds.

Startup order is health-gated: the API waits for Postgres to be healthy, the UI waits for the API to be healthy.

## How to Run

Prerequisites: Docker (with Docker Compose v2). Nothing else — no local Node.js or Postgres needed.

```bash
git clone https://github.com/Yash5378/Ai-assessment-.git
cd Ai-assessment-
docker compose up --build
```

Then open **http://localhost:3000**.

The API is also reachable directly at http://localhost:5000/api (e.g. `/api/health`), and **interactive API documentation (Swagger UI)** is served at **http://localhost:3000/api/docs** (spec JSON at `/api/docs.json`).

> No `.env` file is required — safe development defaults are baked into `docker-compose.yml`. To override any of them (ports, DB credentials, JWT secret), copy `.env.example` to `.env` and edit it.

To stop: `docker compose down` (data persists). To reset all data: `docker compose down -v`.

## Test Credentials

Seeded automatically on first startup:

| Role      | Email            | Password     |
| --------- | ---------------- | ------------ |
| HR        | `admin@test.com` | `Admin@1234` |
| Candidate | `user@test.com`  | `User@1234`  |

You can also register new accounts via the UI — the signup page has **Candidate** and **HR / Recruiter** tabs, so you can create either kind of account. The login page has the same tabs and tells you if you pick the wrong one for your account.

## Feature Walkthrough

### HR / Recruiter (log in as `admin@test.com` or sign up on the HR tab)
- **Dashboard** (`/hr`) — live stats: jobs posted, open positions, applications received, awaiting review.
- **Manage Jobs** (`/hr/jobs`) — post new openings (title, company, location, employment type, required skills, experience range, salary range in ₹ LPA), edit them, and close/reopen them. HR users can only manage jobs **they** created — jobs posted by other HR users are visible but read-only.
- **Find Candidates** (`/hr/candidates`) — search candidates by **skills, location and an experience range (min & max years)**. Skill and location matching is **case-insensitive** (searching `react` matches anyone with React on their profile). Each result shows the candidate's current role, expected CTC and notice period, with a **resume download** when available. Click **Contact** to open full contact details (email, phone, location, CTC, notice period), and **select multiple candidates** (checkboxes) then **Email selected** to compose one message to all of them (BCC) in your mail client. Applicant lists also expose a resume download per candidate.
- **Applicants** (`/hr/jobs/:id/applicants`) — see every candidate who applied, read their cover letter, and move the application through the pipeline: *Submitted → Under review → Accepted / Rejected*.

### Candidate (log in as `user@test.com` or sign up on the Candidate tab)
- **Onboarding** (`/onboarding`) — a **new** candidate must complete a short profile before reaching the app: phone, current city, fresher/experienced, and a **resume upload** (PDF/DOC/DOCX, max 5 MB). Until this is done, all candidate pages redirect here. (The seeded `user@test.com` is already onboarded, so the assessor logs straight in.)
- **Browse Jobs** (`/jobs`) — search open positions by **role/title, skills, location, company, your experience and minimum salary**, with an "Applied" indicator on jobs you already applied to.
- **Job detail & apply** (`/jobs/:id`) — full description with skill tags, experience and salary info; submit a cover-letter application (one per job, enforced in both API and DB).
- **My Applications** (`/my-applications`) — track the live status of every application, and **withdraw** one while it's still pending (you can re-apply later).
- **Notifications** — a bell in the navbar lights up when HR moves your application through the pipeline (under review / accepted / rejected).
- **My Profile** (`/profile`) — the full profile in sections: *Basics* (headline, skills, phone, city, experience), *Current role* (current company, designation, current CTC, notice period, industry, department), *Expectations* (expected CTC), and *Resume* (download or replace). Skills and these details are what recruiters search on.

Role-based routing is enforced on both sides: a candidate visiting `/hr` is redirected away, and the API independently rejects any request outside the caller's role (401/403).

## Tech Stack

| Layer     | Technology |
| --------- | ---------- |
| Frontend  | React 18, React Router 6, Vite 7 (build), nginx (serving + API proxy) |
| Backend   | Node.js 20, Express 4, zod (validation), jsonwebtoken, bcryptjs, helmet, express-rate-limit |
| Database  | PostgreSQL 16 (`pg` driver, parameterized queries, no ORM) |
| Testing   | Jest + supertest (server: 103 mocked + 11 real-PostgreSQL), Vitest + Testing Library (client: 32) — 146 tests |
| API Docs  | OpenAPI 3 + Swagger UI at `/api/docs` |
| Uploads   | multer (resume upload: PDF/DOC/DOCX, 5 MB cap, magic-byte content verification, server-generated filenames) |
| Tooling   | ESLint + Prettier (both apps), GitHub Actions CI (lint, tests incl. real-DB, builds, compose smoke test) |
| DevOps    | Docker Compose, multi-stage builds, health-gated startup |

## Security Highlights

- Passwords hashed with bcrypt; JWT (carrying only user id + role) stored in an **httpOnly SameSite=Lax cookie**, unreadable by JavaScript; a CSRF origin check rejects state-changing requests from foreign origins.
- Resume uploads are **content-verified with magic bytes** (%PDF / OLE / ZIP signatures) on top of mimetype, extension and 5 MB limits — spoofed files are deleted and rejected.
- Signup role comes from a strict zod enum whitelist (HR or CANDIDATE only) — nothing else can ever be created; the account's stored role is authoritative on every request.
- Every protected endpoint enforces authentication **and** role; ownership checks stop one HR user from touching another's jobs or applicants.
- All SQL is parameterized — including every search filter (skills use array-overlap parameters, never string concatenation); input is validated with zod on the server and mirrored client-side; request bodies capped at 100 KB.
- Login/register are rate-limited; login failures return one generic message (no account enumeration).
- No secrets in code — everything is environment-driven with development-only defaults; helmet sets standard security headers.

## API Reference

Full interactive docs live at **`/api/docs`** (Swagger UI). Summary:

| Method & Path | Access | Purpose |
| --- | --- | --- |
| `POST /api/auth/register` | public | Create HR or Candidate account (role whitelisted) |
| `POST /api/auth/login` · `POST /api/auth/logout` · `GET /api/auth/me` | public / auth | Session management (httpOnly JWT cookie) |
| `GET /api/jobs` | auth | Search jobs: title, company, location, skills, maxExperience, minSalary |
| `POST /api/jobs` · `PATCH /api/jobs/:id` | HR (owner) | Create / update / open–close a job |
| `GET /api/jobs/:id` | auth | Job detail (candidates see OPEN only) |
| `POST /api/jobs/:id/applications` | Candidate | Apply (optional cover letter, one per job) |
| `GET /api/jobs/:id/applications` | HR (owner) | Applicants with resume flags |
| `GET /api/applications/mine` | Candidate | My applications + status |
| `PATCH /api/applications/:id/status` | HR (owner) | UNDER_REVIEW / ACCEPTED / REJECTED (notifies the candidate) |
| `DELETE /api/applications/:id` | Candidate | Withdraw a pending application |
| `GET /api/notifications` · `POST /api/notifications/read` | auth | Notification feed + mark-as-read |
| `GET/PUT /api/profile/me` | Candidate | Full profile read/update |
| `POST /api/profile/onboarding` | Candidate | Complete onboarding (multipart, required resume) |
| `POST/GET /api/profile/resume` | Candidate | Replace / download own resume |
| `GET /api/candidates` | HR | Case-insensitive talent search (skills, location, min/max experience) |
| `GET /api/candidates/:id/resume` | HR | Download a candidate's resume |
| `GET /api/stats` | HR | Dashboard counters |
| `GET /api/health` · `GET /api/docs` | public | Liveness probe · interactive docs |

## Running Tests

```bash
# Backend unit + integration (no database needed — the db layer is mocked)
cd server && npm install && npm test

# Backend real-database integration flow (10 tests against actual PostgreSQL)
docker compose -f docker-compose.yml -f docker-compose.test.yml up -d db
cd server && npm run test:db

# Frontend (validators + component tests via Testing Library)
cd client && npm install && npm test

# Linting / formatting (both apps)
npm run lint && npm run format:check
```

CI (GitHub Actions) runs all of the above on every push: server lint + 104 tests including the real-PostgreSQL suite against a service container, client lint + tests + build, and a full `docker compose up --build` smoke test that logs in with the seeded HR account.

## Project Structure

```
├── docker-compose.yml     # full-stack orchestration (single-command startup)
├── server/                # Express REST API
│   └── src/
│       ├── config/        # single source of environment access
│       ├── db/            # pg pool, idempotent migrations, seeding
│       ├── middleware/    # auth (JWT/RBAC), validation, rate limit, errors
│       ├── validation/    # zod schemas (source of truth for input rules)
│       ├── routes/ controllers/ services/   # layered API
│       └── utils/         # ApiError, jwt, password hashing
└── client/                # React SPA
    └── src/
        ├── api/           # fetch wrapper with error normalization
        ├── context/       # auth session state
        ├── components/    # shared UI primitives
        ├── pages/         # candidate/ and hr/ feature pages
        └── utils/         # client-side validation (mirrors backend)
```

## Known Limitations

Intentionally scoped out to keep the assessment focused:

- No refresh tokens — sessions simply expire after 24 h and require a fresh login.
- No password reset / email verification flow (would need an email provider).
- No pagination — job, applicant and candidate lists load fully (fine at assessment scale).
- No file uploads — applications are cover-letter text rather than résumé attachments.
- Applications cannot be edited after submission (though pending ones can be withdrawn and re-submitted).
- Recruiter signup is open (anyone may register as HR). In production this would be gated behind company-domain verification or an admin approval step.
- The seeded `user@test.com` candidate is pre-onboarded but has **no resume file** (seeding cannot fabricate a real document), so an HR resume download for that specific account returns 404. Onboard a fresh candidate to exercise the full resume flow.
- Resumes are stored on the local Docker volume; a production system would use object storage (e.g. S3) with signed URLs and virus scanning.
- "Email selected" opens the recruiter's own mail client via a `mailto:` link (candidates BCC'd) rather than sending server-side — this keeps the stack free of SMTP configuration. A production build would send through a transactional email provider.
