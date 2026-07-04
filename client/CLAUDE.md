# Frontend guide (`client/`)

React 18 + React Router 6, built with Vite, served by nginx in Docker. Plain CSS design system (no UI library). All source under `src/`.

## App shape

- **`main.jsx`** — mounts `<BrowserRouter><AuthProvider><App/>`.
- **`App.jsx`** — all routes + route guards live here. Guards: `GuestRoute` (login/register only), `OnboardingRoute` (auth'd candidate, pre-onboarding), `ProtectedRoute` (auth + role, and redirects un-onboarded candidates to `/onboarding`). `RoleRedirect` sends each user to their home.
- **`context/AuthContext.jsx`** — the single source of the current user. `login`/`register`/`logout`/`refreshUser`; user carries `role` and `onboarded`. Session is restored from the httpOnly cookie via `GET /auth/me` on load.
- **`api/client.js`** — the only place that calls the backend. `api.get/post/patch/put(path, body)` (JSON) and `api.upload(path, formData)` (multipart, e.g. resume). All requests send cookies; errors are normalized to `Error` with `.status` and `.details`.

## Pages (by role)

- `pages/Login.jsx`, `pages/Register.jsx` — role tabs (`components/RoleTabs.jsx`); login warns if the account role ≠ selected tab.
- `pages/candidate/` — `Onboarding` (phone/city/status + **required** resume, gates the app), `Jobs` (search + filters), `JobDetail` (apply; cover letter optional), `MyApplications`, `Profile` (sections: Basics / Current role / Expectations / Resume).
- `pages/hr/` — `Dashboard` (stats), `ManageJobs` (create/edit/close via `components/JobForm.jsx`), `JobApplicants` (review + status + resume), `FindCandidates` (search, Contact modal, multi-select + bulk email).

## Where to make common changes

| Task | Files to touch |
|------|----------------|
| New page | `pages/…`, add a `<Route>` in `App.jsx` (wrap in the right guard), add a nav link in `components/Navbar.jsx` |
| New form field | the page/form component + `utils/validation.js` (mirror the server rule) |
| Call a new/changed API | `api/client.js` if a new verb/helper is needed; otherwise call `api.*` from the page |
| Formatting (salary, experience, dates, enums) | `utils/format.js` |
| Styling / colors / responsive | `styles.css` (single file; CSS variables at `:root`; keyed to existing class names) |
| Reusable UI | `components/` (Alert, FormField, StatusBadge, SkillChips, EmptyState, ContactModal, RoleTabs) |

## Conventions

- **Validation mirrors the backend** (`utils/validation.js` ↔ `server/src/validation/schemas.js`). Client validation is UX-only; the server is authoritative. Keep them in sync.
- **Auth/role gating is done via route guards in `App.jsx`**, not per-page. Candidate pages assume `role === 'CANDIDATE'` and onboarded.
- **Never store the token** — auth rides in the httpOnly cookie; the UI only knows the user object from `AuthContext`.
- **Money is `₹ LPA`**, experience is years; skills are comma-separated in inputs, parsed with `parseSkills`.
- **Styling:** add to `styles.css` using the existing tokens/classes; the whole theme is variable-driven and responsive (grids collapse, navbar reflows). No inline style objects except tiny one-offs.
- **Emailing candidates** uses `mailto:` links (opens the recruiter's mail client) — there is no backend email service.

## Tests & build

- Vitest under **jsdom** with Testing Library (`globals: true` + `src/test/setup.js` for jest-dom): `utils/validation.test.js` (validators), `components/components.test.jsx` (StatusBadge, RoleTabs, FormField, SkillChips), `pages/Login.test.jsx` (form validation + wrong-role-tab warning with a fetch stub). Extend these when adding rules/components. Run `npm test`.
- `npm run lint`, `npm run format:check` and `npm run build` must pass before committing UI changes (CI enforces all three).
- Shared query-string building lives in `utils/query.js` (`buildQuery`) — reuse it for new filter UIs.
