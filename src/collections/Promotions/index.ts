import type { CollectionConfig } from 'payload'

import {
  BlocksFeature,
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import { slugField } from 'payload'

import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { authenticated } from '../../access/authenticated'
import { EmbedVideo } from '../../blocks/EmbedVideo/config'
import { revalidateDelete, revalidatePromotion } from './hooks/revalidatePromotion'
import { parseBulkFields } from './hooks/parseBulkFields'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'

export const Promotions: CollectionConfig = {
  slug: 'promotions',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  hooks: {
    beforeChange: [parseBulkFields],
    afterChange: [revalidatePromotion],
    afterDelete: [revalidateDelete],
  },
  admin: {
    defaultColumns: ['title', 'campaignStatus', 'startDate', 'endDate', 'updatedAt'],
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'campaignStatus',
      type: 'select',
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Upcoming', value: 'upcoming' },
        { label: 'Expired', value: 'expired' },
      ],
      required: true,
    },
    {
      name: 'priority',
      type: 'number',
      admin: {
        description: 'Lower number = higher priority.',
      },
    },
    {
      name: 'startDate',
      type: 'date',
    },
    {
      name: 'endDate',
      type: 'date',
    },
    {
      name: 'modelSlug',
      type: 'text',
      admin: {
        description: 'Optional. Match frontend model slug (e.g., sealion7).',
      },
    },
    {
      name: 'heroMedia',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'gallery',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'alt',
          type: 'text',
        },
        {
          name: 'caption',
          type: 'text',
        },
      ],
    },
    // ========================================
    // Quick Entry: Bulk Paste from Rever
    // ========================================
    {
      type: 'collapsible',
      label: 'Quick Entry (Bulk Paste from Rever)',
      admin: {
        initCollapsed: true,
        description: 'Paste content from Rever website - auto-converts to structured data on save',
      },
      fields: [
        {
          name: 'benefitsHtml',
          type: 'textarea',
          admin: {
            description:
              'Paste HTML from Rever (Inspect Element → Copy outerHTML of table). Best accuracy for table data.',
            rows: 8,
          },
        },
        {
          name: 'benefitsBulk',
          type: 'textarea',
          admin: {
            description:
              'Or paste plain text (1 line = 1 benefit). Auto-detects type from Thai keywords.',
            rows: 6,
          },
        },
        {
          name: 'conditionsBulk',
          type: 'textarea',
          admin: {
            description:
              'Paste conditions (1 line = 1 condition). Or leave empty if using HTML above (auto-extracted from sections 3 & 4).',
            rows: 4,
          },
        },
      ],
    },
    // ========================================
    // Structured Benefits
    // ========================================
    {
      name: 'benefits',
      type: 'array',
      admin: {
        description: 'Structured benefits - auto-populated from bulk paste or edit manually',
      },
      fields: [
        {
          name: 'type',
          type: 'select',
          defaultValue: 'freebie',
          options: [
            { label: '💰 Early Price (ราคาพิเศษ)', value: 'early_price' },
            { label: '💳 Financing (ดาวน์/ดอกเบี้ย)', value: 'financing' },
            { label: '🛡️ Insurance 1Y (ประกันภัย)', value: 'insurance_1y' },
            { label: '⚙️ Warranty Powertrain (รับประกันระบบขับเคลื่อน)', value: 'warranty_powertrain' },
            { label: '🚗 Warranty Vehicle (รับประกันคุณภาพรถ)', value: 'warranty_vehicle' },
            { label: '🔋 Battery Warranty (รับประกันแบตเตอรี่)', value: 'battery_warranty' },
            { label: '🆘 Roadside 8Y (ช่วยเหลือฉุกเฉิน)', value: 'roadside_8y' },
            { label: '🎁 Accessories Bundle (ชุดอุปกรณ์)', value: 'accessories_bundle' },
            { label: '🪟 Accessory (อุปกรณ์เสริม)', value: 'accessory' },
            { label: '🎀 Freebie (ของแถม)', value: 'freebie' },
            { label: '💵 Cashback', value: 'cashback' },
            { label: '📉 Discount', value: 'discount' },
            { label: '🔧 Service', value: 'service' },
            { label: '⭐ Special', value: 'special' },
            { label: '📦 Other', value: 'other' },
          ],
          required: true,
          admin: {
            width: '25%',
          },
        },
        {
          name: 'title',
          type: 'text',
          admin: {
            description: 'Short title (auto-detected from table header)',
            width: '75%',
          },
        },
        {
          name: 'description',
          type: 'textarea',
          required: true,
          admin: {
            description: 'Full description text',
            rows: 2,
          },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'value',
              type: 'text',
              admin: {
                description: 'Price/value (auto-extracted)',
                width: '33%',
              },
            },
            {
              name: 'icon',
              type: 'text',
              admin: {
                description: 'Emoji or icon name',
                width: '33%',
              },
            },
            {
              name: 'sort',
              type: 'number',
              defaultValue: 100,
              admin: {
                description: 'Sort order (lower = first)',
                width: '33%',
              },
            },
          ],
        },
      ],
    },
    // ========================================
    // Structured Conditions
    // ========================================
    {
      name: 'conditions',
      type: 'array',
      admin: {
        description: 'Campaign conditions - auto-populated from bulk paste or edit manually',
      },
      fields: [
        {
          name: 'text',
          type: 'textarea',
          required: true,
          admin: {
            rows: 2,
          },
        },
        {
          name: 'sort',
          type: 'number',
          defaultValue: 100,
          admin: {
            description: 'Sort order',
            width: '25%',
          },
        },
      ],
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        {
          name: 'text',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'content',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [
            ...rootFeatures,
            HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
            BlocksFeature({ blocks: [EmbedVideo] }),
            FixedToolbarFeature(),
            InlineToolbarFeature(),
          ]
        },
      }),
    },
    {
      type: 'tabs',
      tabs: [
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({
              hasGenerateFn: true,
            }),
            MetaImageField({
              relationTo: 'media',
            }),
            MetaDescriptionField({}),
            PreviewField({
              hasGenerateFn: true,
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    slugField(),
  ],
  versions: {
    drafts: {
      autosave: {
        interval: 100,
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
