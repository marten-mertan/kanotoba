-- Kanotoba content provenance, enriched grammar records, quiz publication,
-- and future-ready user / learning / subscription foundations.
-- This migration does NOT enable authentication, payments, or paywalls by itself.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Content source registry and per-record provenance
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS content_sources (
    source_key TEXT PRIMARY KEY,
    source_name TEXT NOT NULL,
    source_version TEXT,
    source_url TEXT,
    creator TEXT,
    license_identifier TEXT,
    license_url TEXT,
    license_status TEXT NOT NULL DEFAULT 'not_assessed'
        CHECK (license_status IN (
            'verified',
            'reference_only',
            'verify_before_redistribution',
            'not_assessed'
        )),
    usage_scope TEXT NOT NULL DEFAULT 'reference_only',
    attribution_text TEXT,
    reviewed_at TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_provenance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_type TEXT NOT NULL CHECK (content_type IN (
        'kanji_dataset',
        'grammar_dataset',
        'grammar_category',
        'grammar_pattern',
        'grammar_sense',
        'grammar_connection',
        'grammar_relation',
        'grammar_example',
        'quiz_question',
        'quiz_option',
        'learning_path'
    )),
    content_key TEXT NOT NULL,
    source_key TEXT NOT NULL,
    relationship TEXT NOT NULL CHECK (relationship IN (
        'original',
        'derived_from',
        'adapted_from',
        'reviewed_against',
        'reference_consulted',
        'example_from',
        'data_import'
    )),
    source_record_ref TEXT,
    modification_note TEXT,
    attribution_text TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_key) REFERENCES content_sources(source_key) ON DELETE RESTRICT,
    UNIQUE (content_type, content_key, source_key, relationship)
);

CREATE INDEX IF NOT EXISTS idx_content_provenance_content
    ON content_provenance(content_type, content_key);
CREATE INDEX IF NOT EXISTS idx_content_provenance_source
    ON content_provenance(source_key);

-- ---------------------------------------------------------------------------
-- Enrich existing grammar / example / quiz tables without rebuilding them.
-- Existing records remain free but draft until explicitly reviewed/published.
-- ---------------------------------------------------------------------------
ALTER TABLE grammar_patterns ADD COLUMN reading TEXT;
ALTER TABLE grammar_patterns ADD COLUMN explanation_en TEXT;
ALTER TABLE grammar_patterns ADD COLUMN formation_summary TEXT;
ALTER TABLE grammar_patterns ADD COLUMN tags_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE grammar_patterns ADD COLUMN learning_priority INTEGER;
ALTER TABLE grammar_patterns ADD COLUMN is_core INTEGER NOT NULL DEFAULT 0
    CHECK (is_core IN (0, 1));
ALTER TABLE grammar_patterns ADD COLUMN content_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (content_tier IN ('free', 'premium'));
ALTER TABLE grammar_patterns ADD COLUMN publication_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (publication_status IN ('draft', 'published', 'archived'));
ALTER TABLE grammar_patterns ADD COLUMN jlpt_level_basis TEXT NOT NULL DEFAULT 'community_estimate_not_official';
ALTER TABLE grammar_patterns ADD COLUMN editorial_version TEXT;
ALTER TABLE grammar_patterns ADD COLUMN reviewed_at TEXT;
ALTER TABLE grammar_patterns ADD COLUMN editorial_review_status TEXT NOT NULL DEFAULT 'ai_drafted'
    CHECK (editorial_review_status IN ('ai_drafted', 'editorially_reviewed', 'native_reviewed'));

CREATE INDEX IF NOT EXISTS idx_grammar_patterns_publication
    ON grammar_patterns(publication_status, content_tier, learning_priority);

