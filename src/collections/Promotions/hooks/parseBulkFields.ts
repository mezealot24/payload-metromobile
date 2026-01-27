import type { CollectionBeforeChangeHook } from 'payload'

// ============================================================
// TYPE DETECTION KEYWORDS (Thai patterns from Rever)
// ============================================================
const TYPE_KEYWORDS: Array<{ pattern: RegExp; type: string }> = [
  { pattern: /ราคา(จำหน่าย|พิเศษ)?/i, type: 'early_price' },
  { pattern: /ดาวน์|ดอกเบี้ย|ผ่อน|สินเชื่อ/i, type: 'financing' },
  { pattern: /ประกันภัย|พ\.ร\.บ\./i, type: 'insurance_1y' },
  { pattern: /รับประกันระบบขับเคลื่อน/i, type: 'warranty_powertrain' },
  { pattern: /รับประกันคุณภาพรถ/i, type: 'warranty_vehicle' },
  { pattern: /รับประกันแบตเตอรี่|Battery/i, type: 'battery_warranty' },
  { pattern: /ช่วยเหลือฉุกเฉิน|24\s*ชั่วโมง\s*\d+\s*ปี/i, type: 'roadside_8y' },
  { pattern: /VtoL|สายต่อพ่วง|สายชาร์จ|Charger|AC Portable/i, type: 'accessories_bundle' },
  { pattern: /พรม|ผ้ายาง|กรอบป้าย|ฟิล์มกันรอย/i, type: 'freebie' },
  { pattern: /ฟิล์ม(กรองแสง|เซรามิก)|XUV|CERAMIC/i, type: 'accessory' },
  { pattern: /ค่าจดทะเบียน/i, type: 'freebie' },
]

function detectBenefitType(text: string): string {
  for (const { pattern, type } of TYPE_KEYWORDS) {
    if (pattern.test(text)) return type
  }
  return 'freebie' // default
}

function extractValue(text: string): string | undefined {
  // Match Thai price format: 699,900 or 6,260 บาท
  const priceMatch = text.match(/([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)\s*บาท/)
  if (priceMatch) return priceMatch[1].replace(/,/g, '')

  // Match percentage: 1.88%
  const percentMatch = text.match(/([0-9]+(?:\.[0-9]+)?)\s*%/)
  if (percentMatch) return `${percentMatch[1]}%`

  // Match years/km: 8 ปี, 160,000 กม.
  const warrantyMatch = text.match(/([0-9]+)\s*ปี/)
  if (warrantyMatch) return `${warrantyMatch[1]}y`

  return undefined
}

// ============================================================
// HTML PARSER (for Rever Lexical richtext tables)
// ============================================================
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/·/g, '')
    .replace(/­/g, '') // soft hyphen
    .replace(/\s+/g, ' ')
    .trim()
}

function parseHtmlBenefits(html: string): Array<{
  type: string
  title: string
  description: string
  value?: string
}> {
  const benefits: Array<{
    type: string
    title: string
    description: string
    value?: string
  }> = []

  // Match table rows: <tr>...<td>TITLE</td><td>DESCRIPTION</td>...</tr>
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let rowMatch: RegExpExecArray | null

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowContent = rowMatch[1]

    // Skip header rows (contain <th>)
    if (/<th/i.test(rowContent)) continue

    // Extract <td> contents
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi
    const tds: string[] = []
    let tdMatch: RegExpExecArray | null

    while ((tdMatch = tdRegex.exec(rowContent)) !== null) {
      tds.push(stripHtml(tdMatch[1]))
    }

    if (tds.length >= 2) {
      const title = tds[0]
      const description = tds[1]

      // Skip empty or header-like rows
      if (!title || !description) continue
      if (title === 'ราคาจำหน่าย' && !/\d/.test(description)) continue
      if (title === 'สิทธิประโยชน์พิเศษ' && !description) continue

      benefits.push({
        type: detectBenefitType(title),
        title,
        description,
        value: extractValue(description) || extractValue(title),
      })
    }
  }

  return benefits
}

