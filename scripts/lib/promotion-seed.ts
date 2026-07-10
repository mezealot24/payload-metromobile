export const PROMOTION_BENEFIT_TYPES = [
  'early_price',
  'financing',
  'insurance_1y',
  'warranty_powertrain',
  'warranty_vehicle',
  'battery_warranty',
  'roadside_8y',
  'accessories_bundle',
  'accessory',
  'freebie',
  'cashback',
  'discount',
  'service',
  'special',
  'other',
] as const

export type PromotionBenefitType = (typeof PROMOTION_BENEFIT_TYPES)[number]

export type PromotionSeed = {
  title: string
  subtitle?: string
  description?: string
  detailUrl?: string
  campaignStatus: 'active' | 'upcoming' | 'expired'
  priority?: number
  startDate?: string
  endDate?: string
  modelSlug: string
  pricingOverrides: Array<{
    variantId: string
    variantName?: string
    promoPrice: number
    originalPrice?: number
    downPayment?: number
    interestRate?: number
  }>
  benefits: Array<{
    type: PromotionBenefitType
    title?: string
    description: string
    value?: string
    variantName?: string
    icon?: string
    sort?: number
  }>
  conditions: Array<{
    text: string
    sort?: number
  }>
  tags?: Array<{ text: string }>
  meta?: {
    title?: string
    description?: string
  }
  slug: string
  _status: 'draft' | 'published'
}

const BENEFIT_TYPE_SET = new Set<string>(PROMOTION_BENEFIT_TYPES)
const CAMPAIGN_STATUSES = new Set(['active', 'upcoming', 'expired'])
const DOCUMENT_STATUSES = new Set(['draft', 'published'])
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertRecord(value: unknown, path: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${path} must be an object`)
  }
}

function requireString(record: Record<string, unknown>, key: string, path: string): string {
  const value = record[key]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${path}.${key} must be a non-empty string`)
  }
  return value.trim()
}

function optionalString(record: Record<string, unknown>, key: string, path: string): string | undefined {
  const value = record[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${path}.${key} must be a non-empty string when provided`)
  }
  return value.trim()
}

function requireNumber(record: Record<string, unknown>, key: string, path: string): number {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${path}.${key} must be a finite number`)
  }
  return value
}

function optionalNumber(record: Record<string, unknown>, key: string, path: string): number | undefined {
  const value = record[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${path}.${key} must be a finite number when provided`)
  }
  return value
}

function parseIsoDate(value: string, path: string): number {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) {
    throw new Error(`${path} must be a valid ISO date`)
  }
  return parsed
}

function validatePricingOverrides(value: unknown, path: string): PromotionSeed['pricingOverrides'] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${path} must be a non-empty array`)
  }

  const variantIds = new Set<string>()

  return value.map((item, index) => {
    const itemPath = `${path}[${index}]`
    assertRecord(item, itemPath)

    const variantId = requireString(item, 'variantId', itemPath)
    if (!SLUG_PATTERN.test(variantId)) {
      throw new Error(`${itemPath}.variantId must use lowercase kebab-case`)
    }
    if (variantIds.has(variantId)) {
      throw new Error(`${path} has duplicate variantId: ${variantId}`)
    }
    variantIds.add(variantId)

    const promoPrice = requireNumber(item, 'promoPrice', itemPath)
    const originalPrice = optionalNumber(item, 'originalPrice', itemPath)
    const downPayment = optionalNumber(item, 'downPayment', itemPath)
    const interestRate = optionalNumber(item, 'interestRate', itemPath)

    if (promoPrice < 0) throw new Error(`${itemPath}.promoPrice must be >= 0`)
    if (originalPrice !== undefined && originalPrice < promoPrice) {
      throw new Error(`${itemPath}.originalPrice must be >= promoPrice`)
    }
    if (downPayment !== undefined && downPayment < 0) {
      throw new Error(`${itemPath}.downPayment must be >= 0`)
    }
    if (interestRate !== undefined && (interestRate < 0 || interestRate > 100)) {
      throw new Error(`${itemPath}.interestRate must be between 0 and 100`)
    }

    return {
      variantId,
      variantName: optionalString(item, 'variantName', itemPath),
      promoPrice,
      originalPrice,
      downPayment,
      interestRate,
    }
  })
}

