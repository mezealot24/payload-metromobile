import type { PromotionSeed } from './promotion-seed'

const MANAGED_FIELDS = [
  'title',
  'subtitle',
  'description',
  'detailUrl',
  'campaignStatus',
  'priority',
  'startDate',
  'endDate',
  'modelSlug',
  'pricingOverrides',
  'benefits',
  'conditions',
  'tags',
  'meta',
  'slug',
  '_status',
] as const

export type PromotionDocument = Record<string, unknown> & {
  id: number | string
  meta?: Record<string, unknown> | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeForComparison(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeForComparison)
  }

  if (!isRecord(value)) return value

  const normalized: Record<string, unknown> = {}

  for (const key of Object.keys(value).sort()) {
    if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue

    const child = value[key]
    if (child === undefined || child === null) continue

    normalized[key] = normalizeForComparison(child)
  }

  return normalized
}

function selectManagedFields(value: Record<string, unknown>): Record<string, unknown> {
  const selected: Record<string, unknown> = {}

  for (const field of MANAGED_FIELDS) {
    if (field === 'meta') {
      const meta = value.meta
      if (isRecord(meta)) {
        selected.meta = {
          title: meta.title,
          description: meta.description,
        }
      }
      continue
    }

    selected[field] = value[field]
  }

  return selected
}

export function hasManagedPromotionChanges(
  existing: Record<string, unknown>,
  incoming: PromotionSeed,
): boolean {
  const current = normalizeForComparison(selectManagedFields(existing))
  const next = normalizeForComparison(
    selectManagedFields(incoming as unknown as Record<string, unknown>),
  )

  return JSON.stringify(current) !== JSON.stringify(next)
}

export function buildPromotionUpdateData(
  seed: PromotionSeed,
  existing: PromotionDocument,
): Record<string, unknown> {
  if (!seed.meta) return seed as unknown as Record<string, unknown>

  const existingMeta = isRecord(existing.meta) ? existing.meta : {}

  return {
    ...seed,
    meta: {
      ...existingMeta,
      ...seed.meta,
    },
  }
}
