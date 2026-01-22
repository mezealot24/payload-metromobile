import type { GlobalConfig } from 'payload'

import { authenticated } from '@/access/authenticated'

export const PopupBanner: GlobalConfig = {
  slug: 'popupBanner',
  access: {
    read: () => true,
    update: authenticated,
  },
  fields: [
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'titleTH',
      type: 'text',
    },
    {
      name: 'messageTH',
      type: 'textarea',
    },
    {
      name: 'ctaLabel',
      type: 'text',
    },
    {
      name: 'ctaHref',
      type: 'text',
    },
    {
      name: 'ctaNewTab',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'theme',
      type: 'select',
      defaultValue: 'promo',
      options: [
        { label: 'Info', value: 'info' },
        { label: 'Promo', value: 'promo' },
        { label: 'Urgent', value: 'urgent' },
      ],
    },
    {
      name: 'startAt',
      type: 'date',
    },
    {
      name: 'endAt',
      type: 'date',
    },
    {
      name: 'media',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'videoUrl',
      type: 'text',
      admin: {
        description: 'Optional. Use YouTube/Vimeo/Facebook URL.',
      },
    },
    {
      name: 'targeting',
      type: 'select',
      hasMany: true,
      defaultValue: ['all'],
      options: [
        { label: 'All pages', value: 'all' },
        { label: 'Home', value: 'home' },
        { label: 'Promotion', value: 'promotion' },
        { label: 'Models', value: 'models' },
        { label: 'Blog', value: 'blog' },
      ],
    },
  ],
  versions: {
    drafts: true,
  },
}
