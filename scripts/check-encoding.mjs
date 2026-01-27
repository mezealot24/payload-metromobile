import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { TextDecoder } from 'node:util'

const argv = process.argv.slice(2)
const reportIndex = argv.indexOf('--report')
const reportPath = reportIndex !== -1 ? argv[reportIndex + 1] : null

if (reportIndex !== -1 && !reportPath) {
  throw new Error('Missing path after --report')
}

const decoder = new TextDecoder('utf-8', { fatal: true })

const root = process.cwd()
const fileList = execSync('git ls-files -z', { encoding: 'buffer' })
  .toString('utf8')
  .split('\u0000')
  .filter(Boolean)

const invalidUtf8 = []
const containsReplacement = []
const binaryFiles = []

for (const relativePath of fileList) {
  const fullPath = path.join(root, relativePath)
  const buffer = fs.readFileSync(fullPath)
  if (buffer.includes(0)) {
    binaryFiles.push(relativePath)
    continue
  }

  let text
  try {
    text = decoder.decode(buffer)
  } catch {
    invalidUtf8.push(relativePath)
    continue
  }

  if (text.includes('\uFFFD')) {
    containsReplacement.push(relativePath)
  }
}

const summary = {
  totalFiles: fileList.length,
  invalidUtf8: invalidUtf8.length,
  replacementCharacters: containsReplacement.length,
  binaryFiles: binaryFiles.length,
}

const reportLines = [
  '# Encoding scan report',
  '',
  `Scanned ${summary.totalFiles} tracked files.`,
  '',
  '## Summary',
  '',
  `- Invalid UTF-8 files: ${summary.invalidUtf8}`,
  `- Files containing U+FFFD replacement characters: ${summary.replacementCharacters}`,
  `- Binary files skipped: ${summary.binaryFiles}`,
]

const formatSection = (title, items) => [
  '',
  `## ${title}`,
  '',
  ...(items.length
    ? items.map((item) => `- ${item}`)
    : ['- None found']),
]

reportLines.push(...formatSection('Invalid UTF-8 files', invalidUtf8))
reportLines.push(
  ...formatSection('Files with U+FFFD replacement characters', containsReplacement),
)
reportLines.push(...formatSection('Binary files skipped', binaryFiles))
reportLines.push('')

const reportContent = reportLines.join('\n')

if (reportPath) {
  fs.writeFileSync(path.resolve(root, reportPath), reportContent)
} else {
  process.stdout.write(reportContent)
}
