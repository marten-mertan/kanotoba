# Kanotoba API

Backend-only repository for **Kanotoba**, a Japanese-learning platform. The frontend is intentionally not included: the future Nuxt 3 application will be developed separately and will consume this API.

## Architecture

```text
kanotoba/
├── backend/
│   ├── src/
│   │   ├── index.js              Worker entry point and API router
│   │   ├── lib/                  Shared HTTP and CORS utilities
│   │   └── routes/               One module per API resource
│   │       ├── health.js
│   │       ├── kanji.js
│   │       ├── grammar.js
│   │       └── quiz.js
│   ├── .dev.vars.example         Local Worker environment template
│   └── wrangler.template.json    Wrangler configuration template
├── database/
│   ├── migrations/               Versioned D1 schema migrations
│   └── seeds/                    Generated SQL import artifacts (not committed)
├── scripts/                      Node.js import, setup and test utilities
├── .github/workflows/            Cloudflare Worker deployment only
├── .env.example                  Local/CI configuration template
└── package.json
```

## Runtime model

- **Cloudflare Workers** runs the API. It is not an Express server and does not require a persistent Node.js process.
- **Cloudflare D1** stores KanjiAlive-derived kanji data and the future grammar/quiz content in one SQLite-compatible database.
- **Node.js 20+** runs local tooling: Wrangler, CSV import, SQL seed generation and API smoke tests.
- **Nuxt 3 frontend is out of scope for this repository** and will be created separately.

## 1. Requirements

- Node.js 20 or newer
- npm
- A Cloudflare account
- Wrangler authentication (`npx wrangler login`) or a Cloudflare API token

Install dependencies:

```bash
npm install
```

Create local environment files:

```bash
cp .env.example .env
cp backend/.dev.vars.example backend/.dev.vars
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item backend/.dev.vars.example backend/.dev.vars
```

Edit `.env` and set your Cloudflare account and D1 values. Keep real credentials in `.env`; it is ignored by Git.

`backend/.dev.vars` contains local Worker runtime variables such as `ALLOWED_ORIGINS`. It is also ignored by Git. Add the Nuxt development origin (normally `http://localhost:3000`) when the frontend is created.

## 2. Create the D1 database

Authenticate with Cloudflare:

```bash
npx wrangler login
```

Create the database:

```bash
npm run db:create
```

Wrangler prints the D1 `database_id`. Copy it into the root `.env`:

```dotenv
KANOTOBA_D1_DATABASE_NAME=kanotoba-db
KANOTOBA_D1_DATABASE_ID=YOUR_D1_DATABASE_ID
```

The database ID is a resource identifier, not an authentication credential. The Cloudflare API token is secret and must never be committed.

## 3. Apply the database schema

Apply migrations to the local development database:

```bash
npm run db:migrate:local
```

The migrations create three groups of tables:

- `kanji_*` — kanji, readings and example compounds.
- `grammar_*` — grammar categories, patterns, examples and relationships.
- `quiz_*` — quiz questions and answer options.

The grammar and quiz tables are created now, but no grammar or quiz content is imported yet.

For production, use `npm run db:migrate:remote` only after checking the target database and reviewing the migration files.

## 4. What is `kanji-seed.sql` and what should I do with it?

`kanji-seed.sql` is **not the database** and it is not a schema migration. It is a generated SQL import file that moves KanjiAlive source data into D1.

The import pipeline is:

```text
KanjiAlive ka_data.csv
        │
        ▼
npm run import:kanji
        │
        ▼
database/seeds/kanji-seed.sql
        │
        ▼
npm run db:seed:local
        │
        ▼
Local D1 tables: kanji, kanji_readings, kanji_examples
```

Generate the SQL file:

```bash
npm run import:kanji
```

The importer downloads the official KanjiAlive `ka_data.csv`, validates the required columns and record count, then writes `database/seeds/kanji-seed.sql`.

Apply it to local D1:

```bash
npm run db:seed:local
```

For convenience, the two commands can be run together:

```bash
npm run db:import:local
```

### Important properties of this seed

- The file is generated; do not edit it by hand.
- It is ignored by Git and should not be committed.
- You can delete it after a successful import; regenerate it with `npm run import:kanji` when needed.
- Applying it clears and repopulates only `kanji`, `kanji_readings` and `kanji_examples`.
- It does not delete grammar or quiz records.
- Review the generated SQL before applying it to a remote database.

To import into production, generate the SQL locally, inspect it, then run:

```bash
npm run db:seed:remote
```

This explicitly modifies the remote D1 database. Do not run it casually: the KanjiAlive-derived tables are replaced by the import.

## 5. Local API development

Start the Worker locally:

```bash
npm run dev
```

By default Wrangler serves the API at `http://127.0.0.1:8787` and uses a local D1 database. Local D1 is separate from production D1.

In another terminal, run the API smoke tests:

```bash
npm run test:api
```

Run the lightweight Node test suite:

```bash
npm test
```

Manual kanji lookup:

```bash
curl "http://127.0.0.1:8787/api/public/kanji/%E6%B3%89"
```

## 6. API endpoints

