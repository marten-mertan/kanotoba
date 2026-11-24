import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const wranglerScript = resolve(root, 'scripts/wrangler.mjs');
const databaseName = 'kanotoba-db';
const mode = process.argv.includes('--remote') ? 'remote' : 'local';
const isRemote = mode === 'remote';

const EDITORIAL_STATUSES = [
  { value: 'ai_drafted', label: 'AI drafted — not reviewed' },
  { value: 'editorially_reviewed', label: 'Editorially reviewed' },
  { value: 'native_reviewed', label: 'Native-speaker reviewed' },
];

const PUBLICATION_STATUSES = [
  { value: 'draft', label: 'Draft — not public' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

const rl = createInterface({ input, output });

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function parseIds(value) {
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return null;

  const ids = parts.map(Number);
  if (ids.some((id) => !Number.isSafeInteger(id) || id < 1)) return null;
  return [...new Set(ids)];
}

function toSqlIds(ids) {
  return ids.join(', ');
}

function parseWranglerJson(outputText) {
  const trimmed = outputText.trim();
  for (let index = 0; index < trimmed.length; index += 1) {
    if (trimmed[index] !== '[' && trimmed[index] !== '{') continue;
    try {
      return JSON.parse(trimmed.slice(index));
    } catch {
      // Continue until the start of a complete JSON payload is found.
    }
  }
  throw new Error(`Could not parse Wrangler JSON output:\n${outputText}`);
}

function extractResults(payload) {
  const entries = Array.isArray(payload) ? payload : [payload];
  const failed = entries.find((entry) => entry && entry.success === false);
  if (failed) throw new Error(failed.error || 'D1 query failed.');

  const resultEntry = entries.find((entry) => entry && Array.isArray(entry.results));
  if (resultEntry) return resultEntry.results;

  if (!Array.isArray(payload) && Array.isArray(payload?.results)) return payload.results;
  throw new Error('Wrangler returned JSON without a D1 results array.');
}

async function executeSql(sql) {
  const tempDir = await mkdtemp(join(root, '.kanotoba-content-manager-'));
  const sqlFile = join(tempDir, 'query.sql');
  const relativeSqlFile = `./${sqlFile.slice(root.length + 1).replaceAll('\\', '/')}`;

  try {
    await writeFile(sqlFile, `${sql.trim().replace(/;+\s*$/u, '')};\n`, 'utf8');

    const args = [
      wranglerScript,
      'd1',
      'execute',
      databaseName,
      isRemote ? '--remote' : '--local',
      `--file=${relativeSqlFile}`,
      '--json',
    ];

    const outputText = await new Promise((resolvePromise, rejectPromise) => {
      const child = spawn(process.execPath, args, {
        cwd: root,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdoutText = '';
      let stderrText = '';
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk) => { stdoutText += chunk; });
      child.stderr.on('data', (chunk) => { stderrText += chunk; });
      child.on('error', rejectPromise);
      child.on('close', (code) => {
        if (code !== 0) {
          rejectPromise(new Error(
            `Wrangler exited with code ${code}.\n${stderrText || stdoutText}`.trim(),
          ));
          return;
        }
        resolvePromise(stdoutText);
      });
    });

    return extractResults(parseWranglerJson(outputText));
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function ask(prompt) {
  return (await rl.question(prompt)).trim();
}

async function confirmWrite(description) {
  console.log(`\n${description}`);
  if (!isRemote) {
    const answer = (await ask('Apply this change? [y/N]: ')).toLowerCase();
    return answer === 'y' || answer === 'yes';
  }

  console.log('\nREMOTE DATABASE — this change will affect production.');
  const answer = await ask('Type YES to apply: ');
  return answer === 'YES';
}

function terminalWidth() {
  const width = Number(output.columns || process.env.COLUMNS || 120);
  return Number.isFinite(width) && width > 0 ? width : 100;
}

function characterWidth(character) {
  const codePoint = character.codePointAt(0);
  if (codePoint === 0x200d || codePoint === 0xfe0e || codePoint === 0xfe0f) return 0;
  if (/\p{Mark}/u.test(character)) return 0;

  // Treat CJK characters and common full-width symbols as two terminal cells.
  if (
    (codePoint >= 0x1100 && codePoint <= 0x11ff)
    || (codePoint >= 0x2e80 && codePoint <= 0xa4cf)
    || (codePoint >= 0xac00 && codePoint <= 0xd7af)
    || (codePoint >= 0xf900 && codePoint <= 0xfaff)
    || (codePoint >= 0xfe10 && codePoint <= 0xfe6f)
    || (codePoint >= 0xff01 && codePoint <= 0xff60)
    || (codePoint >= 0xffe0 && codePoint <= 0xffe6)
    || (codePoint >= 0x1f300 && codePoint <= 0x1faff)
    || (codePoint >= 0x20000 && codePoint <= 0x3ffff)
  ) return 2;

  return 1;
}

function displayWidth(value) {
  return Array.from(String(value)).reduce((width, character) => width + characterWidth(character), 0);
}

function fitCell(value, width) {
  const text = String(value ?? '').replace(/[\r\n\t]+/gu, ' ');
  if (displayWidth(text) <= width) return text + ' '.repeat(width - displayWidth(text));
  if (width <= 1) return '…'.repeat(width);

  let result = '';
  let used = 0;
  const limit = width - 1;
  for (const character of text) {
    const size = characterWidth(character);
    if (used + size > limit) break;
    result += character;
    used += size;
  }
  result += '…';
  return result + ' '.repeat(Math.max(0, width - displayWidth(result)));
}

function printStackedRows(rows, columns) {
  rows.forEach((row, index) => {
    if (index > 0) console.log('');
    const idColumn = columns.find(([, key]) => key === 'id');
    const id = idColumn ? row[idColumn[1]] : index + 1;
    console.log(`[${id ?? index + 1}]`);
    for (const [label, key] of columns) {
      const value = row[key];
      if (value === null || value === undefined || value === '') continue;
      console.log(`  ${label}: ${String(value).replace(/[\r\n\t]+/gu, ' ')}`);
    }
  });
}

function printTable(rows, columns) {
  if (!rows.length) {
    console.log('No records found.');
    return;
  }

  const terminal = terminalWidth();
  const separatorWidth = 3;
  const minColumnWidth = 5;
  const minReadableTableWidth = columns.length * 12 + (columns.length - 1) * separatorWidth;
  const values = rows.map((row) => columns.map(([, key]) => {
    const value = row[key];
    return value === null || value === undefined ? '' : String(value).replace(/[\r\n\t]+/gu, ' ');
  }));
  const widths = columns.map(([label], columnIndex) => {
    const contentWidth = Math.max(
      displayWidth(label),
      ...values.map((record) => displayWidth(record[columnIndex])),
    );
    return Math.max(minColumnWidth, Math.min(contentWidth, 32));
  });

  let totalWidth = widths.reduce((sum, width) => sum + width, 0)
    + (columns.length - 1) * separatorWidth;

  while (totalWidth > terminal) {
    let widestColumn = -1;
    let widestSlack = 0;
    for (let index = 0; index < widths.length; index += 1) {
      const slack = widths[index] - minColumnWidth;
      if (slack > widestSlack) {
        widestSlack = slack;
        widestColumn = index;
      }
    }
    if (widestColumn === -1) break;
    widths[widestColumn] -= 1;
    totalWidth -= 1;
  }

  // For narrow terminals or tables with many fields, key-value rows are easier to read
  // than a table squeezed into columns that are too small.
  if (totalWidth > terminal || terminal < minReadableTableWidth) {
    printStackedRows(rows, columns);
    return;
  }

  const renderRow = (cells) => cells
    .map((cell, index) => fitCell(cell, widths[index]))
    .join(' | ');
  console.log(renderRow(columns.map(([label]) => label)));
  console.log(widths.map((width) => '-'.repeat(width)).join('-+-'));
  for (const record of values) console.log(renderRow(record));
}

function showChoices(title, choices) {
  console.log(`\n${title}`);
  choices.forEach((choice, index) => {
    console.log(`  ${index + 1}. ${choice.label} (${choice.value})`);
  });
  console.log('  Enter. Keep current value');
}

async function chooseOptionalStatus(title, choices) {
  showChoices(title, choices);
  const value = await ask('Select: ');
  if (!value) return null;
  const index = Number(value) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= choices.length) {
    console.log('Invalid selection. No changes made.');
    return undefined;
  }
  return choices[index].value;
}

async function loadGrammarPatterns() {
  return executeSql(`
    SELECT id, slug, pattern, jlpt_level, content_tier,
           editorial_review_status, publication_status
    FROM grammar_patterns
    ORDER BY COALESCE(learning_priority, 9999), id
  `);
}

async function loadExamples({ grammarId = null, ids = null, pendingOnly = false } = {}) {
  const conditions = [];
  if (grammarId !== null) conditions.push(`e.grammar_id = ${Number(grammarId)}`);
  if (ids) conditions.push(`e.id IN (${toSqlIds(ids)})`);
  if (pendingOnly) conditions.push("e.editorial_review_status = 'ai_drafted'");
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  return executeSql(`
    SELECT e.id, e.grammar_id, p.pattern AS grammar_pattern,
           p.publication_status AS parent_publication_status,
           p.editorial_review_status AS parent_editorial_review_status,
           p.content_tier AS parent_content_tier,
           e.japanese, e.translation_en, e.translation_ru, e.content_tier, e.editorial_review_status
    FROM grammar_examples e
    JOIN grammar_patterns p ON p.id = e.grammar_id
    ${where}
    ORDER BY p.id, e.sort_order, e.id
  `);
}

async function loadQuizQuestions({ grammarId = null, ids = null, pendingOnly = false } = {}) {
  const conditions = [];
  if (grammarId !== null) conditions.push(`q.grammar_id = ${Number(grammarId)}`);
  if (ids) conditions.push(`q.id IN (${toSqlIds(ids)})`);
  if (pendingOnly) conditions.push("q.editorial_review_status = 'ai_drafted'");
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  return executeSql(`
    SELECT q.id, q.grammar_id, p.pattern AS grammar_pattern,
           p.publication_status AS parent_publication_status,
           p.editorial_review_status AS parent_editorial_review_status,
           p.content_tier AS parent_content_tier,
           COALESCE(q.prompt_en, q.prompt_ru, q.prompt_ja) AS prompt,
           q.is_active, q.content_tier, q.editorial_review_status,
           q.publication_status, q.question_type
    FROM quiz_questions q
    LEFT JOIN grammar_patterns p ON p.id = q.grammar_id
    ${where}
    ORDER BY q.grammar_id, q.id
  `);
}

async function loadGrammarDetail(grammarId) {
  // Run Wrangler queries sequentially to avoid concurrent local D1 file access.
  const patterns = await executeSql(`
    SELECT id, slug, pattern, jlpt_level, content_tier,
           editorial_review_status, publication_status
    FROM grammar_patterns WHERE id = ${Number(grammarId)} LIMIT 1
  `);
  const examples = await executeSql(`
    SELECT id, japanese, translation_en, translation_ru,
           content_tier, editorial_review_status, sort_order
    FROM grammar_examples WHERE grammar_id = ${Number(grammarId)}
    ORDER BY sort_order, id
  `);
  const senses = await executeSql(`
    SELECT id, sense_key, meaning_en, meaning_ru, nuance_en, nuance_ru, sort_order
    FROM grammar_senses WHERE grammar_id = ${Number(grammarId)}
    ORDER BY sort_order, id
  `);
  const connections = await executeSql(`
    SELECT id, connection_key, target_type, preceding_form,
           preceding_form_en, preceding_form_ru, result_pattern,
           rule_en, rule_ru, sort_order
    FROM grammar_connections WHERE grammar_id = ${Number(grammarId)}
    ORDER BY sort_order, id
  `);
  const relations = await executeSql(`
    SELECT r.id, r.related_grammar_id, p.pattern AS related_pattern,
           r.relation_type, r.note_en, r.note_ru
    FROM grammar_relations r
    JOIN grammar_patterns p ON p.id = r.related_grammar_id
    WHERE r.grammar_id = ${Number(grammarId)}
    ORDER BY p.id, r.id
  `);
  const questions = await loadQuizQuestions({ grammarId });

  return {
    pattern: patterns[0] || null,
    examples,
    senses,
    connections,
    relations,
    questions,
  };
}

async function loadQuestionDetail(questionId) {
  const questions = await executeSql(`
    SELECT q.id, q.grammar_id, p.pattern AS grammar_pattern,
           p.publication_status AS parent_publication_status,
           p.editorial_review_status AS parent_editorial_review_status,
           p.content_tier AS parent_content_tier,
           COALESCE(q.prompt_en, q.prompt_ru, q.prompt_ja) AS prompt,
           q.content_tier, q.editorial_review_status, q.publication_status,
           q.is_active, q.question_type
    FROM quiz_questions q
    LEFT JOIN grammar_patterns p ON p.id = q.grammar_id
    WHERE q.id = ${Number(questionId)} LIMIT 1
  `);
  const options = await executeSql(`
    SELECT id, COALESCE(option_text_ja, option_text) AS option_text,
           is_correct, explanation_en, explanation_ru, sort_order
    FROM quiz_options WHERE question_id = ${Number(questionId)}
    ORDER BY sort_order, id
  `);
  return { question: questions[0] || null, options };
}

function printGrammarDetail(detail) {
  const { pattern, examples, senses, connections, relations, questions } = detail;
  if (!pattern) {
    console.log('Grammar pattern not found.');
    return;
  }

  console.log(`\nGrammar #${pattern.id}: ${pattern.pattern} (${pattern.slug})`);
  console.log(`JLPT: ${pattern.jlpt_level || '—'} | Tier: ${pattern.content_tier}`);
  console.log(`Publication: ${pattern.publication_status} | Editorial: ${pattern.editorial_review_status}`);

  console.log('\nExamples');
  printTable(examples, [
    ['ID', 'id'], ['Japanese', 'japanese'], ['Translation (EN)', 'translation_en'],
    ['Tier', 'content_tier'], ['Editorial', 'editorial_review_status'],
  ]);

  console.log('\nSenses (no individual review status)');
  printTable(senses, [
    ['ID', 'id'], ['Key', 'sense_key'], ['Meaning (EN)', 'meaning_en'],
    ['Meaning (RU)', 'meaning_ru'], ['Nuance (EN)', 'nuance_en'], ['Nuance (RU)', 'nuance_ru'],
  ]);

  console.log('\nConnections (no individual review status)');
  printTable(connections, [
    ['ID', 'id'], ['Key', 'connection_key'], ['Target', 'target_type'],
    ['Preceding form', 'preceding_form'], ['Preceding (EN)', 'preceding_form_en'],
    ['Result', 'result_pattern'], ['Rule (EN)', 'rule_en'], ['Rule (RU)', 'rule_ru'],
  ]);

  console.log('\nRelations (no individual review status)');
  printTable(relations, [
    ['ID', 'id'], ['Related grammar ID', 'related_grammar_id'],
    ['Related pattern', 'related_pattern'], ['Type', 'relation_type'],
    ['Note (EN)', 'note_en'], ['Note (RU)', 'note_ru'],
  ]);

  console.log('\nQuiz questions');
  printTable(questions, [
    ['ID', 'id'], ['Prompt', 'prompt'], ['Active', 'is_active'],
    ['Tier', 'content_tier'], ['Publication', 'publication_status'], ['Editorial', 'editorial_review_status'],
  ]);
}

async function choosePatternIds() {
  const patterns = await loadGrammarPatterns();
  printTable(patterns, [
    ['ID', 'id'], ['Pattern', 'pattern'], ['JLPT', 'jlpt_level'],
    ['Tier', 'content_tier'], ['Publication', 'publication_status'], ['Editorial', 'editorial_review_status'],
  ]);
  const value = await ask('\nGrammar pattern ID (or Q to go back): ');
  if (value.toLowerCase() === 'q') return null;
  const ids = parseIds(value);
  if (!ids || ids.length !== 1) {
    console.log('Enter one valid numeric ID.');
    return undefined;
  }
  return ids[0];
}

async function updateStatusRows({ entityLabel, rows, idField = 'id', editorial = true, publication = false, publishGuard = true }) {
  if (!rows.length) {
    console.log('No matching records found.');
    return;
  }

  const selectedEditorial = editorial
    ? await chooseOptionalStatus('Editorial review status', EDITORIAL_STATUSES)
    : null;
  if (selectedEditorial === undefined) return;

  const selectedPublication = publication
    ? await chooseOptionalStatus('Publication status', PUBLICATION_STATUSES)
    : null;
  if (selectedPublication === undefined) return;

  if (selectedEditorial === null && selectedPublication === null) {
    console.log('No changes selected.');
    return;
  }

  const changes = [];
  for (const row of rows) {
    const currentEditorial = row.editorial_review_status;
    const currentPublication = row.publication_status;
    const nextEditorial = selectedEditorial ?? currentEditorial;
    const nextPublication = selectedPublication ?? currentPublication;

    if (
      publishGuard
      && selectedPublication === 'published'
      && currentPublication !== 'published'
      && nextEditorial === 'ai_drafted'
    ) {
      console.log(
        `Cannot publish ${entityLabel} #${row[idField]}: its editorial status is ai_drafted. Review it first.`,
      );
      return;
    }

    if (nextEditorial === currentEditorial && nextPublication === currentPublication) continue;
    changes.push({
      id: row[idField],
      currentEditorial,
      currentPublication,
      nextEditorial,
      nextPublication,
      contentTier: row.content_tier,
      parentPublication: row.parent_publication_status,
      parentEditorial: row.parent_editorial_review_status,
      parentTier: row.parent_content_tier,
      grammarId: row.grammar_id,
      isActive: row.is_active,
    });
  }

  if (!changes.length) {
    console.log('All selected records already have these statuses. No database changes needed.');
    return;
  }

  console.log('\nPlanned changes');
  printTable(changes.map((change) => ({
    id: change.id,
    editorialBefore: change.currentEditorial || '—',
    editorialAfter: change.nextEditorial || '—',
    publicationBefore: change.currentPublication || '—',
    publicationAfter: change.nextPublication || '—',
  })), [
    ['ID', 'id'],
    ['Editorial (before)', 'editorialBefore'],
    ['Editorial (after)', 'editorialAfter'],
    ['Publication (before)', 'publicationBefore'],
    ['Publication (after)', 'publicationAfter'],
  ]);

  const isReviewed = (status) => ['editorially_reviewed', 'native_reviewed'].includes(status);
  const isPubliclyVisible = (change, next = false) => {
    const editorialStatus = next ? change.nextEditorial : change.currentEditorial;
    const publicationStatus = next ? change.nextPublication : change.currentPublication;
    if (change.contentTier !== 'free' || !isReviewed(editorialStatus)) return false;

    if (entityLabel === 'grammar example') {
      return change.parentPublication === 'published'
        && change.parentTier === 'free'
        && isReviewed(change.parentEditorial);
    }

    if (publicationStatus !== 'published') return false;
    if (entityLabel === 'quiz question') {
      if (change.isActive !== 1) return false;
      if (change.grammarId === null) return true;
      return change.parentPublication === 'published'
        && change.parentTier === 'free'
        && isReviewed(change.parentEditorial);
    }
    return true;
  };

  const becomingHidden = changes.filter((change) =>
    isPubliclyVisible(change, false) && !isPubliclyVisible(change, true),
  );
  if (becomingHidden.length && entityLabel === 'grammar pattern') {
    console.log('Visibility impact: these grammar patterns will disappear from the public API until the publication and review conditions are met again. Their examples, senses, connections and related Quiz questions will no longer be returned through those grammar patterns.');
  } else if (becomingHidden.length && entityLabel === 'grammar example') {
    console.log('Visibility impact: only these examples will disappear from the public grammar detail response. The grammar pattern itself remains visible.');
  } else if (becomingHidden.length && entityLabel === 'quiz question') {
    console.log('Visibility impact: these Quiz questions will disappear from the public Quiz API until their own and parent visibility conditions are met again.');
  }

  if (publication && selectedPublication === 'published') {
    const premium = changes.filter((change) => change.contentTier === 'premium');
    if (premium.length) {
      console.log(`Warning: ${premium.length} record(s) are premium and will not appear in the current free public API.`);
    }
    if (entityLabel === 'quiz question') {
      const inactive = changes.filter((change) => change.isActive !== 1);
      if (inactive.length) {
        console.log(`Warning: ${inactive.length} Quiz question(s) are inactive and will not be returned by the public Quiz API.`);
      }
    }
    const hiddenParents = changes.filter((change) =>
      change.parentPublication && (
        change.parentPublication !== 'published'
        || change.parentTier !== 'free'
        || !['editorially_reviewed', 'native_reviewed'].includes(change.parentEditorial)
      ));
    if (hiddenParents.length) {
      console.log(`Warning: ${hiddenParents.length} quiz question(s) have a parent grammar pattern that is not publicly visible.`);
    }
  }

  const ids = changes.map((change) => change.id);
  const setParts = [];
  if (selectedEditorial !== null) setParts.push(`editorial_review_status = ${sqlString(selectedEditorial)}`);
  if (selectedPublication !== null) setParts.push(`publication_status = ${sqlString(selectedPublication)}`);

  if (entityLabel === 'grammar pattern' && selectedEditorial !== null) {
    setParts.push(selectedEditorial === 'ai_drafted'
      ? 'reviewed_at = NULL'
      : 'reviewed_at = CURRENT_TIMESTAMP');
  }

  const table = entityLabel === 'grammar pattern'
    ? 'grammar_patterns'
    : entityLabel === 'grammar example'
      ? 'grammar_examples'
      : 'quiz_questions';

  const description = `${entityLabel}: update ${ids.length} record(s) in ${table}.`;
  if (!(await confirmWrite(description))) {
    console.log('Cancelled. No database changes made.');
    return;
  }

  await executeSql(`UPDATE ${table} SET ${setParts.join(', ')} WHERE id IN (${toSqlIds(ids)})`);
  console.log(`Updated ${entityLabel} record(s): ${ids.join(', ')}.`);
}

async function updateGrammarStatuses(pattern) {
  await updateStatusRows({
    entityLabel: 'grammar pattern',
    rows: [pattern],
    editorial: true,
    publication: true,
  });
}

async function updateExamplesStatuses(rows) {
  await updateStatusRows({
    entityLabel: 'grammar example',
    rows,
    editorial: true,
    publication: false,
    publishGuard: false,
  });
}

async function updateQuizStatuses(rows) {
  await updateStatusRows({
    entityLabel: 'quiz question',
    rows,
    editorial: true,
    publication: true,
  });
}

async function markGrammarForReview(grammarIds, reason) {
  const current = await executeSql(`
    SELECT id, pattern, editorial_review_status, publication_status
    FROM grammar_patterns WHERE id IN (${toSqlIds(grammarIds)})
  `);
  if (!current.length) {
    console.log('No matching grammar patterns found.');
    return;
  }

  console.log(`\nThe following grammar pattern(s) will be marked ai_drafted because ${reason}:`);
  printTable(current, [
    ['ID', 'id'], ['Pattern', 'pattern'], ['Publication', 'publication_status'], ['Editorial (before)', 'editorial_review_status'],
  ]);
  console.log('Their public grammar detail endpoints will stop returning them until they are reviewed again.');

  if (!(await confirmWrite('Set editorial_review_status = ai_drafted for the selected grammar pattern(s).'))) {
    console.log('Cancelled. No database changes made.');
    return;
  }

  await executeSql(`
    UPDATE grammar_patterns
    SET editorial_review_status = 'ai_drafted', reviewed_at = NULL
    WHERE id IN (${toSqlIds(grammarIds)})
  `);
  console.log('Marked for review.');
}

async function markQuizForReview(questionId) {
  const rows = await executeSql(`
    SELECT id, COALESCE(prompt_en, prompt_ru, prompt_ja) AS prompt,
           publication_status, editorial_review_status
    FROM quiz_questions WHERE id = ${Number(questionId)} LIMIT 1
  `);
  if (!rows.length) {
    console.log('Quiz question not found.');
    return;
  }

  const question = rows[0];
  console.log('\nThe question will be marked ai_drafted because one or more of its options changed:');
  printTable(rows, [
    ['ID', 'id'], ['Prompt', 'prompt'], ['Publication', 'publication_status'], ['Editorial (before)', 'editorial_review_status'],
  ]);
  console.log('The question will no longer be returned by the public Quiz API until reviewed again.');

  if (!(await confirmWrite(`Set editorial_review_status = ai_drafted for quiz question #${question.id}.`))) {
    console.log('Cancelled. No database changes made.');
    return;
  }

  await executeSql(`
    UPDATE quiz_questions
    SET editorial_review_status = 'ai_drafted'
    WHERE id = ${Number(questionId)}
  `);
  console.log('Quiz question marked for review.');
}

async function manageQuestion(questionId) {
  while (true) {
    const detail = await loadQuestionDetail(questionId);
    const { question, options } = detail;
    if (!question) {
      console.log('Quiz question not found.');
      return;
    }

    console.log(`\nQuiz question #${question.id}`);
    console.log(`Grammar: ${question.grammar_pattern || (question.grammar_id === null ? 'Standalone' : `#${question.grammar_id}`)}`);
    if (question.grammar_id !== null) {
      console.log(`Parent availability: ${question.parent_publication_status} / ${question.parent_editorial_review_status} / ${question.parent_content_tier}`);
    }
    console.log(`Prompt: ${question.prompt}`);
    console.log(`Active: ${question.is_active} | Tier: ${question.content_tier}`);
    console.log(`Publication: ${question.publication_status} | Editorial: ${question.editorial_review_status}`);
    console.log('\nOptions');
    printTable(options, [
      ['ID', 'id'], ['Option', 'option_text'], ['Correct', 'is_correct'],
      ['Explanation (EN)', 'explanation_en'], ['Explanation (RU)', 'explanation_ru'], ['Order', 'sort_order'],
    ]);

    console.log('\n1. Change question statuses');
    console.log('2. Mark question for review (after editing an option)');
    console.log('Q. Back');
    const choice = (await ask('Select: ')).toLowerCase();

    if (choice === 'q') return;
    if (choice === '1') {
      const rows = await loadQuizQuestions({ ids: [question.id] });
      await updateQuizStatuses(rows);
    } else if (choice === '2') {
      await markQuizForReview(question.id);
    } else {
      console.log('Unknown selection.');
    }
  }
}

async function managePattern(patternId) {
  while (true) {
    const detail = await loadGrammarDetail(patternId);
    if (!detail.pattern) {
      console.log('Grammar pattern not found.');
      return;
    }

    printGrammarDetail(detail);
    console.log('\n1. Change grammar pattern statuses');
    console.log('2. Change example review status');
    console.log('3. Change a Quiz question status');
    console.log('4. Mark grammar pattern for review (after editing senses, connections or relations)');
    console.log('Q. Back');

    const choice = (await ask('Select: ')).toLowerCase();
    if (choice === 'q') return;

    if (choice === '1') {
      await updateGrammarStatuses(detail.pattern);
    } else if (choice === '2') {
      if (!detail.examples.length) {
        console.log('This grammar pattern has no examples.');
        continue;
      }
      const idValue = await ask('Example ID(s), comma-separated: ');
      const ids = parseIds(idValue);
      if (!ids) {
        console.log('Enter one or more valid numeric IDs.');
        continue;
      }
      const selected = detail.examples.filter((item) => ids.includes(item.id));
      if (selected.length !== ids.length) {
        console.log('One or more IDs do not belong to this grammar pattern.');
        continue;
      }
      await updateExamplesStatuses(selected);
    } else if (choice === '3') {
      if (!detail.questions.length) {
        console.log('This grammar pattern has no Quiz questions.');
        continue;
      }
      const idValue = await ask('Quiz question ID: ');
      const ids = parseIds(idValue);
      if (!ids || ids.length !== 1) {
        console.log('Enter one valid numeric ID.');
        continue;
      }
      if (!detail.questions.some((item) => item.id === ids[0])) {
        console.log('This Quiz question does not belong to the selected grammar pattern.');
        continue;
      }
      await manageQuestion(ids[0]);
    } else if (choice === '4') {
      await markGrammarForReview([patternId], 'grammar senses, connections or relations were edited');
    } else {
      console.log('Unknown selection.');
    }
  }
}

async function grammarPatternsMenu() {
  while (true) {
    const id = await choosePatternIds();
    if (id === null) return;
    if (id === undefined) continue;
    await managePattern(id);
  }
}

async function grammarExamplesMenu() {
  while (true) {
    const rows = await loadExamples();
    printTable(rows, [
      ['ID', 'id'], ['Grammar ID', 'grammar_id'], ['Grammar', 'grammar_pattern'],
      ['Japanese', 'japanese'], ['Translation (EN)', 'translation_en'],
      ['Tier', 'content_tier'], ['Editorial', 'editorial_review_status'],
      ['Parent publication', 'parent_publication_status'], ['Parent editorial', 'parent_editorial_review_status'],
      ['Parent tier', 'parent_content_tier'],
    ]);
    const value = await ask('\nExample ID(s), comma-separated (or Q to go back): ');
    if (value.toLowerCase() === 'q') return;
    const ids = parseIds(value);
    if (!ids) {
      console.log('Enter one or more valid numeric IDs.');
      continue;
    }
    const selected = await loadExamples({ ids });
    if (selected.length !== ids.length) {
      console.log('One or more example IDs were not found.');
      continue;
    }
    await updateExamplesStatuses(selected);
  }
}

async function quizQuestionsMenu() {
  while (true) {
    const rows = await loadQuizQuestions();
    printTable(rows, [
      ['ID', 'id'], ['Grammar ID', 'grammar_id'], ['Grammar', 'grammar_pattern'],
      ['Prompt', 'prompt'], ['Active', 'is_active'], ['Tier', 'content_tier'],
      ['Publication', 'publication_status'], ['Editorial', 'editorial_review_status'],
      ['Parent publication', 'parent_publication_status'], ['Parent editorial', 'parent_editorial_review_status'],
      ['Parent tier', 'parent_content_tier'],
    ]);
    const value = await ask('\nQuiz question ID(s), comma-separated (or Q to go back): ');
    if (value.toLowerCase() === 'q') return;
    const ids = parseIds(value);
    if (!ids) {
      console.log('Enter one or more valid numeric IDs.');
      continue;
    }
    const selected = await loadQuizQuestions({ ids });
    if (selected.length !== ids.length) {
      console.log('One or more Quiz question IDs were not found.');
      continue;
    }
    await updateQuizStatuses(selected);
  }
}

async function awaitingReviewMenu() {
  const patterns = await executeSql(`
    SELECT id, pattern, publication_status, content_tier
    FROM grammar_patterns WHERE editorial_review_status = 'ai_drafted'
    ORDER BY id
  `);
  const examples = await loadExamples({ pendingOnly: true });
  const questions = await loadQuizQuestions({ pendingOnly: true });

  console.log('\nGrammar patterns awaiting review');
  printTable(patterns, [
    ['ID', 'id'], ['Pattern', 'pattern'], ['Publication', 'publication_status'], ['Tier', 'content_tier'],
  ]);

  console.log('\nGrammar examples awaiting review');
  printTable(examples, [
    ['ID', 'id'], ['Grammar ID', 'grammar_id'], ['Grammar', 'grammar_pattern'],
    ['Japanese', 'japanese'], ['Tier', 'content_tier'],
  ]);

  console.log('\nQuiz questions awaiting review');
  printTable(questions, [
    ['ID', 'id'], ['Grammar ID', 'grammar_id'], ['Grammar', 'grammar_pattern'],
    ['Prompt', 'prompt'], ['Publication', 'publication_status'], ['Tier', 'content_tier'],
    ['Parent publication', 'parent_publication_status'], ['Parent editorial', 'parent_editorial_review_status'],
      ['Parent tier', 'parent_content_tier'],
  ]);

  console.log(`\nTotal awaiting review: ${patterns.length + examples.length + questions.length}`);
  await ask('\nPress Enter to return to the main menu...');
}

async function main() {
  console.log('\nKanotoba — Content Manager');
  console.log(`Database: ${isRemote ? 'REMOTE / PRODUCTION' : 'LOCAL'}`);

  if (isRemote) {
    console.log('\nProduction mode is protected. Type REMOTE to continue.');
    const confirmation = await ask('Confirmation: ');
    if (confirmation !== 'REMOTE') {
      console.log('Cancelled.');
      return;
    }
  }

  while (true) {
    console.log('\nMain menu');
    console.log('1. Grammar patterns');
    console.log('2. Grammar examples');
    console.log('3. Quiz questions');
    console.log('4. Content awaiting review');
    console.log('Q. Exit');

    const choice = (await ask('Select: ')).toLowerCase();
    try {
      if (choice === 'q') return;
      if (choice === '1') await grammarPatternsMenu();
      else if (choice === '2') await grammarExamplesMenu();
      else if (choice === '3') await quizQuestionsMenu();
      else if (choice === '4') await awaitingReviewMenu();
      else console.log('Unknown selection.');
    } catch (error) {
      console.error(`\nContent manager error: ${error.message}`);
    }
  }
}

try {
  await main();
} catch (error) {
  console.error(`\nContent manager failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  rl.close();
}
