import 'dotenv/config'

import payload from 'payload'

import payloadConfig from '../src/payload.config'

/**
 * Seed Header and Footer globals with navigation data
 * Based on frontend navigation structure from byd-metromobile
 */
async function run() {
  await payload.init({
    config: payloadConfig,
  })

  console.log('Starting globals seed...')

  // Header navigation items
  const headerNavItems = [
    {
      link: {
        type: 'custom',
        label: 'หน้าแรก',
        url: '/',
        newTab: false,
      },
    },
    {
      link: {
        type: 'custom',
        label: 'รุ่นรถ',
        url: '/models',
        newTab: false,
      },
    },
    {
      link: {
        type: 'custom',
        label: 'โปรโมชั่น',
        url: '/promotion',
        newTab: false,
      },
    },
    {
      link: {
        type: 'custom',
        label: 'ข่าวสารและกิจกรรม',
        url: '/blog',
        newTab: false,
      },
    },
    {
      link: {
        type: 'custom',
        label: 'เกี่ยวกับเรา',
        url: '/we-are-byd',
        newTab: false,
      },
    },
    {
      link: {
        type: 'custom',
        label: 'ติดต่อเรา',
        url: '/contact-us',
        newTab: false,
      },
    },
  ]

  // Footer navigation items
  const footerNavItems = [
    {
      link: {
        type: 'custom',
        label: 'นโยบายความเป็นส่วนตัว',
        url: '/privacy-policy',
        newTab: false,
      },
    },
    {
      link: {
        type: 'custom',
        label: 'เงื่อนไขการใช้งาน',
        url: '/terms-of-service',
        newTab: false,
      },
    },
    {
      link: {
        type: 'custom',
        label: 'ติดต่อเรา',
        url: '/contact-us',
        newTab: false,
      },
    },
  ]

  try {
    // Update Header global
    await payload.updateGlobal({
      slug: 'header',
      data: {
        navItems: headerNavItems,
      },
      context: {
        disableRevalidate: true, // Disable revalidation during seed
      },
    })
    console.log('✅ Header global updated')

    // Update Footer global
    await payload.updateGlobal({
      slug: 'footer',
      data: {
        navItems: footerNavItems,
      },
      context: {
        disableRevalidate: true, // Disable revalidation during seed
      },
    })
    console.log('✅ Footer global updated')

    console.log('\n🎉 Globals seed completed successfully!')
  } catch (error) {
    console.error('❌ Globals seed failed:', error)
    throw error
  }
}

run()
  .catch((error) => {
    console.error('Seed globals failed:', error)
    process.exit(1)
  })
  .finally(() => {
    process.exit(0)
  })
