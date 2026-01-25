import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { searchPlugin } from '@payloadcms/plugin-search'
import { Plugin } from 'payload'
import { revalidateRedirects } from '@/hooks/revalidateRedirects'
import { GenerateDescription, GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { searchFields } from '@/search/fieldOverrides'
import { beforeSyncWithSearch } from '@/search/beforeSync'

import { Page, Post } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'
import { BYD_MODEL_OPTIONS } from '@/constants/bydModels'

const SITE_NAME = 'BYD Metromobile'

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function ensureSuffix(title: string, suffix: string): string {
  const t = normalizeSpaces(title)
  const s = normalizeSpaces(suffix)
  if (!t) return s

  // If already ends with "| <suffix>" (or contains suffix at end), don't double-append
  const suffixRe = new RegExp(`(?:\\||-|—|–)\\s*${escapeRegExp(s)}\\s*$`, 'i')
  if (suffixRe.test(t) || t.toLowerCase().endsWith(s.toLowerCase())) return t

  return `${t} | ${s}`
}

function truncateTo(input: string, max: number): string {
  const s = normalizeSpaces(input)
  if (s.length <= max) return s
  return `${s.slice(0, Math.max(0, max - 1)).trimEnd()}…`
}

function clampMetaDescription(input: string): string {
  // target 100–150 characters (as guidance from Google / admin UI)
  const MIN = 100
  const MAX = 150
  const base = normalizeSpaces(input)
  if (base.length > MAX) return truncateTo(base, MAX)

  if (base.length >= MIN) return base

  // If it's too short, pad with a consistent CTA (still human-readable)
  const padded = `${base} ดูรายละเอียดและข้อเสนอจาก ${SITE_NAME}`
  return padded.length > MAX ? truncateTo(padded, MAX) : padded
}

const generateTitle: GenerateTitle<Post | Page> = ({ doc }) => {
  if (!doc?.title) return SITE_NAME
  return ensureSuffix(String(doc.title), SITE_NAME)
}

const generateDescription: GenerateDescription<any> = ({ doc }) => {
  const title = typeof doc?.title === 'string' ? doc.title : ''

  // Promotions-specific extras (best-effort; safe if fields absent)
  const modelSlug = typeof doc?.modelSlug === 'string' ? doc.modelSlug : null
  const modelLabel = modelSlug
    ? BYD_MODEL_OPTIONS.find((m) => m.value === modelSlug)?.label ?? null
    : null

  const rawBenefits: unknown = doc?.benefits
  const benefitSnippets: string[] = Array.isArray(rawBenefits)
    ? rawBenefits
        .map((b: any) => b?.description)
        .filter((x: unknown): x is string => typeof x === 'string')
        .map((x: string) => normalizeSpaces(x))
        .filter(Boolean)
        .slice(0, 2)
    : []

  const subtitle = typeof doc?.subtitle === 'string' ? normalizeSpaces(doc.subtitle) : ''
  const description = typeof doc?.description === 'string' ? normalizeSpaces(doc.description) : ''

  // Assemble: model (if any) + subtitle/desc + top benefits
  const parts = [
    modelLabel && title && !title.includes(modelLabel) ? `${modelLabel}: ${title}` : title,
    subtitle || description,
    ...benefitSnippets,
  ].filter(Boolean)

  return clampMetaDescription(parts.join(' • '))
}

const generateURL: GenerateURL<Post | Page> = ({ doc }) => {
  const url = getServerSideURL()

  return doc?.slug ? `${url}/${doc.slug}` : url
}

export const plugins: Plugin[] = [
  redirectsPlugin({
    collections: ['pages', 'posts'],
    overrides: {
      // @ts-expect-error - This is a valid override, mapped fields don't resolve to the same type
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'from') {
            return {
              ...field,
              admin: {
                description: 'You will need to rebuild the website when changing this field.',
              },
            }
          }
          return field
        })
      },
      hooks: {
        afterChange: [revalidateRedirects],
      },
    },
  }),
  nestedDocsPlugin({
    collections: ['categories'],
    generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`, ''),
  }),
  seoPlugin({
    generateDescription,
    generateTitle,
    generateURL,
  }),
  formBuilderPlugin({
    fields: {
      payment: false,
    },
    formOverrides: {
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'confirmationMessage') {
            return {
              ...field,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    FixedToolbarFeature(),
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                  ]
                },
              }),
            }
          }
          return field
        })
      },
    },
  }),
  searchPlugin({
    collections: ['posts'],
    beforeSync: beforeSyncWithSearch,
    searchOverrides: {
      fields: ({ defaultFields }) => {
        return [...defaultFields, ...searchFields]
      },
    },
  }),
]
