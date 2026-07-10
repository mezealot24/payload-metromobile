import type { PromotionSeed } from '../../lib/promotion-seed'

import { PROMOTIONS_JUL_2026_A } from './group-a'
import { PROMOTIONS_JUL_2026_B } from './group-b'
import { PROMOTIONS_JUL_2026_C } from './group-c'

export const PROMOTIONS_JUL_2026: PromotionSeed[] = [
  ...PROMOTIONS_JUL_2026_A,
  ...PROMOTIONS_JUL_2026_B,
  ...PROMOTIONS_JUL_2026_C,
]

export default PROMOTIONS_JUL_2026
