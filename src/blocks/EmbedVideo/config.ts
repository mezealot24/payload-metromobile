import type { Block } from 'payload'

export const EmbedVideo: Block = {
  slug: 'embedVideo',
  labels: {
    singular: 'Embed Video',
    plural: 'Embed Videos',
  },
  fields: [
    {
      name: 'provider',
      type: 'select',
      defaultValue: 'youtube',
      options: [
        { label: 'YouTube', value: 'youtube' },
        { label: 'Vimeo', value: 'vimeo' },
        { label: 'Facebook', value: 'facebook' },
      ],
      required: true,
    },
    {
      name: 'url',
      type: 'text',
      required: true,
      admin: {
        description: 'Use the full URL from YouTube/Vimeo/Facebook.',
      },
    },
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'thumbnail',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Optional preview image for lazy loading.',
      },
    },
  ],
}
