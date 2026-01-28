# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **PayloadCMS 3.x + Next.js 16** full-stack website for BYD MetroMobile Thailand. It uses:

- **Backend**: PayloadCMS (canary) with Vercel Postgres adapter
- **Frontend**: Next.js 16 App Router (canary) with TailwindCSS + shadcn/ui
- **Storage**: Vercel Blob Storage for media
- **Database**: Vercel Postgres (Neon) - SQL-based with migrations
- **Testing**: Vitest (integration) + Playwright (E2E)
- **Package Manager**: pnpm

## Commands

### Development

```bash
pnpm install              # Install dependencies
pnpm dev                  # Start development server (http://localhost:3000)
pnpm dev:prod             # Test production build locally
```

### Building & Production

```bash
pnpm build                # Build for production (runs Next.js build)
pnpm start                # Start production server
pnpm ci                   # CI build (runs migrations + build)
```

### Testing

```bash
# Integration tests (Vitest)
pnpm test:int             # Run integration tests (tests/int/**/*.int.spec.ts)

# E2E tests (Playwright)
pnpm test:e2e             # Run E2E tests (tests/e2e/**)
pnpm exec playwright test --ui  # Run with UI mode

# All tests
pnpm test                 # Runs both integration and E2E tests
```

### Payload CMS Operations

```bash
pnpm payload              # Open Payload CLI
pnpm generate:types       # Generate TypeScript types from schema
pnpm generate:importmap   # Regenerate admin component import map

# Database migrations (CRITICAL for Postgres)
pnpm payload migrate:create  # Create new migration after schema changes
pnpm payload migrate         # Run pending migrations
pnpm payload migrate:reset   # ⚠️ DANGER: Reset all migrations (drops data)
```

### Seeding

```bash
pnpm seed:admin           # Create admin user (bydmetro@nextmail.dev)
pnpm seed:globals         # Seed Header/Footer globals
# Or use the admin panel: http://localhost:3000/admin → "Seed database" link
```

### Code Quality

```bash
pnpm lint                 # Run ESLint
pnpm lint:fix             # Auto-fix linting issues
pnpm exec tsc --noEmit    # Type-check without emitting files
```

## Architecture & Key Patterns

### App Structure

```
src/
├── app/
│   ├── (frontend)/          # Public website (Next.js App Router)
│   │   ├── page.tsx         # Homepage
│   │   ├── [slug]/          # Dynamic pages
│   │   └── posts/           # Blog section
│   └── (payload)/           # Payload admin panel
│       ├── admin/[[...segments]]/  # Admin UI
│       └── api/[...slug]/   # REST API + GraphQL
├── collections/             # Payload collections (Pages, Posts, Promotions, etc.)
├── globals/                 # Global singletons (Header, Footer, PopupBanner)
├── blocks/                  # Reusable content blocks (Hero, CTA, Archive, etc.)
├── fields/                  # Reusable field configs
├── access/                  # Access control functions
├── hooks/                   # Lifecycle hooks
├── components/              # React components (Server + Client)
├── utilities/               # Helper functions
└── payload.config.ts        # Main Payload configuration
```

### Next.js 16 Important Notes

1. **Node.js requirement**: `>=20.9.0` (enforced in package.json)
2. **Canary packages**: Using Payload + Next.js canary versions for Next 16 support
3. **Revalidation API change**:
   - Use `revalidateTag(tag, profile)` with a profile (e.g., `'max'`)
   - `updateTag()` is for Server Actions only (do NOT use from Payload hooks)

### Database & Migrations

This project uses **Vercel Postgres** (SQL-based), which requires migrations:

1. **After schema changes** (adding/modifying collections/fields):
   ```bash
   pnpm payload migrate:create  # Generate migration files
   ```

2. **Before deployment**:
   ```bash
   pnpm payload migrate  # Apply pending migrations
   ```

3. **Development workflow**:
   - Postgres adapter has `push: true` in dev → auto-applies schema changes locally
   - Production requires explicit migrations (see DEPLOYMENT.md)

### Custom Collections

#### Promotions (Key Feature)

Located at `src/collections/Promotions/`

**Quick Entry Feature**: Bulk import from Rever website
- Paste HTML table (`benefitsHtml`) or plain text (`benefitsBulk`, `conditionsBulk`)
- Auto-parses into structured `benefits[]` and `conditions[]` arrays
- See [PROMOTIONS_MANUAL.md](docs/PROMOTIONS_MANUAL.md) for detailed workflow

**Revalidation**: Publishing/unpublishing triggers webhook to frontend:
- `POST {FRONTEND_URL}/api/revalidate/promotion`
- Uses `PAYLOAD_REVALIDATE_SECRET` for auth
- Revalidates Next.js cache tags

### On-Demand Revalidation Pattern

All content types (Pages, Posts, Promotions, Globals) use `afterChange` hooks:

