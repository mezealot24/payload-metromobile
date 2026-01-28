import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
} from 'payload'

type ModelPricing = {
  id: string | number
  modelSlug: string
  [key: string]: any
}

export const revalidateModelPricing: CollectionAfterChangeHook<ModelPricing> = async ({
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
    const endpoint = `${frontendUrl}/api/revalidate/model-pricing`

    payload.logger.info(`Revalidating model-pricing: ${doc.modelSlug}`)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': revalidateSecret,
      },
      body: JSON.stringify({
        modelSlug: doc.modelSlug,
      }),
    })

    if (!response.ok) {
      payload.logger.error(
        `Revalidation failed for ${doc.modelSlug}: ${response.status} ${response.statusText}`,
      )
    } else {
      payload.logger.info(`Successfully revalidated model-pricing: ${doc.modelSlug}`)
    }
  } catch (error) {
    payload.logger.error(`Revalidation error: ${error}`)
  }

  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<ModelPricing> = async ({
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
    const endpoint = `${frontendUrl}/api/revalidate/model-pricing`

    payload.logger.info(`Revalidating deleted model-pricing: ${doc?.modelSlug}`)

    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': revalidateSecret,
      },
      body: JSON.stringify({
        modelSlug: doc?.modelSlug,
      }),
    })
  } catch (error) {
    payload.logger.error(`Revalidation error on delete: ${error}`)
  }

  return doc
}
