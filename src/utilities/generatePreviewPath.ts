import { PayloadRequest, CollectionSlug } from 'payload'

const collectionPrefixMap: Partial<Record<CollectionSlug, string>> = {
  posts: '/posts',
  pages: '',
}

type Props = {
  collection: keyof typeof collectionPrefixMap
  slug: string
  req: PayloadRequest
}

export const generatePreviewPath = ({ collection, slug }: Props) => {
  // Allow empty strings, e.g. for the homepage
  if (slug === undefined || slug === null) {
    return null
  }

  // Encode to support slugs with special characters
  const encodedSlug = encodeURIComponent(slug)

  const params = new URLSearchParams({
    secret: process.env.PREVIEW_SECRET || '',
    slug: `${collectionPrefixMap[collection]}/${encodedSlug}`,
    collection,
  })

  const url = `${process.env.FRONTEND_URL || ''}/api/draft?${params.toString()}`

  return url
}
