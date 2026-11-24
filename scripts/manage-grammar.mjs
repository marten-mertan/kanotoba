import { spawn } from 'node:child_process'
import { unlink, writeFile } from 'node:fs/promises'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const wranglerScript = resolve(root, 'scripts/wrangler.mjs')
const args = new Set(process.argv.slice(2))
let sqlFileSequence = 0

const isLocal = args.has('--local')
const isRemote = args.has('--remote')

if (isLocal === isRemote) {
  console.error('Specify exactly one database target: --local or --remote.')
  console.error('Usage: npm run grammar:manage [-- --remote]')
  process.exit(2)
}

if (!stdin.isTTY || !stdout.isTTY) {
  console.error('This command requires an interactive terminal.')
  process.exit(2)
}

const target = isRemote ? 'remote' : 'local'
const readline = createInterface({ input: stdin, output: stdout })

const editorialStatuses = [
  { value: 'ai_drafted', label: 'AI drafted — not yet reviewed' },
  { value: 'editorially_reviewed', label: 'Editorially reviewed' },
  { value: 'native_reviewed', label: 'Reviewed by a native speaker' },
]

const publicationStatuses = [
  { value: 'draft', label: 'Draft — not public' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived — hidden from public and preview lists' },
]

function ask(question) {
  return readline.question(question)
}

function parseIds(input) {
  const parts = input.split(',').map(part => part.trim()).filter(Boolean)
  if (parts.length === 0) return null

  const ids = parts.map(part => Number(part))
  if (ids.some(id => !Number.isSafeInteger(id) || id <= 0)) {
    throw new Error('Enter positive numeric IDs separated by commas.')
  }

  return [...new Set(ids)]
}

function extractRows(output) {
  let payload
  try {
    payload = JSON.parse(output)
  } catch {
    throw new Error('Wrangler did not return valid JSON. Check the Wrangler output above.')
  }

  // `wrangler d1 execute --json` returns an array of query results.
  const results = Array.isArray(payload)
    ? payload.find(entry => entry && Array.isArray(entry.results))?.results
    : Array.isArray(payload?.results)
      ? payload.results
      : null

  if (!results) {
    throw new Error('Unexpected Wrangler JSON response: the query results array was not found.')
  }

  return results
}

async function runWrangler(sql) {
  // Pass SQL through a file rather than --command. The project Wrangler wrapper
  // invokes npx.cmd through a Windows shell, which can split/alter multiline SQL
  // arguments containing quotes, semicolons, or parentheses.
  const sqlFileName = `.kanotoba-grammar-manager-${process.pid}-${++sqlFileSequence}.sql`
  const sqlFilePath = resolve(root, sqlFileName)

  await writeFile(sqlFilePath, sql, { encoding: 'utf8', flag: 'wx' })

  try {
    return await new Promise((resolveOutput, reject) => {
      const wranglerArgs = [
        wranglerScript,
        'd1',
        'execute',
        'kanotoba-db',
        isRemote ? '--remote' : '--local',
        `--file=${sqlFileName}`,
        '--json',
      ]

      const child = spawn(process.execPath, wranglerArgs, {
        cwd: root,
        stdio: ['ignore', 'pipe', 'inherit'],
        windowsHide: true,
      })

      let output = ''
      child.stdout.setEncoding('utf8')
      child.stdout.on('data', chunk => { output += chunk })
      child.once('error', reject)
      child.once('exit', (code, signal) => {
        if (signal) {
          reject(new Error(`Wrangler exited due to signal ${signal}.`))
        } else if (code !== 0) {
          reject(new Error(`Wrangler exited with code ${code ?? 1}.`))
        } else {
          resolveOutput(output)
        }
      })
    })
  } finally {
    await unlink(sqlFilePath).catch(() => {})
  }
}

async function queryGrammar() {
  const sql = `
    SELECT
      id,
      slug,
      pattern,
      jlpt_level,
      content_tier,
      editorial_review_status,
      publication_status
    FROM grammar_patterns
    ORDER BY COALESCE(learning_priority, 9999), id
  `

  return extractRows(await runWrangler(sql))
}

function printGrammar(items) {
  if (items.length === 0) {
    console.log('\nNo grammar records found.')
    return
  }

  console.log(`\nGrammar records (${items.length}) — ${target.toUpperCase()} database\n`)
  console.table(items.map(item => ({
    ID: item.id,
    Pattern: item.pattern,
    JLPT: item.jlpt_level,
    Review: item.editorial_review_status,
    Publication: item.publication_status,
  })))
}

function printOptions(title, options) {
  console.log(`\n${title}`)
  options.forEach((option, index) => {
    console.log(`  ${index + 1}. ${option.value} — ${option.label}`)
  })
  console.log('  Enter. Keep the current value')
}

async function chooseStatus(title, options) {
  printOptions(title, options)
  const answer = (await ask('Choose: ')).trim()
  if (!answer) return null

  const index = Number(answer) - 1
  if (!Number.isInteger(index) || index < 0 || index >= options.length) {
    throw new Error('Invalid choice.')
  }

  return options[index].value
}

function statusLabel(options, value) {
  return options.find(option => option.value === value)?.label ?? value
}

function sqlString(value) {
  // Only fixed allow-listed status values are passed here.
  return `'${value.replaceAll("'", "''")}'`
}

async function updateRecords(selectedItems, nextEditorialStatus, nextPublicationStatus) {
  const ids = selectedItems.map(item => item.id)
  const assignments = []

  if (nextEditorialStatus) {
    assignments.push(`editorial_review_status = ${sqlString(nextEditorialStatus)}`)
  }

  if (nextPublicationStatus) {
    assignments.push(`publication_status = ${sqlString(nextPublicationStatus)}`)
  }

  if (assignments.length === 0) {
    console.log('\nNothing to update.')
    return
  }

  const sql = `
    UPDATE grammar_patterns
    SET ${assignments.join(', ')}
    WHERE id IN (${ids.join(', ')})
  `

  await runWrangler(sql)
}

async function main() {
  console.log('\nKanotoba — Grammar content manager')
  console.log(`Database: ${target.toUpperCase()}\n`)

  if (isRemote) {
    console.log('WARNING: You are connected to the REMOTE database.')
    const confirmation = (await ask('Type REMOTE to continue: ')).trim()
    if (confirmation !== 'REMOTE') {
      console.log('Cancelled.')
      return
    }
  }

  let items = await queryGrammar()

  while (true) {
    printGrammar(items)
    const input = (await ask('\nEnter record ID(s), separated by commas. [r] Refresh, [q] Quit: ')).trim()

    if (input.toLowerCase() === 'q') break
    if (input.toLowerCase() === 'r') {
      items = await queryGrammar()
      continue
    }
    if (!input) continue

    let ids
    try {
      ids = parseIds(input)
    } catch (error) {
      console.error(`\n${error.message}`)
      continue
    }

    const selectedItems = items.filter(item => ids.includes(item.id))
    const missingIds = ids.filter(id => !selectedItems.some(item => item.id === id))

    if (missingIds.length > 0) {
      console.error(`\nRecord ID(s) not found: ${missingIds.join(', ')}`)
      continue
    }

    console.log('\nSelected records:')
    console.table(selectedItems.map(item => ({
      ID: item.id,
      Pattern: item.pattern,
      Review: item.editorial_review_status,
      Publication: item.publication_status,
      Tier: item.content_tier,
    })))

    try {
      const nextEditorialStatus = await chooseStatus(
        'Editorial review status',
        editorialStatuses,
      )
      const nextPublicationStatus = await chooseStatus(
        'Publication status',
        publicationStatuses,
      )

      if (!nextEditorialStatus && !nextPublicationStatus) {
        console.log('\nNothing to update.')
        continue
      }

      const plannedEditorialStatus = nextEditorialStatus
      const plannedPublicationStatus = nextPublicationStatus

      // A published entry must have passed at least editorial review.
      for (const item of selectedItems) {
        const resultingEditorialStatus = plannedEditorialStatus ?? item.editorial_review_status
        const resultingPublicationStatus = plannedPublicationStatus ?? item.publication_status

        if (
          resultingPublicationStatus === 'published'
          && resultingEditorialStatus === 'ai_drafted'
        ) {
          throw new Error(
            `Cannot publish "${item.pattern}" while its editorial status is ai_drafted. `
            + 'Set it to editorially_reviewed or native_reviewed first.',
          )
        }
      }

      const changedItems = selectedItems.filter(item => (
        (nextEditorialStatus && nextEditorialStatus !== item.editorial_review_status)
        || (nextPublicationStatus && nextPublicationStatus !== item.publication_status)
      ))

      if (changedItems.length === 0) {
        console.log('\nAll selected records already have these statuses. Nothing to update.')
        continue
      }

      console.log('\nChanges to apply:')
      for (const item of selectedItems) {
        const changes = []
        if (nextEditorialStatus && nextEditorialStatus !== item.editorial_review_status) {
          changes.push(
            `review: ${item.editorial_review_status} → ${nextEditorialStatus}`,
          )
        }
        if (nextPublicationStatus && nextPublicationStatus !== item.publication_status) {
          changes.push(
            `publication: ${item.publication_status} → ${nextPublicationStatus}`,
          )
        }
        console.log(`  #${item.id} ${item.pattern}: ${changes.length ? changes.join('; ') : 'no changes'}`)
      }

      if (nextPublicationStatus === 'archived') {
        console.log('\nWARNING: Archiving hides these records from public and preview grammar lists.')
      }

      if (nextPublicationStatus === 'published' && selectedItems.some(item => item.content_tier !== 'free')) {
        console.log('\nNOTE: The public grammar endpoint currently returns only free content. Other tiers will remain hidden there.')
      }

      if (
        nextEditorialStatus === 'ai_drafted'
        && selectedItems.some(item => (nextPublicationStatus ?? item.publication_status) === 'published')
      ) {
        console.log('\nNOTE: Records marked ai_drafted are excluded from the public grammar endpoint, even when publication_status is published.')
      }

      const confirmationText = isRemote ? 'Type YES to apply changes to REMOTE: ' : 'Apply these changes? [y/N]: '
      const confirmation = (await ask(`\n${confirmationText}`)).trim()
      const confirmed = isRemote ? confirmation === 'YES' : ['y', 'yes'].includes(confirmation.toLowerCase())

      if (!confirmed) {
        console.log('Cancelled.')
        continue
      }

      await updateRecords(changedItems, nextEditorialStatus, nextPublicationStatus)
      console.log('\nChanges saved.')
      items = await queryGrammar()
    } catch (error) {
      console.error(`\n${error.message}`)
    }
  }
}

try {
  await main()
} catch (error) {
  console.error(`\nGrammar manager failed: ${error.message}`)
  process.exitCode = 1
} finally {
  readline.close()
}
