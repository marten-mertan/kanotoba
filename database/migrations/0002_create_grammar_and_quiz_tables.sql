-- Content tables for Kanotoba's later grammar and practice modules.
-- Records are intentionally not seeded by this initial infrastructure setup.

CREATE TABLE IF NOT EXISTS grammar_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_ru TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS grammar_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    pattern TEXT NOT NULL,
    romaji TEXT,
    meaning_en TEXT,
    meaning_ru TEXT NOT NULL,
    jlpt_level TEXT,
    category_id INTEGER,
    register TEXT,
    explanation_ru TEXT,
    formation_casual TEXT,
    formation_polite TEXT,
    notes_ru TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES grammar_categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_grammar_patterns_category ON grammar_patterns(category_id);
CREATE INDEX IF NOT EXISTS idx_grammar_patterns_jlpt ON grammar_patterns(jlpt_level);

CREATE TABLE IF NOT EXISTS grammar_examples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grammar_id INTEGER NOT NULL,
    japanese TEXT NOT NULL,
    romaji TEXT,
    translation_en TEXT,
    translation_ru TEXT NOT NULL,
    register TEXT,
    context_note_ru TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (grammar_id) REFERENCES grammar_patterns(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_grammar_examples_grammar ON grammar_examples(grammar_id);

CREATE TABLE IF NOT EXISTS grammar_relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grammar_id INTEGER NOT NULL,
    related_grammar_id INTEGER NOT NULL,
    relation_type TEXT NOT NULL DEFAULT 'related',
    note_ru TEXT,
    FOREIGN KEY (grammar_id) REFERENCES grammar_patterns(id) ON DELETE CASCADE,
    FOREIGN KEY (related_grammar_id) REFERENCES grammar_patterns(id) ON DELETE CASCADE,
    UNIQUE (grammar_id, related_grammar_id, relation_type)
);

CREATE TABLE IF NOT EXISTS quiz_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grammar_id INTEGER,
    question_type TEXT NOT NULL DEFAULT 'multiple_choice',
    prompt_ru TEXT NOT NULL,
    prompt_en TEXT,
    prompt_ja TEXT,
    explanation_ru TEXT,
    difficulty TEXT NOT NULL DEFAULT 'beginner',
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (grammar_id) REFERENCES grammar_patterns(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_grammar ON quiz_questions(grammar_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_active ON quiz_questions(is_active);

CREATE TABLE IF NOT EXISTS quiz_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL,
    option_text TEXT NOT NULL,
    is_correct INTEGER NOT NULL DEFAULT 0 CHECK (is_correct IN (0, 1)),
    explanation_ru TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quiz_options_question ON quiz_options(question_id);
