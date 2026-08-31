# Disaster Districts

Disaster Districts is a ward/district membership management application. It
organizes members into geographic districts within a ward, supports member
import via CSV or PDF, displays member locations on a map, and manages
district assignment (including a leader and assistant per district).

## Stack

| Layer     | Technology                                                                 |
|-----------|-----------------------------------------------------------------------------|
| Backend   | Quarkus 3.x (Kotlin), Hibernate ORM with Panache, Flyway migrations, JAX-RS |
| Frontend  | React 19 + TypeScript, Vite, TanStack Router/Query, React Hook Form + Zod, shadcn/ui (Radix + Tailwind CSS v4) |
| Database  | PostgreSQL                                                                  |
| Auth      | JWT (SmallRye JWT), BCrypt password hashing                                |
| Proxy     | Nginx (routes `/api/*` to the backend, `/` to the frontend)                |
| Testing   | JUnit 5 + RestAssured + Testcontainers (backend), Playwright (e2e), Biome (frontend lint) |

## Architecture

```
wards → districts → members
users → wards (each user belongs to a ward)
districts → leader (member), assistant (member)
```

- **`backend/src/main/kotlin/dd/resource/`** — JAX-RS REST endpoints and request/response DTOs.
- **`backend/src/main/kotlin/dd/dao/`** — Hibernate ORM/Panache entities.
- **`backend/src/main/kotlin/dd/repository/`** — `PanacheRepository` beans used by the resources.
- **`frontend/src/routes/`** — file-based TanStack Router routes; `_protected/` requires a logged-in user (checked against `localStorage`).
- **`frontend/src/components/`** — UI, organized by domain (`members/`, `districts/`, `ward/`, `admin/`, `auth/`) plus shared primitives in `ui/`.
- **`frontend/src/hooks/`** — TanStack Query hooks that call the backend API.

Roles are `admin` (system-wide), `ward_admin`, `district_admin`, and `user`.
Authorization is currently enforced at the UI level only — the backend does
not yet restrict endpoints by role.

## Prerequisites

- Docker and Docker Compose (recommended path — runs the whole stack)
- For local (non-Docker) backend development: JDK 25 and Docker (used by
  Testcontainers/Quarkus Dev Services for the database)
- For local (non-Docker) frontend development: Node.js 22+ and Yarn

## Configuration

Create a `.env` file in the repository root:

```
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=dd
DATABASE_HOST=db

UID=1000
GID=1000

VITE_GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
```

## Running the full stack

```bash
docker compose up
```

This starts Postgres, the Quarkus backend (in dev/live-reload mode), the
Vite dev server, and an Nginx reverse proxy in front of both.

- Frontend (direct): http://localhost:5173
- Backend (direct): http://localhost:9090
- Nginx proxy (`/api/*` → backend, `/` → frontend): http://localhost:8080

Database migrations (Flyway, under
`backend/src/main/resources/db/migration/`) run automatically on backend
startup and seed a sample ward, districts, members, and users.

## Local development without Docker Compose

### Backend

```bash
cd backend
./mvnw quarkus:dev
```

Runs on http://localhost:8080 with live reload. The Quarkus Dev UI is
available at http://localhost:8080/q/dev/. Dev mode still needs a Postgres
instance — either the one from `docker compose up db`, or let Quarkus Dev
Services spin up a disposable Testcontainers Postgres automatically when no
`DATABASE_*` env vars are set.

### Frontend

```bash
cd frontend
yarn install
yarn dev
```

Runs on http://localhost:5173. It expects the backend to be reachable (the
Vite dev server is typically fronted by the Nginx proxy at :8080 when
running the full stack; talking to the backend directly at :9090 requires
adjusting API calls or using the proxy).

## Testing

### Backend

```bash
cd backend
./mvnw test      # unit/component tests (JUnit 5 + RestAssured), spins up a throwaway Postgres via Testcontainers
./mvnw verify    # includes integration tests
```

Every `./mvnw test` run also produces a JaCoCo coverage report (via the
`quarkus-jacoco` extension, required because Quarkus REST does build-time
bytecode transformation on `@Path` resource classes that a plain JaCoCo
agent can't match up) at:

```
backend/target/jacoco-report/index.html
```

### Frontend

```bash
cd frontend
yarn lint        # Biome — formatting + lint, zero warnings tolerated
yarn build       # tsc type-check + production Vite build
yarn test:e2e    # Playwright end-to-end tests
```

Playwright's tests hit `http://localhost:8080` by default (override with
`PLAYWRIGHT_BASE_URL`), so the full stack (`docker compose up`, or an
equivalent backend + frontend + Nginx setup) must already be running.
Playwright tests run against a persistent, shared database rather than a
fresh one per test, so they run single-worker/non-parallel and clean up
after themselves (see `frontend/e2e/`).

## Building for deployment

The `docker-compose.yml` in this repo runs both the backend and frontend in
**dev mode** (`quarkus:dev` and `vite dev`, with source bind-mounted for live
reload) and Nginx proxies straight to those dev servers — it is meant for
local development, not production.

To produce production artifacts using the tooling already in this repo:

- **Backend**: `./mvnw package` builds a runnable JAR at
  `backend/target/quarkus-app/quarkus-run.jar` (run with
  `java -jar target/quarkus-app/quarkus-run.jar`). A container image can be
  built directly via the bundled `quarkus-container-image-docker` extension:
  `./mvnw package -Dquarkus.container-image.build=true`. A native executable
  is also available via `./mvnw package -Dnative` (see `backend/README.md`
  for details and container-build options if GraalVM isn't installed
  locally).
- **Frontend**: `yarn build` produces static assets in `frontend/dist/`,
  meant to be served directly (e.g. by Nginx) rather than through the Vite
  dev server.

Turning this into an actual production deployment would additionally
require: an Nginx config that serves `frontend/dist/` as static files
instead of proxying to the Vite dev server, externally supplied
`DATABASE_*` credentials pointing at a real Postgres instance, and a
production JWT keystore (the bundled `jwt-keystore.p12` is an in-memory dev
key and is not suitable for production, per Quarkus's own startup warning).
