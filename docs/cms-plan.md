# Mum 'n' Hun — Custom CMS Plan

> **Dokumen Perencanaan CMS Admin Dashboard**
> Versi 1.0 · Februari 2026

---

## 1. Ringkasan Proyek

Custom CMS untuk **mumnhun.id** — sebuah admin dashboard yang memberikan kontrol penuh atas konten website, SEO, dan integrasi AI assistant (Google Gemini) untuk automasi konten dan optimasi SEO.

### Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Database | Supabase PostgreSQL (Prisma 7 ORM) |
| Auth | Supabase Auth (Magic Link / Email+Password) |
| Styling | Tailwind CSS 4 |
| Media | Cloudinary (URL-based) |
| AI | Google Gemini API (multi-key rotary) |
| Deployment | Vercel |

### Data Saat Ini

- **306+ artikel** (migrasi dari WordPress)
- **7 kategori** + **401 tag**
- Model Page untuk halaman statis
- HeroSection untuk slider homepage

---

## 2. Arsitektur CMS

### 2.1 Route Structure

```
app/
├── admin/                          # Admin dashboard (protected)
│   ├── layout.tsx                  # Admin shell: sidebar + topbar
│   ├── page.tsx                    # Dashboard overview
│   │
│   ├── posts/                      # Manajemen Artikel
│   │   ├── page.tsx                # Daftar artikel + filter/search
│   │   ├── new/page.tsx            # Buat artikel baru
│   │   └── [id]/edit/page.tsx      # Edit artikel
│   │
│   ├── categories/page.tsx         # Manajemen Kategori
│   ├── tags/page.tsx               # Manajemen Tag
│   ├── pages/                      # Manajemen Halaman Statis
│   │   ├── page.tsx
│   │   └── [id]/edit/page.tsx
│   │
│   ├── media/page.tsx              # Media Library (Cloudinary URLs)
│   ├── hero/page.tsx               # Hero Section Manager
│   │
│   ├── seo/                        # SEO Tools
│   │   ├── page.tsx                # SEO Overview + Scanner
│   │   └── pages/page.tsx          # Per-page SEO settings
│   │
│   ├── settings/                   # Pengaturan
│   │   ├── page.tsx                # General settings (site info)
│   │   ├── navigation/page.tsx     # Nav & footer links
│   │   ├── social/page.tsx         # Social media links
│   │   └── ai/page.tsx             # AI API keys config
│   │
│   ├── ai/                         # AI Tools
│   │   ├── page.tsx                # AI Dashboard
│   │   ├── generate/page.tsx       # Generate artikel dari keyword
│   │   ├── rewrite/page.tsx        # Rewrite artikel dari URL
│   │   ├── internal-links/page.tsx # AI internal link builder
│   │   └── scanner/page.tsx        # Website scanner (SEO/perf)
│   │
│   └── chat/page.tsx               # AI Chatbox Assistant
│
├── api/admin/                      # API Routes (protected)
│   ├── posts/route.ts
│   ├── categories/route.ts
│   ├── tags/route.ts
│   ├── pages/route.ts
│   ├── media/route.ts
│   ├── hero/route.ts
│   ├── settings/route.ts
│   ├── seo/route.ts
│   ├── ai/
│   │   ├── chat/route.ts
│   │   ├── generate/route.ts
│   │   ├── rewrite/route.ts
│   │   ├── seo/route.ts
│   │   ├── internal-links/route.ts
│   │   └── scan/route.ts
│   └── auth/route.ts
│
├── login/page.tsx                  # Admin login page
```

### 2.2 Database Schema (Tambahan/Modifikasi)

#### Model Baru

