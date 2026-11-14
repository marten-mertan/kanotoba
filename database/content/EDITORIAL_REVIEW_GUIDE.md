# Editorial review guide — Kanotoba Grammar v2.0.0

All 47 entries are unpublished drafts. The `editorial_review_status` database values are:

- `ai_drafted` — generated/assembled draft, not yet checked by a human language editor.
- `editorially_reviewed` — checked by an editor with demonstrated Japanese-language competence.
- `native_reviewed` — checked by a qualified native Japanese reviewer.

The dataset also keeps `publication_status` separate:

- `draft` — not available in public API.
- `published` — may be exposed by the public API if its review status and content tier also permit it.
- `archived` — not exposed in public or preview endpoints.

Before publishing an entry, review the following in both English and Russian:

1. Core meaning and nuance.
2. Formation rules for verbs, い-adjectives, な-adjectives and nouns where relevant.
3. Casual and polite usage; do not imply that every grammar pattern has a simple polite/casual equivalent.
4. Register and conversational naturalness.
5. Japanese example sentence grammar and naturalness.
6. Both translations and bilingual context notes.
7. Quiz prompt, exactly one keyed answer, distractor validity, and bilingual feedback for every option.
8. Similar-pattern relations and their bilingual comparison notes.
9. Source/provenance and license metadata.

A review status is not an opinion score. Do not set `native_reviewed` unless a qualified native Japanese reviewer actually reviewed the material. Record the reviewer and date in the project's editorial process before changing status.

Preview access (`?preview=1` + `X-Kanotoba-Preview-Key`) is for private inspection only; it does not change publication or review status.
