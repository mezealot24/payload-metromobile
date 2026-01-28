---
trigger: always_on
description: Collection configurations and patterns
---

# Payload CMS Collections

## Basic Collection

```typescript
import type { CollectionConfig } from 'payload'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'status', 'createdAt'],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true },
    { name: 'content', type: 'richText' },
    { name: 'author', type: 'relationship', relationTo: 'users' },
  ],
  timestamps: true,
}
```

## Auth Collection with RBAC

```typescript
export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  fields: [
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      options: ['admin', 'editor', 'user'],
      defaultValue: ['user'],
      required: true,
      saveToJWT: true, // Include in JWT for fast access checks
      access: {
        update: ({ req: { user } }) => user?.roles?.includes('admin'),
      },
    },
  ],
}
```

## Upload Collection

```typescript
export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/*'],
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 300,
        position: 'centre',
      },
      {
        name: 'card',
        width: 768,
        height: 1024,
      },
    ],
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    crop: true,
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
}
```

## Versioning & Drafts

```typescript
export const Pages: CollectionConfig = {
  slug: 'pages',
  versions: {
    drafts: {
      autosave: true,
      schedulePublish: true,
      validate: false, // Don't validate drafts
    },
    maxPerDoc: 100,
  },
  access: {
    read: ({ req: { user } }) => {
      // Public sees only published
      if (!user) return { _status: { equals: 'published' } }
      // Authenticated sees all
      return true
    },
  },
}
```

### Draft API Usage

```typescript
// Create draft
await payload.create({
  collection: 'posts',
  data: { title: 'Draft Post' },
  draft: true, // Skips required field validation
})

// Read with drafts
const page = await payload.findByID({
  collection: 'pages',
  id: '123',
  draft: true, // Returns draft version if exists
})
```

## Pricing Collections (แยกราคาออกจาก Promotion)

**Rule:** อย่า hardcode ราคาใน frontend. ราคา “มาตรฐาน” ต้องอยู่ใน CMS และ Promotion ใช้ “override ราคาเฉพาะแคมเปญ” เท่านั้น

### Recommended Structure

1) **models** (ข้อมูลรุ่นรถหลัก)
2) **model-pricing** (ราคามาตรฐาน + รุ่นย่อย)
3) **promotions** (ราคาโปร/override + benefits/conditions)

### Model Pricing Collection (example)

```typescript
import type { CollectionConfig } from 'payload'

export const ModelPricing: CollectionConfig = {
  slug: 'model-pricing',
  admin: {
    useAsTitle: 'modelSlug',
    defaultColumns: ['modelSlug', 'currency', 'effectiveDate', 'updatedAt'],
  },
  access: {
    read: () => true,
    update: ({ req: { user } }) => user?.roles?.includes('admin'),
    create: ({ req: { user } }) => user?.roles?.includes('admin'),
    delete: ({ req: { user } }) => user?.roles?.includes('admin'),
  },
  fields: [
    { name: 'modelSlug', type: 'text', required: true, index: true },
    {
      name: 'currency',
      type: 'select',
      required: true,
      options: ['THB'],
      defaultValue: 'THB',
    },
    { name: 'basePrice', type: 'number', required: true, min: 0 },
    {
      name: 'variants',
      type: 'array',
      minRows: 1,
      fields: [
        { name: 'variantId', type: 'text', required: true },
        { name: 'name', type: 'text', required: true },
        { name: 'price', type: 'number', required: true, min: 0 },
        { name: 'originalPrice', type: 'number', min: 0 },
      ],
    },
    { name: 'region', type: 'text' },
    { name: 'effectiveDate', type: 'date', required: true },
    { name: 'notes', type: 'textarea' },
  ],
}
```

### Promotion Override Pattern (example)

```typescript
// In promotions collection
{
  name: 'pricingOverrides',
  type: 'array',
  fields: [
    { name: 'variantId', type: 'text', required: true },
    { name: 'promoPrice', type: 'number', required: true, min: 0 },
    { name: 'originalPrice', type: 'number', min: 0 },
    { name: 'downPayment', type: 'number', min: 0 },
    { name: 'interestRate', type: 'number', min: 0 },
  ],
}
```

**UI rule:** หน้า Promotion ต้องแสดง `pricingOverrides` ถ้ามี ไม่งั้น fallback ไปที่ `model-pricing` ตาม `modelSlug`

## Globals

Globals are single-instance documents (not collections).

```typescript
import type { GlobalConfig } from 'payload'

export const Header: GlobalConfig = {
  slug: 'header',
  label: 'Header',
  admin: {
    group: 'Settings',
  },
  fields: [
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'nav',
      type: 'array',
      maxRows: 8,
      fields: [
        {
          name: 'link',
          type: 'relationship',
          relationTo: 'pages',
        },
        {
          name: 'label',
          type: 'text',
        },
      ],
    },
  ],
}
```

<3
