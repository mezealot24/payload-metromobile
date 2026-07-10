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
export type PromotionCampaignStatus = 'active' | 'upcoming' | 'expired'

export interface PromotionPricingOverride {
  variantId: string
  variantName?: string
  promoPrice: number
  originalPrice?: number
  downPayment?: number
  interestRate?: number
}

export interface PromotionBenefit {
  type: PromotionBenefitType
  title?: string
  description: string
  value?: string
  variantName?: string
  icon?: string
  sort?: number
}

export interface PromotionCondition {
  text: string
  sort?: number
}

export interface PromotionImportRecord {
  title: string
  subtitle?: string
  description?: string
  detailUrl: string
  campaignStatus: PromotionCampaignStatus
  priority?: number
  startDate: string
  endDate: string
  modelSlug: string
  pricingOverrides: PromotionPricingOverride[]
  benefits: PromotionBenefit[]
  conditions: PromotionCondition[]
  tags?: Array<{ text: string }>
  meta?: {
    title?: string
    description?: string
  }
  slug: string
}

export class PromotionImportValidationError extends Error {
  readonly errors: string[]

  constructor(errors: string[]) {
    super(`Promotion import validation failed:\n- ${errors.join('\n- ')}`)
    this.name = 'PromotionImportValidationError'
    this.errors = errors
  }
}

type UnknownRecord = Record<string, unknown>

const CAMPAIGN_STATUSES = new Set<PromotionCampaignStatus>(['active', 'upcoming', 'expired'])
const BENEFIT_TYPES = new Set<string>(PROMOTION_BENEFIT_TYPES)
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requiredString(
  record: UnknownRecord,
  key: string,
  path: string,
  errors: string[],
): string {
  const value = record[key]
  if (typeof value !== 'string' || value.trim().length === 0) {
    errors.push(`${path}.${key} must be a non-empty string`)
    return ''
  }
  return value.trim()
}

function optionalString(
  record: UnknownRecord,
  key: string,
  path: string,
  errors: string[],
): string | undefined {
  const value = record[key]
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') {
    errors.push(`${path}.${key} must be a string when provided`)
    return undefined
  }
  return value.trim() || undefined
}

function optionalNumber(
  record: UnknownRecord,
  key: string,
  path: string,
  errors: string[],
  options: { min?: number; integer?: boolean } = {},
): number | undefined {
  const value = record[key]
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    errors.push(`${path}.${key} must be a finite number when provided`)
    return undefined
  }
  if (options.min !== undefined && value < options.min) {
    errors.push(`${path}.${key} must be greater than or equal to ${options.min}`)
  }
  if (options.integer && !Number.isInteger(value)) {
    errors.push(`${path}.${key} must be an integer`)
  }
  return value
}

function requiredPositiveNumber(
  record: UnknownRecord,
  key: string,
  path: string,
  errors: string[],
): number {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    errors.push(`${path}.${key} must be a positive finite number`)
    return 0
  }
  return value
}

function validateDate(value: string, path: string, errors: string[]): number {
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) {
    errors.push(`${path} must be a valid ISO date`)
  }
  return timestamp
}

