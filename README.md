# Kanotoba API

Backend-only repository for **Kanotoba**, a Japanese-learning platform. The future Nuxt 3 frontend is a separate project and consumes this API.

## Architecture

```text
kanotoba/
├── backend/                      Cloudflare Worker API
│   └── src/
│       ├── index.js               Router and request boundary
│       ├── lib/                   HTTP and CORS helpers
│       └── routes/                health, kanji, grammar, quiz
├── database/
│   ├── migrations/                Versioned D1 migrations (never edit applied files)
│   ├── content/                    Reviewed, versioned content source JSON
│   └── seeds/                      Generated SQL imports (ignored by Git)
├── scripts/                       Node.js import and Wrangler helpers
├── tests/                         Worker and content tests
└── .github/workflows/              Validates, migrates D1, then deploys Worker
```

- **Cloudflare Workers** runs the API.
- **Cloudflare D1** stores KanjiAlive data, grammar, quizzes, provenance, future learning paths, accounts and subscription metadata.
- **Node.js 20+** runs local tooling and data import scripts.
- Frontend, authentication, payments and user-facing premium gating are not implemented yet.

## 1. Install and configure

```bash
npm install
```

Create local environment files:

```bash
cp .env.example .env
cp backend/.dev.vars.example backend/.dev.vars
```

On PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item backend/.dev.vars.example backend/.dev.vars
```

Set your Cloudflare account and D1 values in `.env`. Keep real tokens out of Git. `CLOUDFLARE_API_TOKEN` is a secret; D1 IDs and account IDs are identifiers, not credentials.

## 2. Database migrations

Apply all migrations locally:

```bash
npm run db:migrate:local
```

Apply them to production manually:

```bash
npm run db:migrate:remote
```

The GitHub Actions deployment workflow also applies pending remote migrations **before deploying updated Worker code**. The Cloudflare API token used by Actions therefore needs the required D1 migration permissions in addition to Worker deployment permissions.

Never edit a migration that has already been applied to a shared database. Add a new numbered migration instead.

### Database domains

The single D1 database is separated into logical groups:

- `kanji`, `kanji_readings`, `kanji_examples` — KanjiAlive-derived kanji records.
- `grammar_categories`, `grammar_patterns`, `grammar_senses`, `grammar_connections`, `grammar_examples`, `grammar_relations` — grammar catalogue.
- `quiz_questions`, `quiz_options` — practice questions and answer keys.
- `content_sources`, `content_provenance` — source, version, license and attribution tracking.
- `learning_paths`, `learning_path_items` — future curated courses.
- `users`, `subscriptions`, `subscription_plans`, `plan_features`, `billing_events`, `user_feature_overrides` — future account and subscription foundation.
- `user_grammar_progress`, `user_kanji_progress`, `user_quiz_attempts`, `user_review_events` — future cloud progress and spaced repetition.

The account and billing tables are schema foundations only. There is no authentication, checkout, payment-card storage, subscription webhook or premium authorization flow yet. Passwords must never be stored in this database; a future external identity provider should own authentication.

## 3. KanjiAlive data import

`kanji-seed.sql` is a generated SQL import file, not the database and not a schema migration.

```bash
npm run import:kanji
npm run db:seed:local
```

Or in one step:

```bash
npm run db:import:local
```

For production, inspect the generated SQL, then run `npm run db:seed:remote`. It only refreshes the KanjiAlive-derived tables. The seed SQL is generated locally and ignored by Git.

## 4. Grammar content: 47 daily-use patterns

The initial curated content pack is:

```text
database/content/grammar-daily-core-v1.json
```

It contains:

- **47** selected everyday patterns.
- **11** learning categories.
- Russian and English meanings and explanations.
- Casual / polite formation guidance (including caveats where the forms are not exact equivalents).
- **94** original Japanese example sentences with English and Russian translations.
- **47** original four-option quiz questions with one keyed answer each.
- Related-pattern links for commonly confused constructions.
- Source/provenance records for each pattern and authored content item.

The examples, explanations, translations and quiz items in this pack were written for Kanotoba. All records are imported as `draft` / `ai_drafted` and are intentionally hidden from public endpoints until they have passed human editorial review. NINJAL, OpenJLPT and Yokubi are recorded as reference sources for pattern coverage and grammar cross-checking; their explanatory prose and example sentences are **not copied** into this pack.

Before publishing a record, review the Japanese formation rules, casual/polite register, naturalness of both examples, translations, and all quiz choices. `database/seeds/approve-reviewed-content.sql.example` shows how to publish a reviewed slug. Alternatively, update that pattern's `publication_status`, `editorial_review_status` and `reviewed_at` in the JSON source, then regenerate and import the seed. Use `native_reviewed` only after a qualified native Japanese reviewer has checked the full lesson. See `database/content/EDITORIAL_REVIEW_GUIDE.md`.

### JLPT levels and priority

JLPT levels in the starter pack are **approximate community study classifications**, not official current JLPT grammar lists. The JLPT does not publish a definitive grammar-point list for the post-2010 test. `learning_priority` is Kanotoba's editorial learning order; it is not a measured corpus-frequency ranking.

### Generate and import grammar data

Generate the SQL seed:

```bash
npm run import:grammar
```

This creates:

```text
database/seeds/grammar-seed.sql
```

Apply it locally:

```bash
npm run db:seed:grammar:local
```

Or generate and apply locally:

```bash
npm run db:import:grammar:local
```

For production, first ensure migration `0003_content_provenance_and_product_foundation.sql` is applied, then run:

```bash
npm run import:grammar
# Review database/seeds/grammar-seed.sql
npm run db:seed:grammar:remote
```

Or run `npm run db:import:grammar:remote` after the migration is present. The grammar seed is **idempotent**: it upserts the 47 starter patterns, examples, senses, connections, categories, source metadata and quiz items. It does not delete unrelated grammar records, user progress, or KanjiAlive data. The generated SQL file is ignored by Git and should not be committed.

## 5. Content licensing and commercial-readiness

The schema records source and provenance data at the content-record level. Current policy:

- KanjiAlive selected CSV data is attributed under CC BY 4.0 in `THIRD_PARTY_NOTICES.md`.
- OpenJLPT is CC BY-SA 4.0. It is a reference only in the current grammar starter pack; no OpenJLPT explanation or example is copied. If its data is imported later, the relevant dataset portion must retain attribution and ShareAlike terms.
- Yokubi is CC BY 4.0. It is a reference only in the current starter pack; no Yokubi prose or example is copied. Any future adapted content requires attribution and change notices.
- NINJAL Nihongo Bunkei Database 2026.01 is a primary reference. The official item page identifies the dataset, but its file-level license for this version must be confirmed from the archive README before copying its entries, explanations or examples. The current starter pack imports none of that source text.
- Kanotoba's original draft explanations, translations, examples and quizzes are intended to be proprietary, but the final outward-facing terms and ownership should be confirmed before commercial launch.

See `CONTENT_LICENSING.md` and `THIRD_PARTY_NOTICES.md`. This is an engineering provenance record, not a legal opinion.

## 6. API endpoints

All public endpoints use `/api/public`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/public/health` | Worker and D1 health |
| GET | `/api/public/kanji/:character` | One kanji with readings and examples |
| GET | `/api/public/kanji?grade=6&limit=20` | Browse kanji |
| GET | `/api/public/grammar` | Published free grammar; supports `category`, `level`, `core`, `limit`, `offset` |
| GET | `/api/public/grammar/:id` | One pattern with senses, connections, examples, related items and source attribution |
| GET | `/api/public/quiz?grammarId=1&limit=10` | Random published free quiz questions; answer keys are withheld |
| POST | `/api/public/quiz/:id/answer` | Check selected option IDs and return feedback |