```typescript
// Example: src/collections/Promotions/hooks/revalidatePromotion.ts
afterChange: [
  async ({ doc, previousDoc, req }) => {
    // Only revalidate if status changed to/from published
    if (doc._status === 'published' || previousDoc._status === 'published') {
      await fetch(`${FRONTEND_URL}/api/revalidate/promotion`, {
        method: 'POST',
        headers: {
          'x-revalidate-secret': process.env.PAYLOAD_REVALIDATE_SECRET,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ slug: doc.slug }),
      })
    }
  },
]
```

### Access Control

- **Public read**: `authenticatedOrPublished` - published content is public
- **Admin-only write**: `authenticated` - only logged-in users can modify
- Default user roles: `admin`, `editor`, `user` (see Users collection)

### Component Paths

Payload admin uses file-path-based components (not direct imports):

```typescript
// In payload.config.ts or collection configs
components: {
  beforeLogin: ['@/components/BeforeLogin'],  # Relative to baseDir
}
```

After adding/modifying components, regenerate import map:
```bash
pnpm generate:importmap
```

### Lexical Editor

Default rich text editor with custom config in `src/fields/defaultLexical.ts`:
- Supports blocks (Hero, CTA, Media, etc.)
- Link handling with internal/external detection
- Upload capabilities

### Storage

Media uploads use **Vercel Blob Storage**:
- Configured in `payload.config.ts` with `vercelBlobStorage` plugin
- Requires `BLOB_READ_WRITE_TOKEN` env var
- Images auto-generate sizes/focal points

## Environment Variables

Required vars (see `.env.example`):

```bash
# Database
POSTGRES_URL=postgresql://...              # Vercel Postgres connection string

# Payload Core
PAYLOAD_SECRET=<random-32-char-string>     # JWT signing secret
NEXT_PUBLIC_SERVER_URL=http://localhost:3000  # No trailing slash!

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=<vercel-blob-token>

# Cron Jobs (Vercel)
CRON_SECRET=<random-string>                # For scheduled tasks

# Preview Mode
PREVIEW_SECRET=<random-string>             # Draft previews

# Frontend Revalidation (Production)
FRONTEND_URL=https://bydmetromobile.com    # Frontend URL (no trailing slash)
PAYLOAD_REVALIDATE_SECRET=<random-string>  # Must match frontend
```

## Common Workflows

### Adding a New Collection

1. Create collection config: `src/collections/YourCollection.ts`
2. Import in `payload.config.ts` and add to `collections` array
3. Run `pnpm generate:types` to update TypeScript types
4. Create migration: `pnpm payload migrate:create`
5. Test locally, then deploy with migrations

### Adding a New Block (Layout Builder)

1. Create block config: `src/blocks/YourBlock/config.ts`
2. Add to relevant collection's `blocks` field (Pages/Posts)
3. Regenerate types: `pnpm generate:types`
4. Create frontend component: `src/blocks/YourBlock/Component.tsx`
5. Import in layout renderer

### Modifying Database Schema

1. Edit collection/global config
2. **Create migration**: `pnpm payload migrate:create`
3. Verify migration files in `src/migrations/`
4. Test migration: `pnpm payload migrate`
5. Commit migration files with code changes

### Testing Revalidation

```bash
# Test promotion revalidation webhook
curl -X POST https://bydmetromobile.com/api/revalidate/promotion \
  -H "x-revalidate-secret: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"slug": "test-promo"}'
```

## Payload Best Practices (This Project)

1. **Always regenerate types** after schema changes (`pnpm generate:types`)
2. **Pass `req` to nested operations** in hooks to maintain transactions
3. **Use `overrideAccess: false`** when passing `user` to Local API (security!)
4. **Check migration files** before committing schema changes
5. **Validate TypeScript** with `pnpm exec tsc --noEmit` after major changes
6. **Test build** with `pnpm build` before pushing (catches type/config errors)

## Key Files

- `src/payload.config.ts` - Main Payload configuration
- `src/payload-types.ts` - Auto-generated TypeScript types (DO NOT EDIT)
- `next.config.js` - Next.js configuration
- `vercel.json` - Vercel deployment settings
- `.cursor/rules/` - Detailed Payload development rules for AI assistants
- `AGENTS.md` - Full Payload development rules (comprehensive reference)
- `DEPLOYMENT.md` - Production deployment guide
- `docs/PROMOTIONS_MANUAL.md` - Content editor guide for Promotions

## Additional Resources

