# Kanotoba Grammar Content — v2.0.0

The canonical starter dataset is `grammar-daily-core-v2-bilingual.json`.

It contains 47 unpublished grammar patterns. All learner-facing descriptions are explicitly localized with `_en` and `_ru` fields. Japanese grammar forms, example sentences and answer fragments remain in Japanese-specific fields.

## Import

From the repository root:

```bash
npm run import:grammar
```

This validates the bilingual schema and generates `database/seeds/grammar-seed.sql`. The generated SQL is an import artifact: do not edit it by hand and do not commit it.

For a local D1 import:

```bash
npm run db:migrate:local
npm run import:grammar
npm run db:seed:grammar:local
```

## Publication status

Every pattern is initially `publication_status = draft` and `editorial_review_status = ai_drafted`. The public API must not return these records. They can be inspected using the protected Worker preview mode, but preview does not publish or approve content.

Do not set `native_reviewed` unless a qualified native Japanese reviewer has actually checked the material.

## Scope and review

This dataset is an AI-assisted Kanotoba editorial draft. It is not a native-reviewed Japanese textbook. Check grammar accuracy, naturalness, translations, registers, examples, and quiz distractors before publication.

JLPT labels are approximate study groupings, not official post-2010 JLPT grammar lists.
