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
| **Testy** | Vitest (frontend), Jest + @swc/jest (backend), MSW 1.x (mock HTTP Graph API), Playwright (E2E) |

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

4. Skonfiguruj **`server/.env`** (wzoruj się na istniejących zmiennych): `DATABASE_URL`, `JWT_SECRET`, opcjonalnie `TOKEN_ENCRYPTION_KEY` (szyfrowanie tokenów Meta w DB — patrz [Bezpieczeństwo](#bezpieczeństwo)), `CLIENT_URL`, dane aplikacji Meta (`FACEBOOK_*`) jeśli używasz OAuth.

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

Wszystkie komendy uruchamiaj z **katalogu głównego** repozytorium (po `npm install`).

### Testy jednostkowe / integracyjne (backend + frontend)

Pełny cykl (najpierw backend Jest, potem client Vitest):

```bash
npm test
```

| Zakres | Komenda | Opis |
|--------|---------|------|
| **Backend (Jest)** | `npm run test -w server` | `server/src/**/*.test.ts` — m.in. `metaGraph` z mockami **MSW** (brak prawdziwych wywołań HTTP do Meta). |
| **Frontend (Vitest)** | `npm run test -w client` | Pliki `*.test.ts` / `*.test.tsx` w `client/`. |

**Testy integracyjne API** ([Supertest](https://github.com/ladjs/supertest)): `server/src/integration/clients.integration.test.ts` — wymagają działającego MySQL (`DATABASE_URL` w `server/.env`). Sprawdzają m.in. `POST /api/clients`, walidację 401/400 oraz izolację `SocialAccount` między klientami.

```bash
npm run test:integration -w server
```

### Testy E2E (Playwright)

Scenariusze w `e2e/tests/` (logowanie do panelu, zakładka Klienci, DataGrid, drawer komentarzy Meta, widoczność przycisku „Usuń” dla admina vs marketing). Przed pierwszym uruchomieniem zainstaluj przeglądarki Playwright:

```bash
npx playwright install chromium
```

Uruchomienie E2E (buduje backend `dist/`, potem startuje API + Vite i odpala testy):

```bash
npm run test:e2e
```

Tryb interfejsu Playwright (debugowanie krok po kroku):

```bash
npm run test:e2e:ui
```

**Wymagania E2E:** `DATABASE_URL` w `server/.env`, działający MySQL; seed użytkowników i firmy testowej uruchamia się w `globalSetup` (`scripts/e2e-seed.ts`). Domyślne hasła/emaile są w skrypcie seedu lub nadpisywalne zmiennymi `E2E_*` (patrz `server/scripts/e2e-seed.ts`).

**Uwagi techniczne:**

- API w E2E jest uruchamiane jako **`npm run start -w server`** (skompilowany `node dist`), nie `tsx watch` — inaczej parsowanie JSON (body-parser / iconv) może się nie powieść przy logowaniu.
- `GET /api/health` jest publiczny (gotowość); Playwright czeka na ten endpoint przy starcie serwera.
- Jeśli porty **3001** lub **5173** są zajęte przez stare procesy `dev`, zatrzymaj je albo pozwól Playwright na `reuseExistingServer` (domyślnie w dev), aby nie kolidować ze startem.

## Przydatne skrypty (workspace `server`)

| Skrypt (z root) | Opis |
|-----------------|------|
| `npm run db:generate -w server` | `prisma generate` |
| `npm run db:migrate -w server` | `prisma migrate dev` |
| `npm run db:push -w server` | `prisma db push` |

## Bezpieczeństwo

### Zmienne środowiskowe i sekrety

- **`server/.env`** nie powinien trafiać do repozytorium (jest w `.gitignore`). W produkcji ustaw m.in. `DATABASE_URL`, **`JWT_SECRET`** (min. długi, losowy), **`TOKEN_ENCRYPTION_KEY`** (preferowane 64 znaki hex = 32 bajty klucza AES) oraz dane Meta (`FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_REDIRECT_URI` itd.).
- **`TOKEN_ENCRYPTION_KEY`**: szyfrowanie tokenów Meta (`access_token` / `refresh_token` w tabeli `social_accounts`) algorytmem **AES-256-GCM** przed zapisem w MySQL. Wartość w DB ma prefiks `smenc:v1:`; stare wpisy w plaintext nadal są obsługiwane przy odczycie.
- Jeśli `TOKEN_ENCRYPTION_KEY` nie jest ustawiony, klucz szyfrowania jest **pochodzony z `JWT_SECRET`** (wygodniejsze na dev, w produkcji lepiej osobny klucz).
- Frontend nie powinien zawierać sekretów aplikacji Meta ani kluczy API — konfiguracja zostaje po stronie serwera lub zmiennych buildu (`VITE_*` tylko tam, gdzie celowo wystawiasz nie-sekretowe identyfikatory).

### Autoryzacja API

- Większość tras pod `/api/clients` i `/api/clients/:id/meta` wymaga nagłówka **`Authorization: Bearer <JWT>`** (panel: role ADMINISTRATOR lub MARKETING).
- **`/api/admin/*`** — wyłącznie rola **ADMINISTRATOR**.
- **`GET /api/health`** — publiczny (np. healthcheck / orchestracja).
- **`GET /api/db-check`** — **JWT + rola ADMINISTRATOR** (diagnostyka bazy; nie udostępniaj publicznie).
- **OAuth Meta** (`/api/auth/*`, w tym redirect callback) — publiczne tylko tam, gdzie wymaga tego przepływ przeglądarki; logowanie do panelu (`POST /api/auth/login` itd.) nie wymaga wcześniejszego JWT.

### Sesja w przeglądarce

- Token panelu jest przechowywany w **localStorage** (`sm_token`). Utrzymuj aktualne zależności i unikaj XSS (np. nie wstrzykuj nieufnego HTML do DOM).

## Uwagi

- Sekrety trzymaj wyłącznie w `server/.env`; nie commituj plików `.env`.
- Po zmianach w `server/prisma/schema.prisma` uruchom migrację lub `db:push` oraz ponownie `db:generate`.