```prisma
// =============================================================================
// SITE SETTINGS (menggantikan hardcoded constants)
// =============================================================================
model SiteSetting {
  id          String   @id @default(cuid())
  key         String   @unique  // e.g., "site_name", "site_description"
  value       String   // JSON string untuk data kompleks
  type        String   @default("text") // text, json, image, url
  group       String   @default("general") // general, seo, social, footer, nav
  label       String?  // Human-readable label
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([group])
  @@map("site_settings")
}

// =============================================================================
// AI API KEYS (encrypted, rotary support)
// =============================================================================
model AiApiKey {
  id          String   @id @default(cuid())
  provider    String   @default("gemini") // gemini, openai
  apiKey      String   @map("api_key") // Encrypted (server-side)
  label       String?  // "Key 1", "Key 2"
  isActive    Boolean  @default(true) @map("is_active")
  usageCount  Int      @default(0) @map("usage_count")
  lastUsedAt  DateTime? @map("last_used_at")
  order       Int      @default(0) // Urutan rotasi
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("ai_api_keys")
}

// =============================================================================
// AI CHAT HISTORY
// =============================================================================
model AiChatMessage {
  id          String   @id @default(cuid())
  role        String   // "user" | "assistant"
  content     String
  metadata    String?  // JSON: model used, tokens, etc.
  sessionId   String   @map("session_id") // Group messages by session
  userId      String   @map("user_id")
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([sessionId])
  @@index([userId])
  @@map("ai_chat_messages")
}

// =============================================================================
// AI TASK QUEUE (untuk generate/rewrite batch)
// =============================================================================
model AiTask {
  id          String     @id @default(cuid())
  type        String     // "generate_article", "rewrite_article", "seo_optimize", "internal_links"
  status      String     @default("pending") // pending, processing, completed, failed
  input       String     // JSON: keywords, URLs, etc.
  output      String?    // JSON: generated content, results
  error       String?
  progress    Int        @default(0) // 0-100
  userId      String     @map("user_id")
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")
  completedAt DateTime?  @map("completed_at")

  @@index([status])
  @@index([userId])
  @@map("ai_tasks")
}

// =============================================================================
// SEO SCHEMA (Structured Data per halaman/artikel)
// =============================================================================
model SeoSchema {
  id          String   @id @default(cuid())
  entityType  String   @map("entity_type") // "post", "page", "homepage"
  entityId    String?  @map("entity_id") // null = global
  schemaType  String   @map("schema_type") // "Article", "FAQPage", "LocalBusiness", etc.
  schemaData  String   @map("schema_data") // JSON-LD content
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([entityType, entityId])
  @@map("seo_schemas")
}

// =============================================================================
// SCHEDULED POSTS (cron-based publishing)
// =============================================================================
// Ditambahkan field di Post model:
// scheduledAt DateTime? @map("scheduled_at")
// PostStatus enum + SCHEDULED
```

#### Modifikasi Model Existing

```prisma
// Post model — field tambahan:
model Post {
  // ... existing fields ...
  scheduledAt   DateTime?  @map("scheduled_at")    // Untuk artikel terjadwal
  focusKeywords String?    @map("focus_keywords")   // Comma-separated keywords
  ogTitle       String?    @map("og_title")
  ogDescription String?    @map("og_description")
  schemaType    String?    @map("schema_type")      // "Article", "BlogPosting", dll
  schemaData    String?    @map("schema_data")      // Custom JSON-LD
  internalLinks String?    @map("internal_links")   // JSON: [{url, anchor, context}]
}

// PostStatus enum — tambah SCHEDULED:
enum PostStatus {
  DRAFT
  PUBLISHED
  SCHEDULED  // NEW
  ARCHIVED
}

// Page model — field SEO tambahan:
model Page {
  // ... existing fields ...
  focusKeyword    String?  @map("focus_keyword")
  ogImage         String?  @map("og_image")
  ogTitle         String?  @map("og_title")
  ogDescription   String?  @map("og_description")
  schemaType      String?  @map("schema_type")
  schemaData      String?  @map("schema_data")
  canonicalUrl    String?  @map("canonical_url")
}
```

---

## 3. Fitur Detail

### 3.1 Site Settings Management

#### General Settings

- **Site Icon** (favicon) — URL Cloudinary
- **Logo Website** — URL Cloudinary (header + footer)
- **Site Title** — nama website
- **Site Description** — tagline/deskripsi website
- **Contact Info** — email, phone, address, jam kerja

