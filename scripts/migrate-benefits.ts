/**
 * One-off migration script to convert legacy benefits format to new structured format
 *
 * Run via: npx tsx scripts/migrate-benefits.ts
 *
 * Before running:
 * 1. Backup your database
 * 2. Ensure PAYLOAD_SECRET and DATABASE_URI are set in .env
 *
 * What this script does:
 * - Finds all promotions with legacy benefits format (text field only, no description)
 * - Converts { text } to { type: 'other', description: text, sort: index }
 * - Updates the documents without triggering revalidation
 */

import { getPayload } from 'payload'
import config from '../src/payload.config'

interface LegacyBenefit {
  text?: string
  description?: string
  type?: string
  value?: string
  sort?: number
}

interface LegacyCondition {
  text?: string
  sort?: number
}

async function migrate() {
  console.log('Starting migration...')

  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'promotions',
    limit: 100,
    depth: 0,
  })

  console.log(`Found ${docs.length} promotions to check`)

  let migratedCount = 0

  for (const doc of docs) {
    const benefits = (doc.benefits ?? []) as LegacyBenefit[]
    const conditions = (doc.conditions ?? []) as LegacyCondition[]

    // Check if benefits need migration (has 'text' but no 'description')
    const benefitsNeedMigration = benefits.some(
      (b) => 'text' in b && b.text && !b.description,
    )

    // Check if conditions need sort field
    const conditionsNeedMigration = conditions.some((c) => c.sort === undefined)

    if (!benefitsNeedMigration && !conditionsNeedMigration) {
      console.log(`Skipping ${doc.title} - already migrated`)
      continue
    }

    // Migrate benefits
    const updatedBenefits = benefits.map((b, i) => ({
      type: b.type ?? 'other',
      description: b.description ?? b.text ?? '',
      value: b.value,
      sort: b.sort ?? i + 1,
    }))

    // Migrate conditions (add sort if missing)
    const updatedConditions = conditions.map((c, i) => ({
      text: c.text ?? '',
      sort: c.sort ?? i + 1,
    }))

    try {
      await payload.update({
        collection: 'promotions',
        id: doc.id,
        data: {
          benefits: updatedBenefits,
          conditions: updatedConditions,
        },
        context: { disableRevalidate: true },
      })

      console.log(`✅ Migrated: ${doc.title}`)
      migratedCount++
    } catch (error) {
      console.error(`❌ Failed to migrate ${doc.title}:`, error)
    }
  }

  console.log(`\nMigration complete! Migrated ${migratedCount} promotions.`)
  process.exit(0)
}

migrate().catch((error) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
