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

Access is enforced by the backend, per ward. A system `admin` can do
everything. A `ward_admin` manages one ward. A district leader or assistant —
an account a ward admin has linked to that member — sees only their own
district and can update its members' contact details. An account that is
merely attached to a ward (`user`) sees nothing. One account can hold
different roles in different wards.

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

## Production deployment

`docker compose up` runs dev servers with live reload and is for local
development only. Production runs on a DigitalOcean droplet from images built on your machine
(the droplet never builds), behind a shared HTTPS proxy that also serves other
apps on other subdomains.

```
                         droplet
 https://dd.lazys.net    ┌──────────────────────────────────────────────────┐
 https://x.lazys.net ──► │ /opt/edge   caddy (:80, :443, Cloudflare origin) │
                         │               │ "edge" docker network            │
                         │     ┌─────────┴──────────┐                       │
                         │ /opt/dd: dd-web        other apps' containers    │
                         │   (frontend + /api) ─► backend ─► db             │
                         └──────────────────────────────────────────────────┘
```

| Piece | Where | What it is |
|---|---|---|
| Edge proxy | separate project, `~/projects/edge-proxy` → `/opt/edge` | One Caddy for the whole droplet. Owns ports 80/443, terminates HTTPS, routes by hostname. Its `sites/dd.caddy` sends `dd.lazys.net` to `dd-web`. |
| `web` (`dd-web`) | `docker-compose.prod.yml` → `/opt/dd` | Caddy serving the built frontend over plain HTTP and forwarding `/api` to the backend (`frontend/Dockerfile.prod`, `deploy/Caddyfile`). |
| `backend` (`dd-backend`) | same | The packaged Quarkus app on a JRE (`backend/Dockerfile.prod`). |
| `db` | same | PostgreSQL 17, reachable only inside the stack. |

`deploy/deploy.sh` builds the images on your machine and ships them. The
droplet holds only `docker-compose.yml` (a copy of `docker-compose.prod.yml`)
and `.env` in `/opt/dd`.

### One-time setup