All public endpoints are prefixed with `/api/public`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/public/health` | API and D1 health check |
| GET | `/api/public/kanji/:character` | One kanji with readings, meaning, radical and examples |
| GET | `/api/public/kanji?grade=6&limit=20&offset=0` | Browse kanji; optional school-grade and text filters |
| GET | `/api/public/grammar` | List grammar patterns; supports `category`, `level`, `limit`, `offset` |
| GET | `/api/public/grammar/:id` | One grammar pattern with examples and related patterns |
| GET | `/api/public/quiz?grammarId=11&limit=10` | Random active questions and options; correct answers are not returned |
| POST | `/api/public/quiz/:id/answer` | Check submitted option IDs |

Example request body for answer checking:

```json
{
  "optionIds": [12]
}
```

The KanjiAlive source CSV has no separate numeric ID. Kanotoba assigns its own integer `id` and preserves the upstream `kname` value as `source_key`.

`grade` in the KanjiAlive dataset is the Japanese school grade (学年), not a JLPT level.

## 7. Backend source layout

The Worker entry point is intentionally small:

- `backend/src/index.js` — request validation, CORS, routing and top-level error handling.
- `backend/src/routes/kanji.js` — kanji list and single-kanji lookup.
- `backend/src/routes/grammar.js` — grammar list and detail endpoints.
- `backend/src/routes/quiz.js` — question selection and answer checking.
- `backend/src/routes/health.js` — health endpoint.
- `backend/src/lib/http.js` — JSON responses and parameter parsing.
- `backend/src/lib/cors.js` — CORS allow-list handling.

When adding another API resource, create a route module under `backend/src/routes/` and register it in `backend/src/index.js`. Keep shared helpers in `backend/src/lib/`.

## 8. Environment variables and secrets

### Root `.env`

| Variable | Purpose | Secret? |
|---|---|---|
| `KANOTOBA_WORKER_NAME` | Worker name; defaults to `kanotoba-api` | No |
| `KANOTOBA_D1_DATABASE_NAME` | D1 database name | No |
| `KANOTOBA_D1_DATABASE_ID` | Cloudflare D1 resource ID | No; still keep local in `.env` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account identifier | No |
| `CLOUDFLARE_API_TOKEN` | Wrangler/CI authentication token | **Yes** |
| `KANOTOBA_KANJI_SOURCE_URL` | CSV source URL for importer | No |
| `KANOTOBA_KANJI_SOURCE_REVISION` | Dataset revision label | No |
| `KANOTOBA_API_BASE_URL` | Base URL used by the API smoke-test script | No |

### Worker `.dev.vars`

| Variable | Purpose |
|---|---|
| `ALLOWED_ORIGINS` | Comma-separated browser origins allowed by CORS |

CORS is not authentication. It restricts which browser origins can read API responses; it does not prevent direct requests from `curl`, Postman or scripts. Public read endpoints are intentionally public. The API currently has no public insert, update or delete endpoints.

When the Nuxt frontend exists, add its exact origin to `ALLOWED_ORIGINS` locally and configure the production Worker variable/secret through Wrangler or the deployment workflow.

## 9. Deploy the Worker to Cloudflare

Set the following GitHub repository **Variables**:

- `CLOUDFLARE_ACCOUNT_ID`
- `KANOTOBA_WORKER_NAME` (normally `kanotoba-api`)
- `KANOTOBA_D1_DATABASE_NAME` (normally `kanotoba-db`)
- `KANOTOBA_D1_DATABASE_ID`
- `KANOTOBA_ALLOWED_ORIGINS` (optional until the Nuxt frontend exists)

Set this GitHub repository **Secret**:

- `CLOUDFLARE_API_TOKEN` — use a token with only the permissions required to deploy the Worker and manage its secrets.

Deploy manually:

```bash
npm run deploy:api
```

Or push changes to `backend/`, `database/migrations/`, `scripts/` or deployment configuration on the `main` branch. The GitHub Actions workflow deploys only the Worker; it does not publish a frontend and does not automatically apply production database migrations or import data.

Apply production migrations and seed explicitly and separately after reviewing them:

```bash
npm run db:migrate:remote
npm run import:kanji
npm run db:seed:remote
```

## 10. KanjiAlive attribution and data license

Kanji language data is adapted from **Kanji alive** by Harumi Hibino Lory and Arno Bosse:

- Source repository: https://github.com/kanjialive/kanji-data-media
- License: Creative Commons Attribution 4.0 International (CC BY 4.0)
- License text: https://creativecommons.org/licenses/by/4.0/

The importer uses `language-data/ka_data.csv` only. It does not import media, mnemonic hints, textbook chapter organization or third-party dictionary indices. Review `THIRD_PARTY_NOTICES.md` and the upstream repository's current license/README before redistributing updated source data.

## Development notes

- Worker compatibility date is `2026-05-03`, matching the runtime date supported by the Wrangler/server binary in the current development environment. Upgrade deliberately after verifying support for a newer date.
- Keep schema changes in new numbered SQL migrations. Do not edit migrations that have already been applied to a shared database.
- The grammar and quiz schema is ready, but no grammar or quiz records are seeded yet.
- User progress is not stored in D1 yet. It can begin in browser storage in the future Nuxt application; cross-device sync will require user authentication and a separate design.
