# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**Disaster Districts** is a ward/district membership management application used to organize members into geographic districts. It supports member import (CSV/PDF), map display of member locations, and district assignment.

Stack: Quarkus (Kotlin) backend + React (TypeScript) frontend + PostgreSQL, all run via Docker Compose.

---

## Commands

### Full Stack (recommended)

```bash
# Requires a .env file with: DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME, DATABASE_HOST
docker compose up
```

- Frontend: http://localhost:5173 (Vite dev server)
- Backend: http://localhost:9090 (Quarkus)
- Nginx proxy (routes `/api/*` → backend, `/` → frontend): http://localhost:8080

### Backend (Quarkus / Kotlin)

```bash
cd backend
./mvnw quarkus:dev          # dev mode with live reload at :8080
./mvnw package              # build JAR → target/quarkus-app/quarkus-run.jar
./mvnw test                 # run unit tests
./mvnw verify               # run integration tests
```

Quarkus Dev UI available at http://localhost:8080/q/dev/ in dev mode.

### Frontend (React / Vite)

```bash
cd frontend
yarn dev           # dev server at :5173
yarn build         # tsc + vite build → dist/
yarn lint          # biome with zero warnings tolerance
```

---

## Architecture

### Backend

The backend uses **Quarkus 3.x with Kotlin** and follows a three-layer structure:

- **`dd/resource/`** — JAX-RS REST endpoints (`@Path`). Also contains plain `data class` DTOs (e.g., `Member.kt`, `User.kt`, `District.kt`, `Ward.kt`) used for request/response deserialization.
- **`dd/dao/`** — Hibernate ORM/Panache entities (`PanacheEntityBase`) mapped to DB tables. Uses `CamelCaseToUnderscoresNamingStrategy`, so Kotlin field `familyName` → column `family_name`.
- **`dd/repository/`** — `PanacheRepository<T>` beans injected into resources for DB queries.

**Auth:** JWT via SmallRye JWT. `POST /auth/login` validates BCrypt password, returns a signed JWT (7-day expiry). The keystore is at `src/main/resources/jwt-keystore.p12`.

**Database migrations:** Flyway, runs automatically at startup (`quarkus.flyway.migrate-at-start=true`). Migration scripts live in `src/main/resources/db/migration/` (e.g., `V01__init.sql`).

**Config:** All DB credentials and host are injected via environment variables (`DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`, `DATABASE_HOST`).

### Frontend

The frontend is **React 19 + TypeScript + Vite** with:

- **Routing:** TanStack Router with file-based routing (`src/routes/`). Routes under `src/routes/_protected/` require authentication — the `_protected/route.tsx` layout checks `localStorage` for a `user` object and redirects to `/login` if absent. `routeTree.gen.ts` is auto-generated; do not edit it manually.
- **State/data fetching:** TanStack Query (`@tanstack/react-query`) for server state.
- **Forms:** React Hook Form + Zod validation.
- **UI:** shadcn/ui components (Radix UI primitives + Tailwind CSS v4). Generic UI primitives are in `src/components/ui/`. Custom styled wrappers are in `src/components/styled/`.
- **Maps:** Both Leaflet (`react-leaflet`) and Google Maps (`@vis.gl/react-google-maps`) are available. Map components live in `src/components/OSMMap*.tsx`.
- **Types:** Shared TypeScript types for domain objects live in `src/type/`.

**Auth flow:** On login, the JWT and user info are stored in `localStorage` under the key `user`. The `_protected` route layout reads this on every navigation.

### Data Model

```
wards → districts → members
users → wards (each user belongs to a ward)
districts → leader (member), assistant (member)
```

Members have lat/lng for map display, and can be imported via CSV or PDF upload.

### Nginx Proxy

In production/Docker mode, Nginx (`:8080`) routes:
- `/api/*` → Quarkus backend (`:8080` internally)
- `/*` → Vite frontend (`:5173`)
