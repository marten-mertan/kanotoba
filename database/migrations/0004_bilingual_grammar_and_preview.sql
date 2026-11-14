-- Kanotoba v2 grammar localization and preview-support fields.
-- Apply after 0003_content_provenance_and_product_foundation.sql.
-- This migration is additive: legacy columns remain for compatibility.

-- Grammar pattern descriptions and instructions.
ALTER TABLE grammar_patterns ADD COLUMN formation_casual_en TEXT;
ALTER TABLE grammar_patterns ADD COLUMN formation_casual_ru TEXT;
ALTER TABLE grammar_patterns ADD COLUMN formation_polite_en TEXT;
ALTER TABLE grammar_patterns ADD COLUMN formation_polite_ru TEXT;
ALTER TABLE grammar_patterns ADD COLUMN notes_en TEXT;
ALTER TABLE grammar_patterns ADD COLUMN connection_summary_en TEXT;
ALTER TABLE grammar_patterns ADD COLUMN connection_summary_ru TEXT;
ALTER TABLE grammar_patterns ADD COLUMN register_label_en TEXT;
ALTER TABLE grammar_patterns ADD COLUMN register_label_ru TEXT;
ALTER TABLE grammar_patterns ADD COLUMN tag_labels_json TEXT NOT NULL DEFAULT '[]';

-- Keep structured register codes separate from localized display labels.
-- Existing `register` is retained as a JSON array string by the v2 importer.

-- Meaning nuance in both learner languages.
ALTER TABLE grammar_senses ADD COLUMN nuance_en TEXT;

-- Connection descriptions in both learner languages.
ALTER TABLE grammar_connections ADD COLUMN preceding_form_en TEXT;
ALTER TABLE grammar_connections ADD COLUMN preceding_form_ru TEXT;

-- Example context and register labels in both learner languages.
ALTER TABLE grammar_examples ADD COLUMN context_note_en TEXT;
ALTER TABLE grammar_examples ADD COLUMN register_label_en TEXT;
ALTER TABLE grammar_examples ADD COLUMN register_label_ru TEXT;

-- Relation/comparison explanations in both learner languages.
ALTER TABLE grammar_relations ADD COLUMN note_en TEXT;

-- Question-level feedback and option-level feedback in both learner languages.
ALTER TABLE quiz_questions ADD COLUMN explanation_en TEXT;
ALTER TABLE quiz_options ADD COLUMN explanation_en TEXT;
ALTER TABLE quiz_options ADD COLUMN option_text_ja TEXT;

-- Future learning paths and plan labels should also be localizable.
ALTER TABLE learning_paths ADD COLUMN title_en TEXT;
ALTER TABLE learning_paths ADD COLUMN title_ru TEXT;
ALTER TABLE learning_paths ADD COLUMN description_en TEXT;
ALTER TABLE learning_paths ADD COLUMN description_ru TEXT;

ALTER TABLE subscription_plans ADD COLUMN display_name_en TEXT;
ALTER TABLE subscription_plans ADD COLUMN display_name_ru TEXT;
ALTER TABLE subscription_plans ADD COLUMN description_en TEXT;
ALTER TABLE subscription_plans ADD COLUMN description_ru TEXT;

ALTER TABLE plan_features ADD COLUMN label_en TEXT;
ALTER TABLE plan_features ADD COLUMN label_ru TEXT;
ALTER TABLE plan_features ADD COLUMN description_en TEXT;
ALTER TABLE plan_features ADD COLUMN description_ru TEXT;

CREATE INDEX IF NOT EXISTS idx_grammar_patterns_editorial_status
    ON grammar_patterns(editorial_review_status, publication_status);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_editorial_status
    ON quiz_questions(editorial_review_status, publication_status, is_active);