Example answer request:

```json
{
  "optionIds": [12]
}
```

The public grammar and quiz routes return only records marked `published`, `free`, and reviewed (`editorially_reviewed` or `native_reviewed`). The starter import creates drafts, not public lessons. After review, update the reviewed lesson, its examples and its quiz records using a controlled SQL approval step. If a record is not reviewed, leave it as a draft. Premium content can be represented in D1, but must not be exposed until a server-side authentication and entitlement check is implemented.

## 7. Local development and tests

Start the Worker:

```bash
npm run dev
```

Run unit, API-route and content validation tests:

```bash
npm test
```

Run the API smoke test in a second terminal while the Worker is running:

```bash
npm run test:api
```

Examples:

```bash
curl "http://127.0.0.1:8787/api/public/kanji/%E6%B3%89"
curl "http://127.0.0.1:8787/api/public/grammar?core=true"
curl "http://127.0.0.1:8787/api/public/grammar/1"
curl "http://127.0.0.1:8787/api/public/quiz?grammarId=1"
```

## 8. Deploy

GitHub Actions validates the JavaScript and tests, applies pending D1 migrations, then deploys the Worker. It does not automatically import generated seed SQL. Use the manual grammar import step above after reviewing the content pack.

Required GitHub Variables:

- `CLOUDFLARE_ACCOUNT_ID`
- `KANOTOBA_WORKER_NAME`
- `KANOTOBA_D1_DATABASE_NAME`
- `KANOTOBA_D1_DATABASE_ID`

Required GitHub Secret:

- `CLOUDFLARE_API_TOKEN` with the minimum Worker deployment, D1 migration and Worker secret permissions required by the workflow.

## 9. Environment and security notes

- `.env` and `backend/.dev.vars` are local-only and ignored by Git.
- `CLOUDFLARE_API_TOKEN` must only exist in local secret storage or GitHub Secrets.
- CORS is a browser response policy, not authentication.
- Public API reads are public by design. Admin writes, user data and premium content must be protected server-side when those capabilities are implemented.
- Do not put private API keys in any future Nuxt frontend environment variable that is bundled into client-side code.

## Development notes

- Worker compatibility date is `2026-05-03`, matching the runtime date supported in the current development environment.
- `grade` in KanjiAlive data is the Japanese school grade, not JLPT level.
- KanjiAlive's source CSV does not provide a separate numeric ID; Kanotoba generates a local ID and retains the upstream `kname` as `source_key`.