#### Navigation Settings

- **Header Nav Links** — CRUD, drag-to-reorder
- **Footer Links** — per kolom (Layanan, Kontak, Legal)

#### Social Media Settings

- **Instagram URL**
- **Facebook URL**
- **Twitter/X URL**
- **TikTok URL**
- **YouTube URL**
- **YouTube Homepage Embed** — video URL yang muncul di homepage

#### Implementasi

Data disimpan di tabel `site_settings` dengan format key-value. Group digunakan untuk organisasi UI. Pada sisi frontend, `lib/constants.ts` digantikan dengan fetch dari database yang di-cache menggunakan Next.js `unstable_cache` / ISR.

```typescript
// Contoh penggunaan
const siteName = await getSetting('site_name')
const navLinks = await getSetting('nav_links') // JSON parsed
const socialLinks = await getSettingsByGroup('social')
```

---

### 3.2 Content Management

#### Artikel (Posts)

- **CRUD** lengkap dengan rich text editor (TipTap atau similar)
- **Status**: Draft, Published, Scheduled, Archived
- **Scheduling**: set tanggal & waktu publish (cron job via Supabase pg_cron atau Vercel Cron)
- **Kategori & Tag**: multi-select dengan autocomplete
- **Featured Image**: input URL Cloudinary
- **Slug**: auto-generate dari title, editable
- **Reading Time**: auto-calculate
- **Revision History**: simpan 5 versi terakhir

#### Kategori

- **CRUD** dengan slug auto-generate
- **Description** untuk SEO
- **Post count** display

#### Tag

- **CRUD** dengan slug auto-generate
- **Bulk actions**: merge, delete unused

#### Halaman Statis (Pages)

- **CRUD** untuk Petunjuk, Syarat, Kontak, dll
- **SEO settings** per halaman

#### Media Library

- **Input URL Cloudinary** — paste URL, simpan metadata
- **Gallery view** dengan preview
- **Copy URL** quick action
- **Filter & search**

#### Hero Section

- **CRUD** slides untuk hero carousel
- **Drag-to-reorder** slides
- **Preview** tampilan

---

### 3.3 SEO Management

#### Per-Artikel & Per-Halaman SEO

- **Meta Title** (dengan preview character count)
- **Meta Description** (dengan preview character count)
- **Focus Keywords** (primary + secondary)
- **Canonical URL**
- **Featured Image / OG Image**
- **OG Title & Description**
- **Schema/Structured Data**:
  - Article, BlogPosting, FAQPage, HowTo, LocalBusiness
  - JSON-LD editor dengan template
  - Preview structured data
- **SEO Score** indicator (word count, keyword density, readability)

#### Global SEO Settings

- **Default OG Image**
- **robots.txt** configuration
- **Sitemap** settings
- **Global Schema** (Organization, LocalBusiness)
- **Google Analytics / Search Console** tracking codes

#### SEO Scanner (AI-powered + rule-based)

- Scan per artikel atau batch
- Check: meta tags, headings structure, image alt, keyword density
- Score: 0-100 dengan rekomendasi

---

### 3.4 AI Assistant Integration

#### API Key Management

- Simpan hingga **5 API key** Google Gemini
- **Auto-rotary**: algoritma round-robin + rate-limit aware
- **Encrypted storage** di database (AES-256-GCM, key dari env variable)
- Status indicator per key (active, rate-limited, error)
- Usage tracking per key

```typescript
// Algoritma rotasi
async function getNextApiKey(): Promise<string> {
  const keys = await prisma.aiApiKey.findMany({
    where: { isActive: true },
    orderBy: [{ usageCount: 'asc' }, { order: 'asc' }],
  })
  // Ambil key dengan usage count terendah
  const selectedKey = keys[0]
  // Update usage
  await prisma.aiApiKey.update({
    where: { id: selectedKey.id },
    data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
  })
  return decrypt(selectedKey.apiKey)
}
```

#### Fitur AI 1: SEO Optimizer

