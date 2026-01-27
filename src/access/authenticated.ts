import type { AccessArgs } from 'payload'

import type { User } from '@/payload-types'

type isAuthenticated = (args: AccessArgs<User>) => boolean

export const authenticated: isAuthenticated = ({ req }) => {
  const reqWithApiKey = req as typeof req & { apiKey?: unknown }
  return Boolean(req.user || reqWithApiKey.apiKey)
}