function validatePricingOverrides(
  value: unknown,
  path: string,
  errors: string[],
): PromotionPricingOverride[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${path} must be a non-empty array`)
    return []
  }

  const variantIds = new Set<string>()
  return value.flatMap((item, index) => {
    const itemPath = `${path}[${index}]`
    if (!isRecord(item)) {
      errors.push(`${itemPath} must be an object`)
      return []
    }

    const variantId = requiredString(item, 'variantId', itemPath, errors)
    if (variantId && variantIds.has(variantId)) {
      errors.push(`${itemPath}.variantId is duplicated: ${variantId}`)
    }
    variantIds.add(variantId)

    const promoPrice = requiredPositiveNumber(item, 'promoPrice', itemPath, errors)
    const originalPrice = optionalNumber(item, 'originalPrice', itemPath, errors, { min: 0 })
    const downPayment = optionalNumber(item, 'downPayment', itemPath, errors, { min: 0 })
    const interestRate = optionalNumber(item, 'interestRate', itemPath, errors, { min: 0 })
    const variantName = optionalString(item, 'variantName', itemPath, errors)

    if (originalPrice !== undefined && promoPrice > 0 && originalPrice < promoPrice) {
      errors.push(`${itemPath}.originalPrice must be greater than or equal to promoPrice`)
    }

    return [
      {
        variantId,
        ...(variantName ? { variantName } : {}),
        promoPrice,
        ...(originalPrice !== undefined ? { originalPrice } : {}),
        ...(downPayment !== undefined ? { downPayment } : {}),
        ...(interestRate !== undefined ? { interestRate } : {}),
      },
    ]
  })
}

function validateBenefits(value: unknown, path: string, errors: string[]): PromotionBenefit[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${path} must be a non-empty array`)
    return []
  }

  return value.flatMap((item, index) => {
    const itemPath = `${path}[${index}]`
    if (!isRecord(item)) {
      errors.push(`${itemPath} must be an object`)
      return []
    }

    const type = requiredString(item, 'type', itemPath, errors)
    if (type && !BENEFIT_TYPES.has(type)) {
      errors.push(`${itemPath}.type is unsupported: ${type}`)
    }

    const description = requiredString(item, 'description', itemPath, errors)
    const title = optionalString(item, 'title', itemPath, errors)
    const valueText = optionalString(item, 'value', itemPath, errors)
    const variantName = optionalString(item, 'variantName', itemPath, errors)
    const icon = optionalString(item, 'icon', itemPath, errors)
    const sort = optionalNumber(item, 'sort', itemPath, errors, { min: 0 })

    return [
      {
        type: (BENEFIT_TYPES.has(type) ? type : 'other') as PromotionBenefitType,
        ...(title ? { title } : {}),
        description,
        ...(valueText ? { value: valueText } : {}),
        ...(variantName ? { variantName } : {}),
        ...(icon ? { icon } : {}),
        ...(sort !== undefined ? { sort } : {}),
      },
    ]
  })
}

function validateConditions(value: unknown, path: string, errors: string[]): PromotionCondition[] {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${path} must be a non-empty array`)
    return []
  }

  return value.flatMap((item, index) => {
    const itemPath = `${path}[${index}]`
    if (!isRecord(item)) {
      errors.push(`${itemPath} must be an object`)
      return []
    }

    const text = requiredString(item, 'text', itemPath, errors)
    const sort = optionalNumber(item, 'sort', itemPath, errors, { min: 0 })
    return [{ text, ...(sort !== undefined ? { sort } : {}) }]
  })
}

function validateTags(
  value: unknown,
  path: string,
  errors: string[],
): Array<{ text: string }> | undefined {
  if (value === undefined || value === null) return undefined
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array when provided`)
    return undefined
  }

  return value.flatMap((item, index) => {
    const itemPath = `${path}[${index}]`
    if (!isRecord(item)) {
      errors.push(`${itemPath} must be an object`)
      return []
    }
    return [{ text: requiredString(item, 'text', itemPath, errors) }]
  })
}

function validateMeta(
  value: unknown,
  path: string,
  errors: string[],
): PromotionImportRecord['meta'] | undefined {
  if (value === undefined || value === null) return undefined
  if (!isRecord(value)) {
    errors.push(`${path} must be an object when provided`)
    return undefined
  }

  const title = optionalString(value, 'title', path, errors)
  const description = optionalString(value, 'description', path, errors)
  if (!title && !description) return undefined
  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
  }
}

