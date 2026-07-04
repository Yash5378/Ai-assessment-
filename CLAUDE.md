# Recruitment Portal — project guide

Full-stack recruitment app. **HR/recruiters** post jobs, review applicants and search candidates; **candidates** onboard, build a profile, search/apply to jobs and track status.

## Where things live

- **`server/`** — Node.js/Express REST API + PostgreSQL. See **`server/CLAUDE.md`** before changing anything here.
- **`client/`** — React (Vite) single-page app served by nginx. See **`client/CLAUDE.md`** before changing anything here.
- **`docker-compose.yml`** — orchestrates `db` (Postgres, internal only), `server` (API, :5000), `client` (nginx, :3000, proxies `/api` → server). Two named volumes: `db_data`, `uploads_data`.

## Run & test

```bash
docker compose up --build          # whole stack → UI at http://localhost:3000
cd server && npm test              # Jest + supertest (db mocked)
cd client && npm test              # Vitest
```

Rebuild one service after a code change: `docker compose up --build -d server` (or `client`). The API reseeds on every startup (idempotent).

## Test accounts (seeded)

| Role | Email | Password |
|------|-------|----------|
| HR | `admin@test.com` | `Admin@1234` |
| Candidate | `user@test.com` | `User@1234` |

## Conventions that span both sides

- **Roles:** `HR` and `CANDIDATE` only. Enforced by a zod enum on the server — never trust a role from the client.
- **Validation lives in two mirrored places:** `server/src/validation/schemas.js` is the source of truth; `client/src/utils/validation.js` mirrors it for instant UX. Change both together.
- **Money is `₹ LPA` integers** (salary/CTC); experience is integer years.
- **Skills** are lowercased arrays everywhere; search matches case-insensitively.
- **Commits:** conventional style (`feat(server):`, `feat(client):`, `fix:`, `style:`, `test:`, `docs:`), one logical change each. Run the relevant tests before committing.
- After a nontrivial change, **rebuild the affected container and verify** (curl the API / click the UI) — don't rely on tests alone.
