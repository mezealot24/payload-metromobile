import 'dotenv/config'

import payload from 'payload'

import payloadConfig from '../src/payload.config'

const ADMIN_EMAIL = 'bydmetro@nextmail.dev'
const ADMIN_PASSWORD = 'Test998724!!'

async function run() {
  await payload.init({
    config: payloadConfig,
  })

  const existing = await payload.find({
    collection: 'users',
    where: {
      email: {
        equals: ADMIN_EMAIL,
      },
    },
    depth: 0,
  })

  if (existing.docs.length > 0) {
    console.log(`Admin user already exists: ${ADMIN_EMAIL}`)
    return
  }

  await payload.create({
    collection: 'users',
    data: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: 'BYD Metro Admin',
    },
  })

  console.log(`Admin user created: ${ADMIN_EMAIL}`)
}

run()
  .catch((error) => {
    console.error('Seed admin failed:', error)
    process.exit(1)
  })
  .finally(() => {
    process.exit(0)
  })
