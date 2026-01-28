import type { CollectionConfig } from 'payload'

import { anyone } from '../../access/anyone'
import { authenticated } from '../../access/authenticated'
import { BYD_MODEL_OPTIONS } from '@/constants/bydModels'
import {
  revalidateModelPricing,
  revalidateDelete,
} from './hooks/revalidateModelPricing'

export const ModelPricing: CollectionConfig = {
  slug: 'model-pricing',
  access: {
    read: anyone,
    create: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  hooks: {
    afterChange: [revalidateModelPricing],
    afterDelete: [revalidateDelete],
  },
  admin: {
    useAsTitle: 'modelSlug',
    defaultColumns: ['modelSlug', 'currency', 'effectiveDate', 'updatedAt'],
  },
  fields: [
    {
      name: 'modelSlug',
      type: 'select',
      options: [...BYD_MODEL_OPTIONS],
      required: true,
      index: true,
      admin: {
        description: 'Match frontend model slug (prevents typos).',
      },
    },
    {
      name: 'currency',
      type: 'select',
      options: [{ label: 'THB', value: 'THB' }],
      required: true,
      defaultValue: 'THB',
    },
    {
      name: 'basePrice',
      type: 'number',
      required: true,
      min: 0,
    },
    {
      name: 'variants',
      type: 'array',
      minRows: 1,
      fields: [
        {
          name: 'variantId',
          type: 'text',
          required: true,
        },
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'price',
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'originalPrice',
          type: 'number',
          min: 0,
        },
      ],
    },
    {
      name: 'region',
      type: 'text',
    },
    {
      name: 'effectiveDate',
      type: 'date',
      required: true,
    },
    {
      name: 'notes',
      type: 'textarea',
    },
  ],
  timestamps: true,
}