CREATE TABLE IF NOT EXISTS grammar_senses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sense_key TEXT NOT NULL UNIQUE,
    grammar_id INTEGER NOT NULL,
    meaning_en TEXT,
    meaning_ru TEXT NOT NULL,
    nuance_ru TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (grammar_id) REFERENCES grammar_patterns(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_grammar_senses_grammar
    ON grammar_senses(grammar_id, sort_order);

CREATE TABLE IF NOT EXISTS grammar_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    connection_key TEXT NOT NULL UNIQUE,
    grammar_id INTEGER NOT NULL,
    target_type TEXT NOT NULL,
    preceding_form TEXT NOT NULL,
    result_pattern TEXT NOT NULL,
    rule_ru TEXT NOT NULL,
    rule_en TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (grammar_id) REFERENCES grammar_patterns(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_grammar_connections_grammar
    ON grammar_connections(grammar_id, sort_order);

ALTER TABLE grammar_examples ADD COLUMN content_key TEXT;
ALTER TABLE grammar_examples ADD COLUMN furigana TEXT;
ALTER TABLE grammar_examples ADD COLUMN content_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (content_tier IN ('free', 'premium'));
ALTER TABLE grammar_examples ADD COLUMN editorial_review_status TEXT NOT NULL DEFAULT 'ai_drafted'
    CHECK (editorial_review_status IN ('ai_drafted', 'editorially_reviewed', 'native_reviewed'));
CREATE UNIQUE INDEX IF NOT EXISTS idx_grammar_examples_content_key
    ON grammar_examples(content_key);

ALTER TABLE quiz_questions ADD COLUMN content_key TEXT;
ALTER TABLE quiz_questions ADD COLUMN content_tier TEXT NOT NULL DEFAULT 'free'
    CHECK (content_tier IN ('free', 'premium'));
ALTER TABLE quiz_questions ADD COLUMN publication_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (publication_status IN ('draft', 'published', 'archived'));
ALTER TABLE quiz_questions ADD COLUMN editorial_review_status TEXT NOT NULL DEFAULT 'ai_drafted'
    CHECK (editorial_review_status IN ('ai_drafted', 'editorially_reviewed', 'native_reviewed'));
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_questions_content_key
    ON quiz_questions(content_key);

ALTER TABLE quiz_options ADD COLUMN option_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_options_option_key
    ON quiz_options(option_key);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_publication
    ON quiz_questions(publication_status, content_tier, is_active);

-- ---------------------------------------------------------------------------
-- Learning paths: curated courses / study sequences.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS learning_paths (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    jlpt_level TEXT,
    content_tier TEXT NOT NULL DEFAULT 'free'
        CHECK (content_tier IN ('free', 'premium')),
    publication_status TEXT NOT NULL DEFAULT 'draft'
        CHECK (publication_status IN ('draft', 'published', 'archived')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS learning_path_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    learning_path_id INTEGER NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('grammar', 'kanji')),
    item_key TEXT NOT NULL,
    sequence_no INTEGER NOT NULL,
    is_required INTEGER NOT NULL DEFAULT 1 CHECK (is_required IN (0, 1)),
    FOREIGN KEY (learning_path_id) REFERENCES learning_paths(id) ON DELETE CASCADE,
    UNIQUE (learning_path_id, sequence_no),
    UNIQUE (learning_path_id, item_type, item_key)
);
CREATE INDEX IF NOT EXISTS idx_learning_path_items_lookup
    ON learning_path_items(item_type, item_key);

-- ---------------------------------------------------------------------------
-- Future user identity. Passwords are NOT stored here: auth belongs to an
-- external identity provider. This table is not used until auth is implemented.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    auth_provider TEXT NOT NULL,
    auth_subject TEXT NOT NULL,
    email TEXT,
    display_name TEXT,
    preferred_locale TEXT NOT NULL DEFAULT 'en',
    account_status TEXT NOT NULL DEFAULT 'active'
        CHECK (account_status IN ('active', 'disabled', 'deleted')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (auth_provider, auth_subject)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
    ON users(email) WHERE email IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Provider-neutral subscription / entitlement model. No payment provider is
-- selected and no payment data is stored in Kanotoba.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscription_plans (
    plan_code TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    billing_interval TEXT NOT NULL DEFAULT 'none'
        CHECK (billing_interval IN ('none', 'month', 'year', 'one_time')),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plan_features (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_code TEXT NOT NULL,
    feature_key TEXT NOT NULL,
    feature_limit INTEGER,
    configuration_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY (plan_code) REFERENCES subscription_plans(plan_code) ON DELETE CASCADE,
    UNIQUE (plan_code, feature_key)
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan_code TEXT NOT NULL,
    billing_provider TEXT NOT NULL,
    provider_customer_id TEXT,
    provider_subscription_id TEXT,
    status TEXT NOT NULL CHECK (status IN (
        'trialing', 'active', 'past_due', 'paused', 'canceled', 'incomplete', 'expired'
    )),
    current_period_start TEXT,
    current_period_end TEXT,
    cancel_at_period_end INTEGER NOT NULL DEFAULT 0 CHECK (cancel_at_period_end IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_code) REFERENCES subscription_plans(plan_code) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_provider_ref
    ON subscriptions(billing_provider, provider_subscription_id)
    WHERE provider_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status
    ON subscriptions(user_id, status);

CREATE TABLE IF NOT EXISTS billing_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    billing_provider TEXT NOT NULL,
    provider_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    processing_status TEXT NOT NULL DEFAULT 'received'
        CHECK (processing_status IN ('received', 'processed', 'failed', 'ignored')),
    received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TEXT,
    UNIQUE (billing_provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS user_feature_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    feature_key TEXT NOT NULL,
    effect TEXT NOT NULL CHECK (effect IN ('allow', 'deny')),
    starts_at TEXT,
    ends_at TEXT,
    reason TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_feature_overrides_user
    ON user_feature_overrides(user_id, feature_key);

-- ---------------------------------------------------------------------------
-- Learning progress and review history.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_grammar_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    grammar_id INTEGER NOT NULL,
    learning_status TEXT NOT NULL DEFAULT 'new'
        CHECK (learning_status IN ('new', 'learning', 'review', 'mastered')),
    mastery_score REAL NOT NULL DEFAULT 0 CHECK (mastery_score BETWEEN 0 AND 1),
    ease_factor REAL NOT NULL DEFAULT 2.5,
    interval_days REAL NOT NULL DEFAULT 0,
    repetitions INTEGER NOT NULL DEFAULT 0,
    lapses INTEGER NOT NULL DEFAULT 0,
    last_reviewed_at TEXT,
    next_review_at TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (grammar_id) REFERENCES grammar_patterns(id) ON DELETE CASCADE,
    UNIQUE (user_id, grammar_id)
);
CREATE INDEX IF NOT EXISTS idx_user_grammar_due
    ON user_grammar_progress(user_id, next_review_at);

CREATE TABLE IF NOT EXISTS user_kanji_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    kanji_id INTEGER NOT NULL,
    learning_status TEXT NOT NULL DEFAULT 'new'
        CHECK (learning_status IN ('new', 'learning', 'review', 'mastered')),
    mastery_score REAL NOT NULL DEFAULT 0 CHECK (mastery_score BETWEEN 0 AND 1),
    ease_factor REAL NOT NULL DEFAULT 2.5,
    interval_days REAL NOT NULL DEFAULT 0,
    repetitions INTEGER NOT NULL DEFAULT 0,
    lapses INTEGER NOT NULL DEFAULT 0,
    last_reviewed_at TEXT,
    next_review_at TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (kanji_id) REFERENCES kanji(id) ON DELETE CASCADE,
    UNIQUE (user_id, kanji_id)
);
CREATE INDEX IF NOT EXISTS idx_user_kanji_due
    ON user_kanji_progress(user_id, next_review_at);

CREATE TABLE IF NOT EXISTS user_quiz_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    question_id INTEGER NOT NULL,
    selected_option_ids_json TEXT NOT NULL,
    is_correct INTEGER NOT NULL CHECK (is_correct IN (0, 1)),
    duration_ms INTEGER,
    attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_user_date
    ON user_quiz_attempts(user_id, attempted_at);

CREATE TABLE IF NOT EXISTS user_review_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('grammar', 'kanji')),
    item_key TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 0 AND 5),
    review_payload_json TEXT NOT NULL DEFAULT '{}',
    reviewed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_review_events_history
    ON user_review_events(user_id, item_type, item_key, reviewed_at);

-- Starter plan definitions are feature flags only; prices and checkout are
-- deliberately kept out until product/market and payment-provider decisions.
INSERT OR IGNORE INTO subscription_plans(plan_code, display_name, billing_interval)
VALUES
    ('free', 'Kanotoba Free', 'none'),
    ('premium_monthly', 'Kanotoba Premium Monthly', 'month'),
    ('premium_yearly', 'Kanotoba Premium Yearly', 'year');

INSERT OR IGNORE INTO plan_features(plan_code, feature_key, feature_limit, configuration_json)
VALUES
    ('free', 'kanji_lookup', NULL, '{"enabled":true}'),
    ('free', 'core_grammar', NULL, '{"enabled":true}'),
    ('free', 'basic_quiz', NULL, '{"enabled":true}'),
    ('free', 'local_progress', NULL, '{"enabled":true}'),
    ('premium_monthly', 'advanced_srs', NULL, '{"enabled":true}'),
    ('premium_monthly', 'cloud_sync', NULL, '{"enabled":true}'),
    ('premium_monthly', 'ai_tutor', NULL, '{"enabled":true}'),
    ('premium_monthly', 'advanced_analytics', NULL, '{"enabled":true}'),
    ('premium_monthly', 'learning_paths', NULL, '{"enabled":true}'),
    ('premium_yearly', 'advanced_srs', NULL, '{"enabled":true}'),
    ('premium_yearly', 'cloud_sync', NULL, '{"enabled":true}'),
    ('premium_yearly', 'ai_tutor', NULL, '{"enabled":true}'),
    ('premium_yearly', 'advanced_analytics', NULL, '{"enabled":true}'),
    ('premium_yearly', 'learning_paths', NULL, '{"enabled":true}');
