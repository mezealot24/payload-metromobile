import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { getPayload } from 'payload'

import { CANONICAL_BYD_MODEL_SLUGS } from '../src/constants/bydModels'
import config from '../src/payload.config'
import {
  PromotionImportValidationError,
  type PromotionImportRecord,
  validatePromotionBatch,
} from './lib/promotion-import'

type CliOptions = {
  apply: boolean
  file: string
  publish: boolean
}

const DEFAULT_FILE = path.resolve(process.cwd(), 'scripts/data/promotions-jul-2026.json')

function printHelp(): void {
  console.log(`Usage: tsx scripts/upsert-promotions.ts [options]

Options:
  --file <path>  Promotion JSON file (default: scripts/data/promotions-jul-2026.json)
  --apply        Write validated records to Payload as drafts
  --publish      Publish records (requires --apply)
  --help         Show this help

Without --apply the command only validates and prints the upsert plan.`)
}

function parseArgs(args: string[]): CliOptions {
  let file = DEFAULT_FILE
  let apply = false
  let publish = false

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--help') {
      printHelp()
      process.exit(0)
    }
    if (argument === '--apply') {
      apply = true
      continue
    }
    if (argument === '--publish') {
      publish = true
      continue
    }
    if (argument === '--file') {
      const nextValue = args[index + 1]
      if (!nextValue || nextValue.startsWith('--')) {
        throw new Error('--file requires a path')
      }
      file = path.resolve(process.cwd(), nextValue)
      index += 1
      continue
    }
    throw new Error(`Unknown argument: ${argument}`)
  }

  if (publish && !apply) {
    throw new Error('--publish requires --apply')
  }

  return { apply, file, publish }
}

async function loadPromotions(file: string): Promise<PromotionImportRecord[]> {
  let raw: unknown
  try {
    raw = JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Unable to read promotion JSON at ${file}: ${message}`)
  }

  return validatePromotionBatch(raw, CANONICAL_BYD_MODEL_SLUGS)
}

function printPlan(promotions: PromotionImportRecord[], options: CliOptions): void {
  const mode = !options.apply ? 'DRY RUN' : options.publish ? 'PUBLISH' : 'DRAFT'
  console.log(`\nPromotion import mode: ${mode}`)
  console.log(`Source file: ${options.file}`)
  console.table(
    promotions.map((promotion) => ({
      slug: promotion.slug,
      model: promotion.modelSlug,
      variants: promotion.pricingOverrides.length,
      start: promotion.startDate.slice(0, 10),
      end: promotion.endDate.slice(0, 10),
    })),
  )
}

async function upsertPromotions(
  promotions: PromotionImportRecord[],
  publish: boolean,
): Promise<void> {
  const payload = await getPayload({ config })
  let created = 0
  let updated = 0

  for (const promotion of promotions) {
    const existing = await payload.find({
      collection: 'promotions',
      where: { slug: { equals: promotion.slug } },
      limit: 2,
      depth: 0,
      draft: true,
      overrideAccess: true,
    })

    if (existing.totalDocs > 1) {
      throw new Error(`Duplicate promotion documents found for slug: ${promotion.slug}`)
    }

    // The validator returns only supported promotion fields. In particular it strips
    // heroMedia and gallery, so updates preserve images already selected in Admin.
    const data = {
      ...promotion,
      _status: publish ? 'published' : 'draft',
    } as any

    if (existing.totalDocs === 1) {
      await payload.update({
        collection: 'promotions',
        id: existing.docs[0].id,
        data,
        depth: 0,
        draft: !publish,
        overrideAccess: true,
      })
      updated += 1
      console.log(`Updated ${publish ? 'published' : 'draft'}: ${promotion.slug}`)
      continue
    }

    await payload.create({
      collection: 'promotions',
      data,
      depth: 0,
      draft: !publish,
      overrideAccess: true,
    })
    created += 1
    console.log(`Created ${publish ? 'published' : 'draft'}: ${promotion.slug}`)
  }

  console.log(`\nImport complete: ${created} created, ${updated} updated.`)
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2))
  const promotions = await loadPromotions(options.file)
  printPlan(promotions, options)

  if (!options.apply) {
    console.log('\nValidation passed. Re-run with --apply to save drafts.')
    return
  }

  await upsertPromotions(promotions, options.publish)
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    if (error instanceof PromotionImportValidationError) {
      console.error(error.message)
    } else {
      console.error(error instanceof Error ? error.message : error)
    }
    process.exit(1)
  })