function validateBenefits(value: unknown, path: string): PromotionSeed['benefits'] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${path} must be a non-empty array`)
  }

  return value.map((item, index) => {
    const itemPath = `${path}[${index}]`
    assertRecord(item, itemPath)

    if ('text' in item) {
      throw new Error(`${itemPath}.text is legacy schema; use description`)
    }

    const type = requireString(item, 'type', itemPath)
    if (!BENEFIT_TYPE_SET.has(type)) {
      throw new Error(`${itemPath}.type is not supported: ${type}`)
    }

    const sort = optionalNumber(item, 'sort', itemPath)
    if (sort !== undefined && sort < 0) {
      throw new Error(`${itemPath}.sort must be >= 0`)
    }

    return {
      type: type as PromotionBenefitType,
      title: optionalString(item, 'title', itemPath),
      description: requireString(item, 'description', itemPath),
      value: optionalString(item, 'value', itemPath),
      variantName: optionalString(item, 'variantName', itemPath),
      icon: optionalString(item, 'icon', itemPath),
      sort,
    }
  })
}

function validateConditions(value: unknown, path: string): PromotionSeed['conditions'] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${path} must be a non-empty array`)
  }

  return value.map((item, index) => {
    const itemPath = `${path}[${index}]`
    assertRecord(item, itemPath)

    const sort = optionalNumber(item, 'sort', itemPath)
    if (sort !== undefined && sort < 0) {
      throw new Error(`${itemPath}.sort must be >= 0`)
    }

    return {
      text: requireString(item, 'text', itemPath),
      sort,
    }
  })
}

function validateTags(value: unknown, path: string): PromotionSeed['tags'] {
  if (value === undefined || value === null) return undefined
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`)

  return value.map((item, index) => {
    const itemPath = `${path}[${index}]`
    assertRecord(item, itemPath)
    return { text: requireString(item, 'text', itemPath) }
  })
}

function validateMeta(value: unknown, path: string): PromotionSeed['meta'] {
  if (value === undefined || value === null) return undefined
  assertRecord(value, path)
  return {
    title: optionalString(value, 'title', path),
    description: optionalString(value, 'description', path),
  }
}

function validateOneSeed(
  value: unknown,
  index: number,
  allowedModelSlugs: ReadonlySet<string>,
): PromotionSeed {
  const path = `promotions[${index}]`
  assertRecord(value, path)

  if ('variants' in value) {
    throw new Error(`${path}.variants is legacy schema; use pricingOverrides`)
  }

  const title = requireString(value, 'title', path)
  const campaignStatus = requireString(value, 'campaignStatus', path)
  if (!CAMPAIGN_STATUSES.has(campaignStatus)) {
    throw new Error(`${path}.campaignStatus must be active, upcoming, or expired`)
  }

  const priority = optionalNumber(value, 'priority', path)
  if (priority !== undefined && priority < 0) {
    throw new Error(`${path}.priority must be >= 0`)
  }

  const startDate = optionalString(value, 'startDate', path)
  const endDate = optionalString(value, 'endDate', path)
  if ((startDate && !endDate) || (!startDate && endDate)) {
    throw new Error(`${path}.startDate and endDate must be provided together`)
  }
  if (startDate && endDate) {
    const start = parseIsoDate(startDate, `${path}.startDate`)
    const end = parseIsoDate(endDate, `${path}.endDate`)
    if (start >= end) throw new Error(`${path}.startDate must be before endDate`)
  }

  const modelSlug = requireString(value, 'modelSlug', path)
  if (!allowedModelSlugs.has(modelSlug)) {
    throw new Error(`${path}.modelSlug is not configured in BYD_MODEL_OPTIONS: ${modelSlug}`)
  }

  const slug = requireString(value, 'slug', path)
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(`${path}.slug must use lowercase kebab-case`)
  }

  const documentStatus = requireString(value, '_status', path)
  if (!DOCUMENT_STATUSES.has(documentStatus)) {
    throw new Error(`${path}._status must be draft or published`)
  }

  const detailUrl = optionalString(value, 'detailUrl', path)
  if (detailUrl && !detailUrl.startsWith('https://')) {
    throw new Error(`${path}.detailUrl must start with https://`)
  }

  return {
    title,
    subtitle: optionalString(value, 'subtitle', path),
    description: optionalString(value, 'description', path),
    detailUrl,
    campaignStatus: campaignStatus as PromotionSeed['campaignStatus'],
    priority,
    startDate,
    endDate,
    modelSlug,
    pricingOverrides: validatePricingOverrides(value.pricingOverrides, `${path}.pricingOverrides`),
    benefits: validateBenefits(value.benefits, `${path}.benefits`),
    conditions: validateConditions(value.conditions, `${path}.conditions`),
    tags: validateTags(value.tags, `${path}.tags`),
    meta: validateMeta(value.meta, `${path}.meta`),
    slug,
    _status: documentStatus as PromotionSeed['_status'],
  }
}

export function validatePromotionSeeds(
  value: unknown,
  allowedModelSlugs: ReadonlySet<string>,
): PromotionSeed[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Promotion seed file must contain a non-empty array')
  }

  const seeds = value.map((seed, index) => validateOneSeed(seed, index, allowedModelSlugs))
  const slugs = new Set<string>()

  for (const seed of seeds) {
    if (slugs.has(seed.slug)) {
      throw new Error(`Promotion seed file has duplicate slug: ${seed.slug}`)
    }
    slugs.add(seed.slug)
  }

  return seeds
}
