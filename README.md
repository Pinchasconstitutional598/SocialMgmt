# Social Management

Monorepo aplikacji do zarządzania obecnością klientów w social media: integracja z Meta (Facebook / Instagram), kampanie Marketing API, moderacja treści i komentarzy oraz globalny filtr spamu.

## Stack technologiczny

| Warstwa | Technologie |
|--------|-------------|
| **Frontend** | React 19, Vite, TypeScript, Material UI (MUI), React Router, React Hook Form, Zod, MUI X Data Grid |
| **Backend** | Node.js, Express 5, TypeScript, Prisma ORM |
| **Baza danych** | MySQL 8 |
| **Infra (lokalnie)** | Docker Compose (kontener MySQL) |
| **Auth / integracje** | JWT (panel), OAuth Meta, Facebook Graph API, Marketing API |
| **Testy** | Vitest (frontend), Jest + @swc/jest (backend), MSW 1.x (mock HTTP Graph API) |

Struktura katalogów:

- `client/` — aplikacja SPA (Vite)
- `server/` — API REST + Prisma (`prisma/schema.prisma`)

Projekt używa **npm workspaces**: instalacja z katalogu głównego (`npm install`) tworzy **jeden** `package-lock.json` i umieszcza prawie wszystkie pakiety w **`node_modules` w korzeniu repozytorium**. W podfolderach `client/` lub `server/` mogą dodatkowo pojawić się niewielkie katalogi `node_modules` (np. linki binarek lub pakiety z inną wersją) — to typowe zachowanie npm i nie wymaga osobnego `npm install` w tych folderach.

## Wymagania

- **Node.js** 20+ (zalecane LTS)
- **npm** 9+ (workspaces)
- **Docker Desktop** (opcjonalnie, do uruchomienia MySQL w kontenerze)

## Pierwsza instalacja

1. Sklonuj repozytorium i przejdź do katalogu projektu.

2. Zainstaluj zależności **z katalogu głównego** (utworzy się jeden `package-lock.json` i `node_modules`):

   ```bash
   npm install
   ```

3. Uruchom bazę MySQL (np. Docker):

   ```bash
   docker compose up -d
   ```

4. Skonfiguruj **`server/.env`** (wzoruj się na istniejących zmiennych): `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`, dane aplikacji Meta (`FACEBOOK_*`) jeśli używasz OAuth.

5. Wygeneruj klienta Prisma i zastosuj migracje:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

   (Odpowiednik: `cd server && npx prisma generate && npx prisma migrate dev`.)

## Uruchomienie (development)

Z **katalogu głównego** — frontend i backend równolegle:

```bash
npm run dev
```

Osobno:

```bash
npm run dev:client   # Vite — zwykle http://localhost:5173
npm run dev:server   # API — zwykle http://localhost:3001
```

Frontend proxy przekierowuje `/api` na backend (patrz `client/vite.config.ts`).

## Build produkcyjny

```bash
npm run build
```

- `client/dist/` — statyczny frontend  
- `server/dist/` — skompilowany backend (`npm run start -w server` po buildzie)

## Testy

Z katalogu głównego (najpierw `npm install`):

```bash
npm test
```

- **Client** (`client/`): **Vitest** — `npm run test -w client` (pliki `src/**/*.test.ts`).
- **Server** (`server/`): **Jest** — `npm run test -w server`; mocki odpowiedzi Facebook Graph API przez **MSW** (`server/src/services/metaGraph.test.ts`).

Testy `MetaGraphService` nie wykonują prawdziwych żądań HTTP — serwer MSW przechwytuje `fetch` w Node.

**Testy integracyjne API** ([Supertest](https://github.com/ladjs/supertest)): `server/src/integration/clients.integration.test.ts` — wymagają działającego MySQL (`DATABASE_URL` w `server/.env`). Sprawdzają m.in. `POST /api/clients` (zapis w bazie), walidację 400 oraz izolację `SocialAccount` między klientami. Uruchomienie samych testów integracyjnych:

```bash
npm run test:integration -w server
```

## Przydatne skrypty (workspace `server`)

| Skrypt (z root) | Opis |
|-----------------|------|
| `npm run db:generate -w server` | `prisma generate` |
| `npm run db:migrate -w server` | `prisma migrate dev` |
| `npm run db:push -w server` | `prisma db push` |

## Uwagi

- Sekrety trzymaj wyłącznie w `server/.env`; nie commituj plików `.env`.
- Po zmianach w `server/prisma/schema.prisma` uruchom migrację lub `db:push` oraz ponownie `db:generate`.