function parseHtmlConditions(html: string): string[] {
  const conditions: string[] = []

  // Match numbered conditions from paragraphs: 3.1, 3.2, 4.1, 4.2, etc.
  // Look for patterns like "3.1." or "4.1." followed by text
  const conditionRegex =
    /<p[^>]*>[\s]*([34]\.[0-9]+\.?\s*)([\s\S]*?)<\/p>/gi
  let match: RegExpExecArray | null

  while ((match = conditionRegex.exec(html)) !== null) {
    const text = stripHtml(match[2])
    // Only add if it has meaningful content
    if (text.length > 10) {
      conditions.push(text)
    }
  }

  return conditions
}

// ============================================================
// PLAIN TEXT PARSER (keyword detection)
// ============================================================
const BULLET_REGEX = /^[\s]*[-•–—·]\s*|^[\s]*\d+[.)\\]]\s*/

function parsePlainTextBenefits(text: string): Array<{
  type: string
  description: string
  value?: string
}> {
  return text
    .split('\n')
    .map((line) => line.replace(BULLET_REGEX, '').trim())
    .filter((line) => line.length > 10)
    .map((line) => ({
      type: detectBenefitType(line),
      description: line,
      value: extractValue(line),
    }))
}

function parsePlainTextConditions(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(BULLET_REGEX, '').trim())
    .filter((line) => line.length > 10)
}

// ============================================================
// MAIN HOOK
// ============================================================
function isHtml(text: string): boolean {
  return /<(table|tr|td|th|p|div)/i.test(text)
}

type BenefitItem = {
  type: string
  title?: string
  description: string
  value?: string
  icon?: string
  sort?: number
}

type ConditionItem = {
  text: string
  sort?: number
}

export const parseBulkFields: CollectionBeforeChangeHook = ({ data, req }) => {
  if (!data) return data

  const existingBenefits: BenefitItem[] = data.benefits ?? []
  const existingConditions: ConditionItem[] = data.conditions ?? []

  let newBenefits: BenefitItem[] = []
  let newConditions: ConditionItem[] = []

  // Parse benefitsHtml (HTML from Rever)
  if (data.benefitsHtml?.trim()) {
    const html = data.benefitsHtml as string
    const parsed = parseHtmlBenefits(html)

    newBenefits = parsed.map((b, i) => ({
      ...b,
      sort: existingBenefits.length + i + 1,
    }))

    // Also extract conditions from HTML if present
    const htmlConditions = parseHtmlConditions(html)
    if (htmlConditions.length > 0) {
      newConditions = htmlConditions.map((text, i) => ({
        text,
        sort: existingConditions.length + i + 1,
      }))
    }

    req.payload.logger.info(
      `[parseBulkFields] Parsed ${newBenefits.length} benefits and ${newConditions.length} conditions from HTML`,
    )
  }

  // Parse benefitsBulk (plain text or HTML)
  if (data.benefitsBulk?.trim()) {
    const text = data.benefitsBulk as string
    const parsed = isHtml(text) ? parseHtmlBenefits(text) : parsePlainTextBenefits(text)

    const currentBenefitsCount = existingBenefits.length + newBenefits.length
    const additionalBenefits = parsed.map((b, i) => ({
      type: b.type,
      title: 'title' in b ? (b.title as string) : undefined,
      description: b.description,
      value: b.value,
      sort: currentBenefitsCount + i + 1,
    }))

    newBenefits = [...newBenefits, ...additionalBenefits]

    req.payload.logger.info(
      `[parseBulkFields] Parsed ${additionalBenefits.length} additional benefits from bulk text`,
    )
  }

  // Parse conditionsBulk (plain text)
  if (data.conditionsBulk?.trim()) {
    const text = data.conditionsBulk as string
    const parsed = parsePlainTextConditions(text)
    const currentConditionsCount = existingConditions.length + newConditions.length

    const additionalConditions = parsed.map((text, i) => ({
      text,
      sort: currentConditionsCount + i + 1,
    }))

    newConditions = [...newConditions, ...additionalConditions]

    req.payload.logger.info(
      `[parseBulkFields] Parsed ${additionalConditions.length} conditions from bulk text`,
    )
  }

  // Merge with existing data
  if (newBenefits.length > 0) {
    data.benefits = [...existingBenefits, ...newBenefits]
  }

  if (newConditions.length > 0) {
    data.conditions = [...existingConditions, ...newConditions]
  }

  // Clear bulk fields after processing
  data.benefitsHtml = undefined
  data.benefitsBulk = undefined
  data.conditionsBulk = undefined

  return data
}