- **Mode Auto**: AI generate semua SEO fields sekaligus (meta title, description, keywords, schema)
- **Mode Semi-Auto**: AI suggest, user edit sebelum save
- **Mode Manual**: user tulis sendiri, AI hanya validasi/score
- Batch optimize: pilih banyak artikel, optimize satu per satu
- Input: content artikel + context brand
- Output: optimized SEO fields

#### Fitur AI 2: Article Generator

- **Input**: daftar keyword/topik (1 atau banyak)
- **Proses**:
  1. AI expand topik → daftar keyword turunan (LSI keywords)
  2. AI buat outline per keyword
  3. AI generate artikel lengkap (2000+ kata)
  4. Termasuk: judul, meta description, slug, internal links
  5. Format HTML yang SEO-friendly (proper headings, lists, etc.)
- **Batch mode**: queue system, proses satu per satu
- **EEAT-focused**: expertise, experience, authoritativeness, trustworthiness
- Progress tracker real-time via polling/SSE

#### Fitur AI 3: Article Rewriter

- **Input**: daftar URL artikel sumber
- **Proses**:
  1. Scrape/fetch content dari URL
  2. AI tulis ulang 100% unik, bebas plagiarisme
  3. Sesuaikan gaya bahasa brand (formal-friendly, Bahasa Indonesia)
  4. Tambah value: informasi tambahan, data, contoh
  5. Generate judul baru + meta description
  6. Optimasi SEO otomatis
- **Output**: artikel draft siap publish/edit
- Batch mode dengan progress tracker

#### Fitur AI 4: Internal Link Builder

- **Scan** seluruh URL: artikel, tag, kategori
- **Build database** konteks per URL (judul, keyword, topik)
- **AI analisis** tiap artikel:
  - Identifikasi natural anchor text
  - Match dengan URL internal yang relevan
  - Sisipkan link secara kontekstual
- **Preview** before apply: tunjukkan dimana link akan disisipkan
- **Bulk apply** atau per artikel

#### Fitur AI 5: Website Scanner & Analyzer

- **SEO Score**: meta tags, headings, keywords, content quality
- **Security Check**: headers, HTTPS, CSP audit
- **Performance**: page speed insights (via API)
- **Content Audit**: thin content, duplicate, missing alt text
- **AI Analysis**: interpretasi hasil + rekomendasi actionable
- **Auto-fix**: AI bisa langsung melakukan perubahan jika user setuju

#### AI Chatbox Assistant

- **Floating chat** di sidebar admin dashboard
- **Contextual**: AI tahu tentang website, artikel, SEO data
- **Perintah**: bisa di-command untuk tugas spesifik:
  - "Analisa skor SEO artikel terbaru"
  - "Tulis ulang artikel [judul] agar lebih SEO friendly"
  - "Buat 5 artikel tentang tips menyusui"
  - "Scan dan perbaiki meta description yang kosong"
  - "Analisa trafik bulan ini"
- **History**: chat history tersimpan per session
- **Streaming**: response di-stream real-time

---

## 4. Authentication & Authorization

### Flow

1. Admin login via `/login` → Supabase Auth (email + password)
2. Session di-manage Supabase SSR helper (`@supabase/ssr`)
3. Middleware protect rute `/admin/*` dan `/api/admin/*`
4. Role-based: ADMIN (full access), AUTHOR (posts only)

### Implementasi

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Check auth for admin routes
  if (request.nextUrl.pathname.startsWith('/admin') ||
      request.nextUrl.pathname.startsWith('/api/admin')) {
    const supabase = createServerClient(/* ... */)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
}
```

---

## 5. UI/UX Design

### Dashboard Layout

- **Sidebar** (collapsible): navigasi utama
  - Dashboard, Posts, Categories, Tags, Pages, Media, Hero, SEO, AI Tools, Settings
- **Topbar**: search global, user info, quick actions
- **Content area**: responsive, fluid
- **AI Chat**: floating button bottom-right → expandable chatbox

### Design System

- **Dark mode** default untuk admin (dengan toggle)
- **Colors**: extended dari brand palette
  - Primary: `#382821` (dark brown)
  - Accent: `#466A68` (teal)
  - Surface: `#F4EEE7` (cream)
