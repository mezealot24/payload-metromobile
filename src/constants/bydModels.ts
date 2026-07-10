export const CANONICAL_BYD_MODEL_OPTIONS = [
  { label: 'BYD SEALION 5 DM-i', value: 'sealion-5-dm-i' },
  { label: 'BYD SEAL 6', value: 'seal-6' },
  { label: 'BYD ATTO 2', value: 'atto-2' },
  { label: 'BYD ATTO 1', value: 'atto-1' },
  { label: 'BYD SEAL 5 DM-i', value: 'seal-5-dm-i' },
  { label: 'BYD SEALION 7', value: 'sealion-7' },
  { label: 'BYD M6', value: 'm6' },
  { label: 'BYD SEALION 6 DM-i', value: 'sealion-6-dm-i' },
  { label: 'NEW BYD ATTO 3', value: 'atto-3' },
  { label: 'NEW BYD DOLPHIN', value: 'dolphin' },
  { label: 'BYD SEAL', value: 'seal' },
] as const

// Keep legacy values selectable so existing documents remain editable while new imports
// use the canonical frontend route slugs above.
export const LEGACY_BYD_MODEL_OPTIONS = [
  { label: 'BYD SEAL 5 DM-i (Legacy slug)', value: 'seal-5-dmi' },
  { label: 'BYD SEALION 7 (Legacy slug)', value: 'sealion7' },
  { label: 'BYD SEALION 6 DM-i (Legacy slug)', value: 'sealion-6-dmi' },
  { label: 'NEW BYD ATTO 3 (Legacy slug)', value: 'atto3' },
] as const

export const BYD_MODEL_OPTIONS = [
  ...CANONICAL_BYD_MODEL_OPTIONS,
  ...LEGACY_BYD_MODEL_OPTIONS,
] as const

export const CANONICAL_BYD_MODEL_SLUGS = CANONICAL_BYD_MODEL_OPTIONS.map(
  ({ value }) => value,
)
