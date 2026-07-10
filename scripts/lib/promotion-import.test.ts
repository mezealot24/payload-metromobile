import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

// @ts-ignore -- The test runner loads TypeScript source files directly.
import { CANONICAL_BYD_MODEL_SLUGS } from '../../src/constants/bydModels.ts'
// @ts-ignore -- The test runner loads TypeScript source files directly.
import {
  PromotionImportValidationError,
  validatePromotionBatch,
} from './promotion-import.ts'

const dataUrl = new URL('../data/promotions-jul-2026.json', import.meta.url)

async function loadDataset(): Promise<unknown> {
  return JSON.parse(await readFile(dataUrl, 'utf8'))
}

test('validates the ten July 2026 Rever campaigns', async () => {
  const promotions = validatePromotionBatch(await loadDataset(), CANONICAL_BYD_MODEL_SLUGS)

  assert.equal(promotions.length, 10)
  assert.equal(new Set(promotions.map((promotion) => promotion.slug)).size, 10)
  assert.ok(promotions.every((promotion) => promotion.startDate.startsWith('2026-07-01')))
  assert.ok(promotions.every((promotion) => promotion.endDate.startsWith('2026-07-31')))
  assert.ok(
    promotions.every((promotion) =>
      promotion.detailUrl.startsWith('https://www.reverautomotive.com/news/'),
    ),
  )
})

test('rejects the legacy variants field and string conditions', () => {
  const invalid = [
    {
      title: 'Legacy promotion',
      slug: 'legacy-promotion',
      modelSlug: 'atto-3',
      detailUrl: 'https://www.reverautomotive.com/news/example',
      campaignStatus: 'active',
      startDate: '2026-07-01T00:00:00+07:00',
      endDate: '2026-07-31T23:59:59+07:00',
      variants: [{ variantId: 'extended', price: 1 }],
      pricingOverrides: [{ variantId: 'extended', promoPrice: 1 }],
      benefits: [{ type: 'early_price', description: 'ราคา 1 บาท' }],
      conditions: ['legacy string'],
    },
  ]

  assert.throws(
    () => validatePromotionBatch(invalid, CANONICAL_BYD_MODEL_SLUGS),
    (error: unknown) => {
      if (!(error instanceof PromotionImportValidationError)) return false
      assert.match(error.message, /legacy field "variants"/)
      assert.match(error.message, /conditions\[0\] must be an object/)
      return true
    },
  )
})

test('rejects duplicate slugs, unsupported models, and inverted prices', () => {
  const base = {
    title: 'Promotion',
    slug: 'duplicate',
    detailUrl: 'https://www.reverautomotive.com/news/example',
    campaignStatus: 'active',
    startDate: '2026-07-01T00:00:00+07:00',
    endDate: '2026-07-31T23:59:59+07:00',
    pricingOverrides: [
      { variantId: 'standard', promoPrice: 500000, originalPrice: 400000 },
    ],
    benefits: [{ type: 'early_price', description: 'ราคา 500,000 บาท' }],
    conditions: [{ text: 'เงื่อนไขทดสอบที่มีความยาวเพียงพอ' }],
  }

  assert.throws(
    () =>
      validatePromotionBatch(
        [
          { ...base, modelSlug: 'unsupported-model' },
          { ...base, title: 'Promotion 2', modelSlug: 'atto-3' },
        ],
        CANONICAL_BYD_MODEL_SLUGS,
      ),
    (error: unknown) => {
      if (!(error instanceof PromotionImportValidationError)) return false
      assert.match(error.message, /unsupported modelSlug/)
      assert.match(error.message, /duplicate slug/)
      assert.match(error.message, /originalPrice must be greater than or equal to promoPrice/)
      return true
    },
  )
})

test('normalization excludes media fields so imports cannot overwrite existing images', () => {
  const raw = [
    {
      title: 'Safe promotion',
      slug: 'safe-promotion',
      modelSlug: 'atto-3',
      detailUrl: 'https://www.reverautomotive.com/news/example',
      campaignStatus: 'active',
      startDate: '2026-07-01T00:00:00+07:00',
      endDate: '2026-07-31T23:59:59+07:00',
      pricingOverrides: [{ variantId: 'extended', promoPrice: 769900 }],
      benefits: [{ type: 'early_price', description: 'ราคา 769,900 บาท' }],
      conditions: [{ text: 'เงื่อนไขทดสอบที่มีความยาวเพียงพอ' }],
      heroMedia: 123,
      gallery: [{ image: 123 }],
    },
  ]

  const [promotion] = validatePromotionBatch(raw, CANONICAL_BYD_MODEL_SLUGS)
  assert.equal('heroMedia' in promotion, false)
  assert.equal('gallery' in promotion, false)
})

test('keeps the conditional ATTO 3 discount out of the base promo price', async () => {
  const promotions = validatePromotionBatch(await loadDataset(), CANONICAL_BYD_MODEL_SLUGS)
  const atto3 = promotions.find((promotion) => promotion.slug === 'atto-3-jul-2026')

  if (!atto3) throw new Error('ATTO 3 July 2026 campaign is missing')
  const extended = atto3.pricingOverrides.find(
    (variant) => variant.variantId === 'new-extended',
  )
  assert.equal(extended?.promoPrice, 769900)
  assert.ok(
    atto3.benefits.some(
      (benefit) => benefit.type === 'discount' && benefit.description.includes('30,000'),
    ),
  )
})
