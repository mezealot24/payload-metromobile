import type { Metadata } from 'next'

import type { Media, Page, Post, Config } from '../payload-types'

import { mergeOpenGraph } from './mergeOpenGraph'
import { getServerSideURL } from './getURL'

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
  const suffixRe = new RegExp(`(?:\\||-|—|–)\\s*${escapeRegExp(s)}\\s*$`, 'i')
  if (suffixRe.test(t) || t.toLowerCase().endsWith(s.toLowerCase())) return t
  return `${t} | ${s}`
}

const getImageURL = (image?: Media | Config['db']['defaultIDType'] | null) => {
  const serverUrl = getServerSideURL()

  let url = serverUrl + '/website-template-OG.webp'

  if (image && typeof image === 'object' && 'url' in image) {
    const ogUrl = image.sizes?.og?.url

    url = ogUrl ? serverUrl + ogUrl : serverUrl + image.url
  }

  return url
}

export const generateMeta = async (args: {
  doc: Partial<Page> | Partial<Post> | null
}): Promise<Metadata> => {
  const { doc } = args

  const ogImage = getImageURL(doc?.meta?.image)

  const title = doc?.meta?.title ? ensureSuffix(String(doc.meta.title), SITE_NAME) : SITE_NAME

  return {
    description: doc?.meta?.description,
    openGraph: mergeOpenGraph({
      description: doc?.meta?.description || '',
      images: ogImage
        ? [
            {
              url: ogImage,
            },
          ]
        : undefined,
      title,
      url: Array.isArray(doc?.slug) ? doc?.slug.join('/') : '/',
    }),
    title,
  }
}