function validateRecord(
  raw: unknown,
  index: number,
  supportedModelSlugs: ReadonlySet<string>,
  errors: string[],
): PromotionImportRecord | null {
  const path = `promotions[${index}]`
  if (!isRecord(raw)) {
    errors.push(`${path} must be an object`)
    return null
  }

  if ('variants' in raw) {
    errors.push(`${path} uses legacy field "variants"; use pricingOverrides instead`)
  }

  const title = requiredString(raw, 'title', path, errors)
  const subtitle = optionalString(raw, 'subtitle', path, errors)
  const description = optionalString(raw, 'description', path, errors)
  const detailUrl = requiredString(raw, 'detailUrl', path, errors)
  const campaignStatusRaw = requiredString(raw, 'campaignStatus', path, errors)
  const startDate = requiredString(raw, 'startDate', path, errors)
  const endDate = requiredString(raw, 'endDate', path, errors)
  const modelSlug = requiredString(raw, 'modelSlug', path, errors)
  const slug = requiredString(raw, 'slug', path, errors)
  const priority = optionalNumber(raw, 'priority', path, errors, { min: 0, integer: true })

  if (detailUrl) {
    try {
      const url = new URL(detailUrl)
      if (url.protocol !== 'https:') errors.push(`${path}.detailUrl must use https`)
    } catch {
      errors.push(`${path}.detailUrl must be a valid URL`)
    }
  }

  if (campaignStatusRaw && !CAMPAIGN_STATUSES.has(campaignStatusRaw as PromotionCampaignStatus)) {
    errors.push(`${path}.campaignStatus is unsupported: ${campaignStatusRaw}`)
  }
  if (modelSlug && !supportedModelSlugs.has(modelSlug)) {
    errors.push(`${path}.modelSlug is an unsupported modelSlug: ${modelSlug}`)
  }
  if (slug && !SLUG_PATTERN.test(slug)) {
    errors.push(`${path}.slug must contain lowercase letters, numbers, and hyphens only`)
  }

  const startTimestamp = validateDate(startDate, `${path}.startDate`, errors)
  const endTimestamp = validateDate(endDate, `${path}.endDate`, errors)
  if (!Number.isNaN(startTimestamp) && !Number.isNaN(endTimestamp) && startTimestamp > endTimestamp) {
    errors.push(`${path}.startDate must be before or equal to endDate`)
  }

  const pricingOverrides = validatePricingOverrides(raw.pricingOverrides, `${path}.pricingOverrides`, errors)
  const benefits = validateBenefits(raw.benefits, `${path}.benefits`, errors)
  const conditions = validateConditions(raw.conditions, `${path}.conditions`, errors)
  const tags = validateTags(raw.tags, `${path}.tags`, errors)
  const meta = validateMeta(raw.meta, `${path}.meta`, errors)

  return {
    title,
    ...(subtitle ? { subtitle } : {}),
    ...(description ? { description } : {}),
    detailUrl,
    campaignStatus: (CAMPAIGN_STATUSES.has(campaignStatusRaw as PromotionCampaignStatus)
      ? campaignStatusRaw
      : 'active') as PromotionCampaignStatus,
    ...(priority !== undefined ? { priority } : {}),
    startDate,
    endDate,
    modelSlug,
    pricingOverrides,
    benefits,
    conditions,
    ...(tags ? { tags } : {}),
    ...(meta ? { meta } : {}),
    slug,
  }
}

export function validatePromotionBatch(
  raw: unknown,
  supportedModelSlugs: readonly string[],
): PromotionImportRecord[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new PromotionImportValidationError(['root must be a non-empty array'])
  }

  const errors: string[] = []
  const supportedModels = new Set(supportedModelSlugs)
  const promotions = raw.flatMap((item, index) => {
    const promotion = validateRecord(item, index, supportedModels, errors)
    return promotion ? [promotion] : []
  })

  const seenSlugs = new Set<string>()
  promotions.forEach((promotion, index) => {
    if (seenSlugs.has(promotion.slug)) {
      errors.push(`promotions[${index}].slug is a duplicate slug: ${promotion.slug}`)
    }
    seenSlugs.add(promotion.slug)
  })

  if (errors.length > 0) throw new PromotionImportValidationError(errors)
  return promotions
}