1. **Droplet.** Create an Ubuntu droplet with Docker (the "Docker" marketplace
   image is simplest); 2 GB of memory is a comfortable minimum for Java +
   PostgreSQL. Add your SSH key. Allow only ports 22, 80 and 443 (a
   DigitalOcean cloud firewall; Docker's published ports bypass `ufw`).
2. **DNS and certificate.** In Cloudflare, add an A record for `dd` pointing
   at the droplet's IP with **Proxied** (orange cloud) on; SSL/TLS mode is
   "Full (strict)" for the whole lazys.net zone. The edge proxy serves it
   with its shared `*.lazys.net` Cloudflare Origin certificate in
   `/opt/edge/certs/`; see "Certificates" in `~/projects/edge-proxy/README.md`.
3. **The droplet's `.env`.** It holds the production settings and secrets and
   stays on the droplet; deploys never overwrite it.

   ```bash
   ssh root@<droplet-ip> mkdir -p /opt/dd
   scp .env.example root@<droplet-ip>:/opt/dd/.env
   ssh root@<droplet-ip> 'chmod 600 /opt/dd/.env && nano /opt/dd/.env'
   ```

   Set a long random `DATABASE_PASSWORD`, and `VITE_GOOGLE_CLIENT_ID` if
   Google sign-in is wanted (add `https://dd.lazys.net` to the OAuth client's
   **Authorized JavaScript origins** in Google Cloud Console). Leave out
   `BACKEND_IMAGE` and `WEB_IMAGE`; the deploy script sets them.
4. **Deploy settings.** Add them to this repo's local `.env` on your machine
   (the same gitignored file the development stack reads):

   ```bash
   DEPLOY_HOST=root@<droplet-ip>
   # DEPLOY_DIR=/opt/dd                                   # if not the default
   # IMAGE_REGISTRY=registry.digitalocean.com/<registry>  # see below
   VITE_GOOGLE_CLIENT_ID=...   # built into the frontend; same as the droplet's
   ```

### Deploying (first time and every update)

From this repository:

```bash
deploy/deploy.sh
```

A value given on the command line wins over `.env`, for example
`DEPLOY_HOST=root@<other-ip> deploy/deploy.sh`. It:

1. asks for the SSH passphrase once and reuses the connection, and stops if
   the droplet has no `/opt/dd/.env` yet
2. builds `linux/amd64` images `dd-backend:<commit>` and `dd-web:<commit>`
   (uncommitted changes get a `-dirty-<time>` tag)
3. pushes them to `IMAGE_REGISTRY`, or without one copies them over SSH
   (`docker save | docker load`)
4. creates the `edge` network if it is missing, copies the compose file to
   `/opt/dd`, records the images in the droplet's `.env`, runs
   `docker compose up -d`, and removes older `dd-*` images

Database migrations run when the backend starts. To roll back, redeploy an
older commit: `git checkout <commit> && deploy/deploy.sh && git checkout main`.

The site is reachable once the edge proxy is deployed too (`./deploy.sh` in
`~/projects/edge-proxy`); it routes `dd.lazys.net` to this app. Deploy it in
either order.

#### Using a registry instead

Copying over SSH sends both whole images (a few hundred MB) on every deploy. A
registry sends only the layers that changed. The images are layered for that:
the backend's dependency jars (~60 MB) are a layer of their own that is
byte-identical between builds until `pom.xml` changes, so a code change ships
about 1.5 MB for the backend and about 1 MB for the frontend. With
DigitalOcean Container Registry:

```bash
doctl registry create <registry-name>              # once
doctl registry login                               # on your machine
ssh root@<droplet-ip> "doctl registry login || docker login registry.digitalocean.com"   # on the droplet, once
```

Then add the registry to your local `.env` and deploy as usual:

```bash
IMAGE_REGISTRY=registry.digitalocean.com/<registry-name>
```

The images go to `<registry>/dd-backend` and `<registry>/dd-web`. Pushing
needs a token with registry read and update scopes (the script runs
`doctl registry login` itself when `doctl` is installed); the droplet only
pulls, so its token needs read access. On the droplet, `docker login
registry.digitalocean.com` takes an API token as both username and password.
Any registry works the same way, such as `ghcr.io/<user>`.

#### Moving from `.env.production` (once)

Earlier deploys read everything from a local `.env.production` and copied it
over the droplet's `/opt/dd/.env` each time. That droplet file already has the
production settings and is now kept as it is, so nothing changes there. Move
`DEPLOY_HOST` (and `DEPLOY_DIR` if set) into your local `.env`, then
`.env.production` is no longer used and can be deleted.

After the **first** deployment, open `https://dd.lazys.net` straight away and
create the system admin account on the setup page — on an empty database the
first visitor gets to do this.

### Other apps on the droplet

Other subdomains are routed by the edge proxy project; see its README for
adding a site.

### On the droplet

```bash
cd /opt/dd
docker compose ps
docker compose logs -f backend
curl -s http://127.0.0.1:8081/api/auth/setup    # the app, bypassing the edge proxy
```

### The token signing key

Login tokens are signed with an RSA key pair that is **not** in the
repository or the image. The backend generates it on first start
(`backend/docker/entrypoint.sh`) and keeps it on the `jwt-keys` volume, so
sessions survive restarts and upgrades. To rotate it and sign everyone out:

```bash
cd /opt/dd
docker compose stop backend
docker compose run --rm --entrypoint sh backend -c 'rm -f /keys/*.pem'
docker compose up -d backend
```

### Backups

All data is in the `db-data` volume. Take a dump regularly and copy it off the
droplet:

```bash
ssh root@<droplet> 'cd /opt/dd && docker compose exec -T db sh -c "pg_dump -U \$POSTGRES_USER \$POSTGRES_DB"' \
  > backup-$(date +%F).sql
```

DigitalOcean droplet backups are a useful extra layer, but a `pg_dump` is the
one to rely on for restoring the database.
