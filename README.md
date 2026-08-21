# Mum 'n Hun - Blog Parenting Indonesia

Website layanan sewa freezer ASI. Dibangun dengan Next.js 16, TypeScript, Tailwind CSS, dan Supabase.

## 🚀 Tech Stack

- **Framework**: Next.js 16.1.6 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Database**: Supabase PostgreSQL
- **ORM**: Prisma 7
- **Deployment**: Vercel (recommended)

## 📁 Struktur Proyek

```
mumnhun-nextjs/
├── app/                    # Next.js App Router
│   ├── blog/              # Blog pages
│   ├── category/          # Category pages
│   ├── tag/               # Tag pages
│   ├── petunjuk/          # Guide page
│   ├── syarat-ketentuan/  # Terms page
│   ├── kontak/            # Contact page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Homepage
│   ├── sitemap.ts         # Dynamic sitemap
│   └── robots.ts          # Robots.txt
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Header, Footer, Container
│   ├── blog/              # PostCard, etc.
│   └── shared/            # Breadcrumbs, Pagination, SearchBar
├── lib/
│   ├── db/                # Prisma client & queries
│   ├── supabase/          # Supabase clients
│   ├── utils/             # Utility functions
│   └── constants.ts       # App constants
├── prisma/
│   └── schema.prisma      # Database schema
├── scripts/
│   └── import-wordpress.ts # WordPress import script
├── types/
│   └── wordpress.ts       # WordPress export types
└── wordpress-backup/      # Place WordPress JSON exports here
```

## 🛠️ Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Required variables:

- `DATABASE_URL` - Supabase PostgreSQL connection string
- `DIRECT_URL` - Direct database connection (for migrations)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `API_KEYS_ENCRYPTION_SECRET` - AES-256-GCM master key for stored AI API keys. Accepts `base64:<32 bytes>`, `hex:<32 bytes>`, or a passphrase (derived via scrypt). Rotating this value makes existing stored keys undecryptable.
- `CSRF_SECRET` - HMAC secret for admin mutation CSRF tokens
- `NEXT_PUBLIC_SITE_URL` - Canonical site origin (used for CSRF origin checks and agent `publicUrl`)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` - media storage

Optional variables:

- `AI_PROVIDER_ALLOWED_HOSTS` - Comma-separated allowlist of hostnames permitted as a custom OpenAI-compatible provider base URL (e.g. `api.openai.com,openrouter.ai`). When unset, any public host is allowed but private/loopback/link-local/metadata addresses are still blocked.
- `AI_PROVIDER_ALLOW_HTTP` - Set to `true` to permit plain `http` provider base URLs. Ignored when `NODE_ENV=production`.
- `UNSPLASH_ACCESS_KEY` / `PEXELS_API_KEY` - Free stock image providers. May also be stored as site settings `unsplash_access_key` / `pexels_api_key`.

### 2b. AI Providers, Images, and Agent Tokens

**Custom OpenAI-compatible providers.** In `/admin/settings/ai` you can register a provider by supplying a base URL (e.g. `https://api.openai.com/v1`), an API key, and a model. The server calls `{baseUrl}/chat/completions` for articles and `{baseUrl}/images/generations` for images. Base URLs are validated against an SSRF guard (https only, no embedded credentials, DNS resolved and checked against private/reserved ranges, redirects re-validated on every hop) before any outbound request. API keys are encrypted at rest with AES-256-GCM and never returned to the browser in plaintext.

**Images.** Featured images come from either a free stock provider (searched via `/api/admin/media/free-image`, then re-hosted into Cloudinary with attribution recorded) or AI generation (`/api/admin/ai/image`, requires an active key with `capability = "image"`). All ingested images are validated by magic bytes, capped at 10MB, and restricted to JPEG/PNG/WebP/GIF/AVIF — SVG is intentionally excluded.

**External agents.** Issue Bearer tokens in `/admin/settings/agent-tokens`, then call:

```bash
curl -X POST https://your-site/api/agent/articles \
  -H "Authorization: Bearer mnh_agent_..." \
  -H "Content-Type: application/json" \
  -d '{"mode":"generate","topic":"tips memilih layanan sewa","status":"DRAFT"}'
```

`mode: "content"` accepts ready-made HTML; `mode: "generate"` asks the configured AI provider to write the article. Scopes are enforced per request (`article:create`, `article:generate`, `article:publish`, `image:generate`), and publishing requires `article:publish` in addition to the create/generate scope. Only the SHA-256 hash of each token is stored, so the plaintext is shown exactly once.

### 3. Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

### 4. Import WordPress Content

1. Export your WordPress content as JSON files
2. Place them in `wordpress-backup/` folder:
   - `posts.json`
   - `categories.json`
   - `tags.json`
   - `pages.json` (optional)

3. Run the import:

```bash
# Preview what will be imported (dry run)
npm run import:dry-run

# Actually import the data
npm run import
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📝 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push schema to database |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:studio` | Open Prisma Studio |
| `npm run import:dry-run` | Preview WordPress import |
| `npm run import` | Run WordPress import |

## 🌐 Routes

| Route | Description |
|-------|-------------|
| `/` | Homepage |
| `/blog` | Blog list with pagination |
| `/[slug]` | Blog post detail |
| `/category/[slug]` | Posts by category |
| `/tag/[slug]` | Posts by tag |
| `/petunjuk` | Site guide/instructions |
| `/syarat-ketentuan` | Terms & conditions |
| `/kontak` | Contact page |
| `/sitemap.xml` | Dynamic XML sitemap |
| `/robots.txt` | Robots.txt |

## 🎨 Design System

### Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| mumnhun-50 | #FFF8F0 | Backgrounds |
| mumnhun-100 | #FFE4CC | Subtle highlights |
| mumnhun-600 | #FF7744 | Primary actions |
| mumnhun-700 | #E65522 | Hover states |

### Typography

- **Font**: Inter (Google Fonts)
- **Language**: Indonesian (Bahasa Indonesia)

## 🚀 Deployment

This project is optimized for Vercel deployment:

```bash
vercel deploy
```

Or connect your GitHub repo to Vercel for automatic deployments.

## 📄 License

Copyright © 2026 Mum 'n Hun. All rights reserved.
