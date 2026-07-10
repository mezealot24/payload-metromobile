import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

import { BYD_MODEL_OPTIONS } from '../src/constants/bydModels'
import {
  type PromotionSeed,
  validatePromotionSeeds,
} from './lib/promotion-seed'
import {
  buildPromotionUpdateData,
  hasManagedPromotionChanges,
  type PromotionDocument,
} from './lib/promotion-upsert'

const DEFAULT_FILE = 'scripts/data/promotions-jul-2026.ts'

type CliOptions = {
  apply: boolean
  file: string
}

type UpsertSummary = {
  created: number
  updated: number
  skipped: number
}

function printHelp(): void {
  console.log(`Usage: pnpm exec tsx scripts/upsert-promotions.ts [options]

Options:
  --file <path>  Promotion seed file (.ts or .json; default: ${DEFAULT_FILE})
  --apply        Write changes through the Payload Local API
  --help         Show this help

Without --apply, the command validates the seed data and prints a dry-run only.`)
}

function parseArgs(argv: string[]): CliOptions {
  let apply = false
  let file = DEFAULT_FILE

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--apply') {
      apply = true
      continue
    }

    if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }

    if (arg === '--file') {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) {
        throw new Error('--file requires a path')
      }
      file = value
      index += 1
      continue
    }

    if (arg.startsWith('--file=')) {
      const value = arg.slice('--file='.length)
      if (!value) throw new Error('--file requires a path')
      file = value
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return { apply, file }
}

async function readSeeds(file: string): Promise<PromotionSeed[]> {
  const absolutePath = path.resolve(process.cwd(), file)
  let parsed: unknown

  if (path.extname(absolutePath).toLowerCase() === '.json') {
    const raw = await readFile(absolutePath, 'utf8')
    try {
      parsed = JSON.parse(raw)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      throw new Error(`Invalid JSON in ${file}: ${detail}`)
    }
  } else {
    const module = await import(pathToFileURL(absolutePath).href)
    parsed = module.default ?? module.PROMOTIONS
  }

  const allowedModelSlugs = new Set(BYD_MODEL_OPTIONS.map((model) => model.value))
  return validatePromotionSeeds(parsed, allowedModelSlugs)
}

function printSeedPlan(seeds: PromotionSeed[], file: string): void {
  console.log(`[promotion-seed] Validated ${seeds.length} promotions from ${file}`)
  for (const seed of seeds) {
    console.log(
      `  - ${seed.slug}: ${seed.pricingOverrides.length} price variants, ${seed.benefits.length} benefits, ${seed.conditions.length} conditions`,
    )
  }
}

async function applySeeds(seeds: PromotionSeed[]): Promise<UpsertSummary> {
  const [{ getPayload }, { default: config }] = await Promise.all([
    import('payload'),
    import('../src/payload.config'),
  ])
  const payload = await getPayload({ config })
  const summary: UpsertSummary = { created: 0, updated: 0, skipped: 0 }
  const existingBySlug = new Map<string, PromotionDocument | undefined>()

  // Complete duplicate checks before the first write so a bad slug cannot leave a half-applied batch.
  for (const seed of seeds) {
    const result = await payload.find({
      collection: 'promotions',
      where: { slug: { equals: seed.slug } },
      limit: 2,
      depth: 0,
      draft: true,
      overrideAccess: true,
    })

    if (result.totalDocs > 1) {
      throw new Error(`Refusing to upsert ${seed.slug}: found ${result.totalDocs} documents with this slug`)
    }

    existingBySlug.set(
      seed.slug,
      result.docs[0] as unknown as PromotionDocument | undefined,
    )
  }

  for (const seed of seeds) {
    const existing = existingBySlug.get(seed.slug)

    if (!existing) {
      await payload.create({
        collection: 'promotions',
        data: seed as never,
        draft: false,
        overrideAccess: true,
      })
      summary.created += 1
      console.log(`[create] ${seed.slug}`)
      continue
    }

    if (!hasManagedPromotionChanges(existing, seed)) {
      summary.skipped += 1
      console.log(`[skip]   ${seed.slug} (unchanged)`)
      continue
    }

    await payload.update({
      collection: 'promotions',
      id: existing.id,
      data: buildPromotionUpdateData(seed, existing) as never,
      draft: false,
      overrideAccess: true,
    })
    summary.updated += 1
    console.log(`[update] ${seed.slug}`)
  }

  return summary
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))
  const seeds = await readSeeds(options.file)
  printSeedPlan(seeds, options.file)

  if (!options.apply) {
    console.log('[promotion-seed] Dry-run complete. Re-run with --apply to write through the Local API.')
    return
  }

  console.log('[promotion-seed] Applying through the Payload Local API...')
  const summary = await applySeeds(seeds)
  console.log(
    `[promotion-seed] Complete: ${summary.created} created, ${summary.updated} updated, ${summary.skipped} unchanged`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[promotion-seed] Failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