- **Components**: shadcn/ui base + custom styling
- **Animations**: subtle, professional (Framer Motion)

### Key UI Components

- **Rich Text Editor**: TipTap (headless, customizable)
- **Data Tables**: sortable, filterable, paginated
- **Form Modals**: create/edit dialogs
- **Toast Notifications**: success/error/info
- **Progress Bars**: untuk AI tasks
- **Command Palette**: Cmd+K quick actions

---

## 6. Implementasi Bertahap (Phases)

### Phase 1: Foundation (Week 1-2)
>
> Auth + Layout + Settings + Basic CRUD

- [ ] Supabase Auth setup (login page + middleware)
- [ ] Admin dashboard layout (sidebar, topbar)
- [ ] Database migration (new models + field additions)
- [ ] Site Settings CRUD (general, navigation, social)
- [ ] Frontend settings integration (replace hardcoded constants)

### Phase 2: Content Management (Week 3-4)
>
> Artikel + Kategori + Tag + Halaman + Media

- [ ] Posts CRUD (list, create, edit, delete)
- [ ] Rich text editor integration (TipTap)
- [ ] Post scheduling system (SCHEDULED status + cron)
- [ ] Categories & Tags CRUD
- [ ] Pages CRUD
- [ ] Media library (Cloudinary URL management)
- [ ] Hero section manager

### Phase 3: SEO Tools (Week 5)
>
> Per-page SEO + Schema + Scanner

- [ ] Per-article SEO editor (meta, keywords, OG, schema)
- [ ] Per-page SEO editor
- [ ] Global SEO settings
- [ ] SEO score calculator (rule-based)
- [ ] Schema/JSON-LD editor with templates

### Phase 4: AI Integration (Week 6-8)
>
> API Keys + AI Features + Chatbox

- [ ] AI API key management (encrypted, rotary)
- [ ] AI SEO optimizer (auto/semi/manual modes)
- [ ] AI article generator (keyword → article pipeline)
- [ ] AI article rewriter (URL → unique article)
- [ ] AI internal link builder (scan + insert)
- [ ] AI website scanner
- [ ] AI chatbox assistant

### Phase 5: Polish & Launch (Week 9)
>
> Testing, optimization, deployment

- [ ] End-to-end testing
- [ ] Performance optimization (caching, lazy loading)
- [ ] Security audit (RLS, input sanitization)
- [ ] Documentation
- [ ] Deploy ke production

---

## 7. Security Considerations

| Area | Implementasi |
|------|-------------|
| Auth | Supabase Auth + Row Level Security |
| API Keys | AES-256-GCM encryption, env-based master key |
| CSRF | Built-in Next.js protection |
| XSS | Sanitize HTML input (DOMPurify) |
| SQL Injection | Prisma parameterized queries |
| Rate Limiting | API route rate limiting (per IP) |
| Input Validation | Zod schema validation |
| Admin Routes | Middleware-protected, role-checked |

---

## 8. Caching Strategy

```
SiteSetting (DB) → unstable_cache (60s) → Frontend
                                        → Revalidate on save

Posts (DB) → ISR (revalidate: 3600) → Frontend
           → Revalidate on CRUD

AI Responses → In-memory cache (per session) → Chatbox
```

---

## 9. Dependencies Tambahan

```json
{
  "dependencies": {
    "@tiptap/react": "^2.x",          // Rich text editor
    "@tiptap/starter-kit": "^2.x",    // TipTap extensions
    "@tiptap/extension-link": "^2.x",
    "@tiptap/extension-image": "^2.x",
    "@google/generative-ai": "^0.x",  // Gemini API
    "framer-motion": "^12.x",         // Animations
    "dompurify": "^3.x",              // HTML sanitization
    "recharts": "^2.x",               // Dashboard charts
    "sonner": "^2.x",                 // Toast notifications
    "@dnd-kit/core": "^6.x",          // Drag & drop
    "cmdk": "^1.x"                    // Command palette
  }
}
```

