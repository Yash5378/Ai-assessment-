# Backend guide (`server/`)

Express REST API over PostgreSQL. Node 20, plain `pg` (no ORM), zod validation, JWT-cookie auth. All source under `src/`.

## Request flow (layered — respect the layers)

```
routes/ → middleware (auth → validate) → controllers/ → services/ → db/pool.js → Postgres
```

- **`routes/*.routes.js`** — declare endpoints, attach middleware (`requireAuth`, `requireRole`, `validate`, `resumeUpload`). Mounted in `routes/index.js` under `/api`.
- **`controllers/*.controller.js`** — thin; read `req.user`/`req.body`/`req.params`/`req.query`, call a service, shape the JSON response. Wrapped in `utils/asyncHandler.js` so async throws reach the error handler.
- **`services/*.service.js`** — all business logic + SQL. **Every query is parameterized** (`$1, $2…`). Throw `ApiError.*` for expected failures.
- **`db/`** — `pool.js` (query helper), `migrate.js` (idempotent schema, runs on startup), `seed.js` (idempotent test data).

## Where to make common changes

| Task | Files to touch |
|------|----------------|
| New endpoint | `routes/*.routes.js` (+ mount in `routes/index.js`), `controllers/*`, `services/*`, add a schema in `validation/schemas.js` |
| New/changed request field | `validation/schemas.js` **and** the service SQL (+ mirror in `client/src/utils/validation.js`) |
| New DB column/table | `db/migrate.js`: add to `CREATE TABLE` **and** an idempotent `ALTER TABLE … IF NOT EXISTS` for existing volumes; update `seed.js` |
| AuthZ / role rules | `middleware/auth.js` (`requireAuth`, `requireRole`), plus ownership checks inside services |
| Errors | throw from `utils/ApiError.js`; formatting is in `middleware/errorHandler.js` |
| Config / secrets | `config/env.js` only — nothing else reads `process.env` |

## Domain model

- **users** (id, name, email UNIQUE, password_hash, role) — auth identity only.
- **candidate_profiles** (PK = user_id) — onboarding fields (phone, current_city, employment_status, resume_*, `onboarded`) + detail fields (current_company, current/expected_ctc, notice_period, designation, industry, department) + skills[], experience_years, headline.
- **jobs** (owned by an HR `created_by`) — company, skills[], experience_min/max, salary_min/max, status OPEN/CLOSED.
- **applications** (job_id + candidate_id UNIQUE) — cover_letter (optional), status pipeline SUBMITTED→UNDER_REVIEW→ACCEPTED/REJECTED.

## Conventions & gotchas

- **Auth:** JWT (id + role only) in an **httpOnly SameSite=Lax cookie**. `signToken`/`verifyToken` in `utils/jwt.js`; bcrypt in `utils/password.js`. Auth responses include an `onboarded` flag (HR always true; candidate from their profile) — the client gates on it.
- **RBAC:** candidate routes are candidate-only, HR routes HR-only; on top of that, services enforce **ownership** (an HR user only touches jobs they created — see `assertJobOwnership` in `jobs.service.js`).
- **Skills search** is case-insensitive on both sides: search terms are lowercased in `schemas.js`; stored skills are lowered in SQL via `unnest(...) … lower(skill) = ANY($n)`. Location uses `ILIKE`.
- **Resumes:** multipart via `middleware/upload.js` (multer, pdf/doc/docx, 5 MB, server-generated filenames → `env.uploadDir`, a Docker volume). Download routes stream with `res.download`; candidate can fetch own, HR any candidate.
- **Migrations must stay idempotent** (run on every boot). Same for `seed.js` — use `ON CONFLICT`; never overwrite real user data (see the backfill CASE logic for the test candidate).
- **Email to candidates** is client-side `mailto:` — there is **no SMTP** on the server by design (keeps Docker config-free).

## Tests

`tests/unit/*` (password, jwt, schemas, auth middleware) and `tests/integration/*` (supertest against `createApp()` with `db/pool` **mocked** — no live DB). `tests/setup.js` points `UPLOAD_DIR` at a temp dir. Run `npm test`. Add cases when you add validation rules, routes, or edge cases (401/403/400/404/409).
