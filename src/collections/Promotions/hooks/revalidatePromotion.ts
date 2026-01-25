import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import type { Promotion } from '../../../payload-types'

export const revalidatePromotion: CollectionAfterChangeHook<Promotion> = async ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (context.disableRevalidate) {
    return doc
  }

  const frontendUrl = process.env.FRONTEND_URL
  const revalidateSecret = process.env.PAYLOAD_REVALIDATE_SECRET

  if (!frontendUrl || !revalidateSecret) {
    payload.logger.warn(
      'Skipping revalidation: FRONTEND_URL or PAYLOAD_REVALIDATE_SECRET not set',
    )
    return doc
  }

  try {
    if (doc._status === 'published') {
      const endpoint = `${frontendUrl}/api/revalidate/promotion`

      payload.logger.info(`Revalidating promotion: ${doc.slug}`)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-secret': revalidateSecret,
        },
        body: JSON.stringify({
          slug: doc.slug,
        }),
      })

      if (!response.ok) {
        payload.logger.error(
          `Revalidation failed for ${doc.slug}: ${response.status} ${response.statusText}`,
        )
      } else {
        payload.logger.info(`Successfully revalidated promotion: ${doc.slug}`)
      }
    }

    if (previousDoc?._status === 'published' && doc._status !== 'published') {
      const endpoint = `${frontendUrl}/api/revalidate/promotion`

      payload.logger.info(`Revalidating unpublished promotion: ${previousDoc.slug}`)

      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-secret': revalidateSecret,
        },
        body: JSON.stringify({
          slug: previousDoc.slug,
        }),
      })
    }
  } catch (error) {
    payload.logger.error(`Revalidation error: ${error}`)
  }

  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Promotion> = async ({
  doc,
  req: { context, payload },
}) => {
  if (context.disableRevalidate) {
    return doc
  }

  const frontendUrl = process.env.FRONTEND_URL
  const revalidateSecret = process.env.PAYLOAD_REVALIDATE_SECRET

  if (!frontendUrl || !revalidateSecret) {
    return doc
  }

  try {
    const endpoint = `${frontendUrl}/api/revalidate/promotion`

    payload.logger.info(`Revalidating deleted promotion: ${doc?.slug}`)

    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': revalidateSecret,
      },
      body: JSON.stringify({
        slug: doc?.slug,
      }),
    })
  } catch (error) {
    payload.logger.error(`Revalidation error on delete: ${error}`)
  }

  return doc
}