---

## 10. API Routes Summary

| Method | Route | Fungsi |
|--------|-------|--------|
| GET/POST | `/api/admin/posts` | List / Create post |
| GET/PUT/DELETE | `/api/admin/posts/[id]` | Get / Update / Delete post |
| GET/POST | `/api/admin/categories` | List / Create category |
| PUT/DELETE | `/api/admin/categories/[id]` | Update / Delete category |
| GET/POST | `/api/admin/tags` | List / Create tag |
| PUT/DELETE | `/api/admin/tags/[id]` | Update / Delete tag |
| GET/POST | `/api/admin/pages` | List / Create page |
| PUT/DELETE | `/api/admin/pages/[id]` | Update / Delete page |
| GET/POST | `/api/admin/media` | List / Add media |
| DELETE | `/api/admin/media/[id]` | Delete media |
| GET/PUT | `/api/admin/settings` | Get / Update settings |
| GET/PUT | `/api/admin/settings/[group]` | Get / Update group |
| GET/POST | `/api/admin/hero` | List / Create hero |
| PUT/DELETE | `/api/admin/hero/[id]` | Update / Delete hero |
| POST | `/api/admin/ai/chat` | AI chat (streaming) |
| POST | `/api/admin/ai/generate` | Generate artikel |
| POST | `/api/admin/ai/rewrite` | Rewrite artikel |
| POST | `/api/admin/ai/seo` | Optimize SEO |
| POST | `/api/admin/ai/internal-links` | Build internal links |
| POST | `/api/admin/ai/scan` | Scan website |
| GET | `/api/admin/ai/tasks` | List AI tasks |
| GET | `/api/admin/ai/tasks/[id]` | Task progress |
| GET/POST/DELETE | `/api/admin/ai/keys` | Manage API keys |

---

## 11. Diagram Arsitektur

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Next.js  │  │ Admin    │  │ AI Chatbox        │  │
│  │ Public   │  │ Dashboard│  │ (Streaming SSE)   │  │
│  │ Site     │  │ (React)  │  │                   │  │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────┘  │
│       │              │                 │             │
├───────┼──────────────┼─────────────────┼─────────────┤
│       │         API LAYER              │             │
│       │    ┌─────────┴────────────┐    │             │
│       │    │ /api/admin/* routes  │    │             │
│       │    │  • Auth middleware   │    │             │
│       │    │  • Zod validation    │    │             │
│       │    │  • Rate limiting     │    │             │
│       │    └───┬─────────┬────────┘    │             │
│       │        │         │             │             │
├───────┼────────┼─────────┼─────────────┼─────────────┤
│       │   DATA LAYER     │       AI LAYER            │
│  ┌────┴────┐  ┌──────────┴──┐  ┌──────┴──────────┐  │
│  │ Prisma  │  │ Supabase    │  │ Google Gemini   │  │
│  │ ORM     │  │ Auth        │  │ (5-key rotary)  │  │
│  └────┬────┘  └─────────────┘  └─────────────────┘  │
│       │                                              │
│  ┌────┴──────────────────────────────────────────┐   │
│  │         Supabase PostgreSQL                   │   │
│  │  posts │ categories │ tags │ settings │ ai_*  │   │
│  └───────────────────────────────────────────────┘   │
│                                                      │
│  ┌───────────────────────────────────────────────┐   │
│  │              Cloudinary CDN                   │   │
│  │        (media storage & delivery)             │   │
│  └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 12. Konvensi Kode

| Aspek | Konvensi |
|-------|----------|
| Naming | camelCase (vars), PascalCase (components), snake_case (DB) |
| File structure | Feature-based grouping |
| Imports | Absolute paths (`@/lib/...`) |
| Error handling | Try-catch + typed errors |
| Validation | Zod schemas for all inputs |
| API response | `{ success: boolean, data?, error? }` |
| Commits | Conventional commits (feat:, fix:, chore:) |

---

*Dokumen ini adalah blueprint teknis. Implementasi akan dilakukan secara bertahap sesuai Phase yang tercantum di atas.*