- [PayloadCMS Docs](https://payloadcms.com/docs)
- [Next.js App Router Docs](https://nextjs.org/docs)
- [Vercel Postgres Docs](https://vercel.com/docs/storage/vercel-postgres)
- Project-specific rules: `.cursor/rules/*.md` (access control, hooks, queries, etc.)

---

## 🛏️ Wake-up Plan (ตื่นมาทำไรต่อ)

**Last Update**: 2026-01-28
**Context**: Auto-slide feature added to PopupCarousel in frontend repo (byd-metromobile)

### Completed ✅
- [x] Added auto-slide functionality to `components/PopupCarousel.tsx` in **byd-metromobile**
  - Carousel auto-advances every 5 seconds when popup is open
  - Manual navigation (prev/next) still works
  - Stops auto-slide when popup closes
  - Commit: `12daa85` - feat(popup): add auto-slide to PopupCarousel

### Next Steps (ตั่งปุ๊ม)

#### 1️⃣ Frontend: Test Auto-slide in Browser
- **Repo**: `byd-metromobile`
- **What**: Visit staging/production and verify PopupCarousel slides automatically
- **Expected**: Popup shows → slides change every 5 seconds
- **Files**: `components/PopupCarousel.tsx` (already updated)

#### 2️⃣ Standardize Promotion JSON Schema for AI Consistency
- **Repo**: Both repos (`byd-metromobile` + `payload-metromobile`)
- **Why**: Ensure tutka & other AI agents generate consistent promotion structures
- **Steps**:
  1. **Create JSON Schema file**: `docs/PROMOTION_JSON_SCHEMA.md`
     - Define `StaticPromotion` interface standards
     - Define `PromotionBenefit` benefit types
     - Show required vs optional fields
     - Include examples for each benefit type
  2. **Create promotion generator template**: `docs/PROMOTION_GENERATOR_TEMPLATE.ts`
     - Provide copy-paste template for new promotions
     - Pre-filled common benefits (WARRANTY, INSURANCE, etc.)
     - Clear comments for AI guidance
  3. **Update frontend type definitions** (if needed):
     - Verify `types/promotion/index.ts` covers all Payload CMS fields
     - Add JSDoc comments for each field (helps AI understand purpose)
  4. **Update Payload CMS collection** (if needed):
     - Add field descriptions/hints in `src/collections/Promotions/index.ts`
     - Ensure all fields map to `StaticPromotion` interface
  5. **Document in both repos**:
     - Add section to `payload-metromobile/CLAUDE.md` → "Promotion JSON Standards"
     - Add section to `byd-metromobile/CLAUDE.md` → "Generating Promotions"
- **Files to create/update**:
  - `docs/PROMOTION_JSON_SCHEMA.md` (NEW)
  - `docs/PROMOTION_GENERATOR_TEMPLATE.ts` (NEW)
  - `src/types/promotion/index.ts` (add JSDoc comments)
  - Both repos `CLAUDE.md` (document standards)
- **Status**: 🔥 **HIGH PRIORITY** - enables consistent AI generation

#### 3️⃣ Payload CMS: Review ModelPricing Integration (Optional)
- **Repo**: `payload-metromobile`
- **What**: Check if ModelPricing collection updates are needed
- **Files**: `src/collections/ModelPricing/index.ts` (referenced in IDE)
- **Status**: ⏸️ **Optional** - only if new pricing tiers discussed

#### 4️⃣ Frontend: Adjust Auto-slide Interval (Optional)
- **If**: 5 seconds is too fast/slow for users
- **Edit**: `components/PopupCarousel.tsx` line 242 → change `5000` to desired ms
- **Examples**:
  - `3000` = 3 seconds (faster)
  - `8000` = 8 seconds (slower)
  - `10000` = 10 seconds (very slow)

#### 5️⃣ Add Analytics Tracking (Optional Enhancement)
- **What**: Track when users manually navigate vs auto-slide
- **Where**: `components/PopupCarousel.tsx` → hooks for `scrollNext/scrollPrev`
- **Benefit**: Understand if 5-second interval is optimal

#### 6️⃣ Deploy & Monitor
- **Frontend**: Push changes to `staging` → test → merge to `main`
- **Monitoring**: Check browser console (logs for any interval cleanup issues)
- **CMS**: No changes needed unless you adjust the interval config in Payload

### ⚡ Quick Start Commands
```bash
# Frontend (byd-metromobile)
pnpm dev              # Start dev server
pnpm lint            # Check code quality
pnpm build           # Test build locally

# Payload CMS (payload-metromobile) - if needed
pnpm dev             # Start CMS admin
pnpm generate:types  # Regenerate types after schema changes
```

### 💡 Notes for Later
- Auto-slide is hardcoded to **5 seconds** - consider making it configurable in Payload if users need flexibility
- Currently stops auto-slide only when popup is `!isOpen` - may want to pause on user hover (UX enhancement)
- No analytics tracking yet on carousel interactions

### 📞 Questions?
- **PopupCarousel behavior**: Check `components/PopupCarousel.tsx` lines 238-247 (useEffect auto-slide logic)
- **Payload integration**: Check `src/collections/ModelPricing/index.ts` (referenced file)
- **Frontend revalidation**: Check `app/api/revalidate/promotion/route.ts` (cache invalidation)
