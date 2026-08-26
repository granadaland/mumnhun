# SPESIFIKASI LENGKAP UI/UX, SISTEM, DAN ARSITEKTUR ADMIN DASHBOARD
> **Dokumen Panduan Duplikasi Sistem & Desain Dashboard ke Proyek Baru**
> *Tech Stack Target: Next.js (App Router), TypeScript, Tailwind CSS v4, Prisma ORM, PostgreSQL, Tiptap, NextAuth v5.*

---

## 1. IKHTISAR SISTEM (EXECUTIVE SUMMARY)

Dashboard Admin ini dirancang dengan gaya **Warm Luxury Editorial / Premium Nurturing Aesthetic**, menggabungkan manajemen konten CMS modern (Blog, Halaman, Kategori, Media) dengan ekosistem **AI Automation Suite** (Rotary Key Pool, Dedicated Task Models, SEO Scanner, Content Audit & 30-Day Editorial Calendar, Internal Link Suggester, dan External Agent API Tokens).

### Fitur Utama:
1. **Core CMS**: Manajemen Artikel (Post) dengan Rich Text Editor (Tiptap v3), Kategori, Tag, Halaman Statis, Media Manager (Cloudinary / Direct Upload), dan Hero Section Builder.
2. **SEO Suite**: Metadata preview, Focus Keyword Analyzer, XML Sitemap / Robots management, Schema (JSON-LD) Generator per entitas.
3. **AI Rotary Key Pool & Dedicated Models**: Multi-key Gemini & OpenAI-compatible failover pool, auto-load balancing, serta dedicated model routing per peran (`scanning`, `text`, `image`).
4. **AI Content Studio & Automation**: Audit konten otomatis, pembuat kalender editorial 30 hari, generator artikel, rewriter, internal links inserter, dan AI chat assistant.
5. **Keamanan Berlapis**: NextAuth v5, HMAC CSRF validation pada API mutasi, Rate Limiting per admin/IP, enkripsi AES-256 untuk API keys di database, dan Bearer Token untuk integrasi External Agent (Hermes, OpenClaw, dll).

---

## 2. DESIGN SYSTEM & UI/UX SPECIFICATION

### 2.1 Palet Warna (Color Tokens)

Dashboard ini mengusung palet warna hangat, ramah, dan profesional, menghindari warna generik terang:

| Nama Token | Hex Code | Penggunaan di UI |
|---|---|---|
| **Background Root** | `#F9F6F0` (Warm Cream / Linen) | Background seluruh halaman dashboard |
| **Card / Surface** | `#FFFFFF` (Pure White) | Card container, sidebar, form panel, popover |
| **Foreground Text** | `#0F0A09` (Charcoal Espresso) | Heading, teks utama, angka statistik |
| **Muted Text** | `#8C7A6B` (Warm Taupe) | Label subtitel, deskripsi, placeholder input |
| **Border Neutral** | `#D4BCAA` / `rgba(212,188,170,0.2)` | Border halus pada card, header, divider |
| **Primary Brand** | `#466A68` (Forest Sage / Deep Teal) | Tombol aksi utama, active menu indicator, badge AI |
| **Success / Live** | `#059669` / `bg-emerald-100` | Badge status "Published / Live", tombol simpan |
| **Warning / Draft** | `#D97706` / `bg-amber-100` | Badge status "Draft", peringatan |
| **Info / Scheduled**| `#2563EB` / `bg-blue-100` | Badge status "Scheduled", statistik jadwal |
| **Danger / Error** | `#DC2626` / `bg-rose-100` | Tombol Hapus, badge error, status gagal |

### 2.2 Tipografi & Font
- **Primary / Body Sans**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, `sans-serif`.
- **Display / Editorial Serif**: `"Playfair Display"`, `Georgia`, `serif` (digunakan pada judul hero/publikasi).
- **Scale Hierarchy**:
  - Greeting / Sub-heading: `text-xs font-bold uppercase tracking-widest text-[#8C7A6B]`
  - Main Page Title: `text-3xl lg:text-4xl font-extrabold text-[#0F0A09] tracking-tight`
  - Stat Number: `text-2xl lg:text-3xl font-extrabold text-[#0F0A09] tabular-nums`
  - Card Title: `text-sm font-bold uppercase tracking-widest text-[#0F0A09]`
  - Body Text: `text-sm font-medium text-[#0F0A09]`

### 2.3 Aturan Komponen & Micro-Interactions
1. **Cards**: `bg-white border border-[#D4BCAA]/20 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300`
2. **Stat Cards**: Icon dengan background pastel (`w-11 h-11 rounded-xl flex items-center justify-center`), dilengkapi efek zoom & rotasi halus saat hover (`group-hover:scale-[1.15] group-hover:rotate-6`).
3. **Buttons**:
   - *Primary*: `bg-[#466A68] hover:bg-[#385553] text-white rounded-xl font-medium px-4 py-2.5 shadow-sm transition-all active:scale-[0.98]`
   - *Secondary / Outline*: `bg-white border border-[#D4BCAA]/40 hover:border-[#466A68] text-[#0F0A09] rounded-xl px-4 py-2.5 transition-all`
   - *Danger*: `bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-xl px-4 py-2.5`
4. **Active State Sidebar**:
   - Item aktif memiliki pill background `bg-[#466A68]/10 text-[#466A68]`.
   - Ada strip vertikal di sisi kiri (`w-1 h-6 bg-[#466A68] rounded-r-full`).

---

## 3. STRUKTUR NAVIGASI & ARSITEKTUR HALAMAN

```
/admin
├── /admin (Overview Dashboard - Quick Stats, Recent Posts, Quick Actions)
├── /admin/monitoring (System health, API key statuses, error logs)
│
├── KONTEN
│   ├── /admin/posts (Tabel post, filter status/kategori/search, bulk actions)
│   ├── /admin/posts/new (Editor post baru dengan Tiptap & AI assistant)
│   ├── /admin/posts/[id]/edit (Edit post, live word count, SEO score, auto-slug)
│   ├── /admin/categories (CRUD Kategori dengan counter artikel)
│   ├── /admin/tags (CRUD Tag)
│   ├── /admin/pages (Manajemen halaman statis seperti Petunjuk, Syarat, Kontak)
│   ├── /admin/media (Media gallery, Cloudinary dropzone, crop, URL copy)
│   └── /admin/hero (Hero slider/banner configuration)
│
├── SEO
│   ├── /admin/seo (SEO Health Overview, status indexed, meta completeness)
│   ├── /admin/seo/schemas (JSON-LD Structured Data Builder)
│   └── /admin/seo/settings (Sitemap, Robots.txt, Google Search Console verification)
│
├── AI TOOLS
│   ├── /admin/ai (AI Hub & Dashboard Penggunaan)
│   ├── /admin/ai/content-audit (Scanner artikel otomatis -> 30-Day Content Calendar)
│   ├── /admin/ai/generate (Pembuat artikel 1-click berdasarkan keyword & outline)
│   ├── /admin/ai/rewrite (Paraphraser, Tone Changer, SEO enricher)
│   ├── /admin/ai/internal-links (AI link suggester & 1-click replacement injector)
│   ├── /admin/ai/scanner (On-page SEO & Content quality auditor)
│   └── /admin/chat (Asisten AI terintegrasi dengan konteks database website)
│
└── PENGATURAN
    ├── /admin/settings (Pengaturan umum, Nama website, Tagline, Favicon)
    ├── /admin/settings/navigation (Header & Footer menu drag-and-drop builder)
    ├── /admin/settings/social (Social media links & OpenGraph defaults)
    ├── /admin/settings/ai/models (Konfigurasi model per tugas: Scanning, Text, Image)
    ├── /admin/settings/ai (Rotary Key Pool: Tambah/Hapus Gemini / OpenAI keys)
    └── /admin/settings/agent-tokens (Pembuatan Bearer token untuk bot/agent eksternal)
```

---

## 4. SISTEM & WORKFLOW DETAIL

```mermaid
flowchart TD
    A[Admin User / Browser] -->|Login / Session| B[NextAuth v5 Middleware]
    B -->|Authorized| C[Admin Layout & Sidebar]
    C --> D[Admin Overview Page]
    
    subgraph Core_CMS[Core CMS Flow]
        E[Editor Post / Tiptap] -->|Save / Publish| F[API Mutasi Post]
        F -->|Validate CSRF & RateLimit| G[(PostgreSQL / Prisma)]
        H[Media Picker] -->|Upload| I[Cloudinary / Storage]
        I --> G
    end
    
    subgraph AI_Engine[AI Engine & Rotary Pool]
        J[AI Task: Generate / Audit / Links] --> K[Role Model Router]
        K -->|Task: Scanning| L1[Scanning Model]
        K -->|Task: Text Gen| L2[Text Rotary Pool]
        K -->|Task: Image Gen| L3[Image Provider]
        L2 -->|Key Rotation & Retry| M[Gemini / OpenAI API]
        M -->|Success| N[Save to AI Tasks / Post / Calendar]
    end
    
    subgraph External_Access[Agent Token Access]
        O[External Bot / Agent] -->|Bearer Token: mnh_...| P[SHA-256 Hash Verify]
        P -->|Check Scope: posts:write| F
    end

    C --> Core_CMS
    C --> AI_Engine
```

---

### 4.1 Autentikasi, Otorisasi, dan Keamanan API

1. **Proteksi Halaman Server-Side (`requireAdminPage`)**:
   - Dieksekusi di root `app/admin/layout.tsx`.
   - Mengecek session aktif via `auth()`.
   - Melakukan verifikasi database `prisma.user.findUnique({ where: { email } })` dan memastikan `role === 'ADMIN'` (atau email terdaftar pada `ADMIN_EMAILS` env).
   - Jika gagal, otomatis redirect ke `/login` atau `/`.

2. **Proteksi API Mutasi (`requireAdminMutationApi`)**:
   - Mencegah serangan CSRF dengan validasi custom HMAC header (`X-Admin-CSRF-Token`).
   - Menerapkan Rate Limiting berbasis token-bucket di memori (misal: max 60 request/menit per User ID).
   - Memastikan role admin masih valid secara real-time.

3. **Keamanan Penyimpanan Kunci AI (Encryption at Rest)**:
   - Semua API Key pihak ketiga (Google Gemini, OpenAI, Groq, dll.) dienkripsi menggunakan **AES-256-GCM** dengan master key `AI_ENCRYPTION_KEY` sebelum disimpan di tabel `ai_api_keys` atau `ai_role_models`.

4. **External Agent API Token (Bearer Auth)**:
   - Token format: `mnh_<random_hex>`.
   - Hanya nilai hash SHA-256 yang disimpan di database (`agent_api_tokens.token_hash`).
   - Plaintext token hanya ditampilkan 1 kali saat pembuatan.
   - Mendukung pembatasan `scopes` (contoh: `["posts:read", "posts:write", "ai:generate"]`).

---

### 4.2 Sistem AI Rotary Key Pool & Dedicated Role Models

Sistem ini memecahkan masalah rate-limit gratis (429 Too Many Requests) dan keharusan memakai model spesifik untuk tugas tertentu:

1. **Rotary Pool (`AiApiKey`)**:
   - Menyimpan hingga *N* API Key.
   - Saat pemanggilan AI, sistem mencari key aktif dengan `usageCount` terendah.
   - Jika key mengalami error (kuota habis / 429), sistem otomatis menandai `lastError`, meningkatkan failover counter, dan mencoba key berikutnya hingga max 3 kali attempt secara mulus.
2. **Dedicated Role Models (`AiRoleModel`)**:
   - Memetakan 3 peran independen:
     - `scanning`: Model dengan context window besar & efisien untuk membedah seluruh artikel.
     - `text`: Model kreatif (misal: Gemini 2.5 Flash / Claude 3.5 Sonnet) untuk membuat artikel, outline, dan metadata.
     - `image`: Model image-prompt atau text-to-image generator.

---

### 4.3 Flow Content Audit & 30-Day Editorial Calendar

1. Admin menekan tombol **"Jalankan Audit Konten"**.
2. Sistem mengumpulkan seluruh artikel yang berstatus `PUBLISHED` (judul, excerpt, kategori, fokus keyword).
3. Payload dikirim ke role model `scanning` dengan prompt analisis gap topik dan peluang SEO.
4. Model menghasilkan:
   - Ringkasan gap konten (`gap_summary`).
   - 30 ide artikel baru (`ContentIdea`) lengkap dengan target keyword, angle, outline ringkas, rekomendasi kategori, dan tanggal rilis terjadwal (`scheduledFor`).
5. Admin dapat membuka tampilan Kalender Editorial:
   - Tombol **"Generate Draft"**: Mengubah `ContentIdea` langsung menjadi `Post` berstatus `DRAFT` atau `SCHEDULED` secara otomatis dengan satu klik.

---

### 4.4 Flow Tiptap Rich Text Editor & AI Assistant Panel

1. **Split-Screen / Floating Layout**:
   - Area kiri: Input Judul, Slug generator otomatis, Tiptap WYSIWYG Canvas (Mendukung formatting Headings H2-H4, Blockquote, Bullet/Numbered List, Bold/Italic/Underline, Link popup, Image inserter dengan alt text, Table builder, dan Code block).
   - Area kanan (Accordion / Sidebar):
     - Panel Pengaturan Post (Status: Draft/Published/Scheduled, Tanggal Rilis, Kategori dropdown multi-select, Tag input).
     - Featured Image Dropzone (Uploader Cloudinary / Library Picker).
     - SEO Inspector (Meta Title, Meta Description, Focus Keyword input dengan indikator skor keterbacaan dan kepadatan kata kunci real-time).
     - AI Assistant Sidebar (Tombol untuk "Perluas Bagian", "Tulis Ulang Lebih Menarik", "Buat FAQ Otomatis", "Saran Internal Links").

---

## 5. SKEMA DATABASE LENGKAP (PRISMA SCHEMA)

Salin skema Prisma berikut ke file `prisma/schema.prisma` di proyek baru Anda:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  ADMIN
  AUTHOR
}

enum PostStatus {
  DRAFT
  PUBLISHED
  SCHEDULED
  ARCHIVED
}

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  name         String?
  role         Role      @default(AUTHOR)
  avatarUrl    String?   @map("avatar_url")
  passwordHash String?   @map("password_hash")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  posts        Post[]

  @@map("users")
}

model Post {
  id              String      @id @default(cuid())
  title           String
  slug            String      @unique
  content         String      @db.Text
  excerpt         String?     @db.Text
  featuredImage   String?     @map("featured_image")
  status          PostStatus  @default(DRAFT)
  publishedAt     DateTime?   @map("published_at")
  scheduledAt     DateTime?   @map("scheduled_at")
  readingTime     Int?        @map("reading_time")
  
  // SEO
  metaTitle       String?     @map("meta_title")
  metaDescription String?     @map("meta_description") @db.Text
  focusKeyword    String?     @map("focus_keyword")
  focusKeywords   String?     @map("focus_keywords")
  canonicalUrl    String?     @map("canonical_url")
  ogImage         String?     @map("og_image")
  ogTitle         String?     @map("og_title")
  ogDescription   String?     @map("og_description") @db.Text
  schemaType      String?     @map("schema_type")
  schemaData      String?     @map("schema_data") @db.Text
  internalLinks   String?     @map("internal_links") @db.Text

  // Provenance
  source          String      @default("manual")
  createdVia      String?     @map("created_via")
  
  authorId        String?     @map("author_id")
  author          User?       @relation(fields: [authorId], references: [id])
  
  categories      CategoriesOnPosts[]
  tags            TagsOnPosts[]
  contentIdeas    ContentIdea[]
  outgoingLinkSuggestions InternalLinkSuggestion[] @relation("LinkSuggestionSource")
  incomingLinkSuggestions InternalLinkSuggestion[] @relation("LinkSuggestionTarget")

  createdAt       DateTime    @default(now()) @map("created_at")
  updatedAt       DateTime    @updatedAt @map("updated_at")

  @@index([slug])
  @@index([status])
  @@index([publishedAt])
  @@map("posts")
}

model Category {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  description String?  @db.Text
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  posts       CategoriesOnPosts[]

  @@index([slug])
  @@map("categories")
}

model Tag {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  posts     TagsOnPosts[]

  @@index([slug])
  @@map("tags")
}

model CategoriesOnPosts {
  post       Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId     String   @map("post_id")
  category   Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  categoryId String   @map("category_id")
  assignedAt DateTime @default(now()) @map("assigned_at")

  @@id([postId, categoryId])
  @@map("categories_on_posts")
}

model TagsOnPosts {
  post       Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId     String   @map("post_id")
  tag        Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)
  tagId      String   @map("tag_id")
  assignedAt DateTime @default(now()) @map("assigned_at")

  @@id([postId, tagId])
  @@map("tags_on_posts")
}

model Page {
  id              String     @id @default(cuid())
  title           String
  slug            String     @unique
  content         String     @db.Text
  status          PostStatus @default(DRAFT)
  publishedAt     DateTime?  @map("published_at")
  
  metaTitle       String?    @map("meta_title")
  metaDescription String?    @map("meta_description") @db.Text
  focusKeyword    String?    @map("focus_keyword")
  ogImage         String?    @map("og_image")
  canonicalUrl    String?    @map("canonical_url")
  schemaType      String?    @map("schema_type")
  schemaData      String?    @map("schema_data") @db.Text

  createdAt       DateTime   @default(now()) @map("created_at")
  updatedAt       DateTime   @updatedAt @map("updated_at")

  @@index([slug])
  @@map("pages")
}

model Media {
  id          String   @id @default(cuid())
  filename    String
  mimeType    String   @map("mime_type")
  size        Int
  width       Int?
  height      Int?
  alt         String?
  caption     String?
  url         String
  source      String   @default("upload") // upload | unsplash | ai_generated
  publicId    String?  @map("public_id")
  aiPrompt    String?  @map("ai_prompt") @db.Text

  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("media")
}

model HeroSection {
  id               String   @id @default(cuid())
  title            String
  subtitle         String?
  imageUrl         String?
  imagePublicId    String?  @map("image_public_id")
  ctaPrimaryText   String   @default("Mulai Sekarang") @map("cta_primary_text")
  ctaPrimaryLink   String   @default("/#contact") @map("cta_primary_link")
  ctaSecondaryText String?  @map("cta_secondary_text")
  ctaSecondaryLink String?  @map("cta_secondary_link")
  isActive         Boolean  @default(true) @map("is_active")
  order            Int      @default(0)
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  @@map("hero_sections")
}

model SiteSetting {
  id          String   @id @default(cuid())
  key         String   @unique
  value       String   @db.Text
  type        String   @default("text") // text, json, image, url, html
  group       String   @default("general") // general, seo, social, navigation
  label       String?
  description String?
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([group])
  @@map("site_settings")
}

model AiApiKey {
  id          String    @id @default(cuid())
  provider    String    @default("gemini") // gemini | openai_compatible
  apiKey      String    @map("api_key")    // Encrypted AES-256
  label       String?
  baseUrl     String?   @map("base_url")
  model       String?   @map("model")
  capability  String    @default("text")   // text | image | embedding
  authStyle   String?   @map("auth_style")
  isActive    Boolean   @default(true)     @map("is_active")
  usageCount  Int       @default(0)        @map("usage_count")
  lastUsedAt  DateTime? @map("last_used_at")
  lastError   String?   @map("last_error") @db.Text
  order       Int       @default(0)
  createdAt   DateTime  @default(now())    @map("created_at")
  updatedAt   DateTime  @updatedAt        @map("updated_at")

  @@index([provider, capability])
  @@map("ai_api_keys")
}

model AiRoleModel {
  id          String    @id @default(cuid())
  role        String    @unique // "scanning" | "text" | "image"
  provider    String    @default("openai_compatible")
  apiKey      String    @map("api_key") // Encrypted AES-256
  baseUrl     String?   @map("base_url")
  model       String?   @map("model")
  label       String?
  isActive    Boolean   @default(true)  @map("is_active")
  usageCount  Int       @default(0)     @map("usage_count")
  lastUsedAt  DateTime? @map("last_used_at")
  lastError   String?   @map("last_error") @db.Text
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt     @map("updated_at")

  @@index([role, isActive])
  @@map("ai_role_models")
}

model AgentApiToken {
  id          String    @id @default(cuid())
  name        String
  tokenHash   String    @unique @map("token_hash")
  tokenPrefix String    @map("token_prefix")
  scopes      String    // Comma-separated or JSON array string
  isActive    Boolean   @default(true) @map("is_active")
  lastUsedAt  DateTime? @map("last_used_at")
  expiresAt   DateTime? @map("expires_at")
  revokedAt   DateTime? @map("revoked_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  @@index([isActive])
  @@map("agent_api_tokens")
}

model ContentAudit {
  id              String    @id @default(cuid())
  status          String    @default("pending") // pending | processing | completed | failed
  scannedPosts    Int       @default(0) @map("scanned_posts")
  ideaCount       Int       @default(0) @map("idea_count")
  linkCount       Int       @default(0) @map("link_count")
  gapSummary      String?   @map("gap_summary") @db.Text
  error           String?   @db.Text
  userId          String    @map("user_id")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  completedAt     DateTime? @map("completed_at")

  ideas           ContentIdea[]
  linkSuggestions InternalLinkSuggestion[]

  @@map("content_audits")
}

model ContentIdea {
  id                String        @id @default(cuid())
  title             String
  angle             String?       @db.Text
  outlineHtml       String?       @map("outline_html") @db.Text
  focusKeyword      String?       @map("focus_keyword")
  secondaryKeywords String?       @map("secondary_keywords")
  categorySlug      String?       @map("category_slug")
  rationale         String?       @db.Text
  scheduledFor      DateTime?     @map("scheduled_for")
  status            String        @default("pending") // pending | scheduled | drafted | published | dismissed
  order             Int           @default(0)

  auditId           String?       @map("audit_id")
  audit             ContentAudit? @relation(fields: [auditId], references: [id], onDelete: SetNull)
  postId            String?       @map("post_id")
  post              Post?         @relation(fields: [postId], references: [id], onDelete: SetNull)

  createdAt         DateTime      @default(now()) @map("created_at")
  updatedAt         DateTime      @updatedAt @map("updated_at")

  @@index([status])
  @@index([scheduledFor])
  @@map("content_ideas")
}

model InternalLinkSuggestion {
  id              String        @id @default(cuid())
  exactPhrase     String        @map("exact_phrase")
  replacementHtml String        @map("replacement_html") @db.Text
  targetUrl       String        @map("target_url")
  targetTitle     String?       @map("target_title")
  rationale       String?       @db.Text
  status          String        @default("pending") // pending | applied | dismissed
  appliedAt       DateTime?     @map("applied_at")

  sourcePostId    String        @map("source_post_id")
  sourcePost      Post          @relation("LinkSuggestionSource", fields: [sourcePostId], references: [id], onDelete: Cascade)
  targetPostId    String?       @map("target_post_id")
  targetPost      Post?         @relation("LinkSuggestionTarget", fields: [targetPostId], references: [id], onDelete: SetNull)

  auditId         String?       @map("audit_id")
  audit           ContentAudit? @relation(fields: [auditId], references: [id], onDelete: SetNull)

  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  @@index([sourcePostId, status])
  @@map("internal_link_suggestions")
}
```

---

## 6. IMPLEMENTASI SOURCE CODE TEMPLATE

### 6.1 Admin Layout Template (`app/admin/layout.tsx`)

```tsx
import { requireAdminPage } from "@/lib/security/admin"
import { AdminSidebar } from "@/components/admin/sidebar"

export const metadata = {
    title: "Admin Dashboard",
    robots: { index: false, follow: false },
}

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // 1. Verifikasi role ADMIN server-side
    await requireAdminPage()

    return (
        <div className="min-h-screen bg-[#F9F6F0] flex text-[#0F0A09]">
            {/* Sidebar Desktop & Mobile Drawer */}
            <AdminSidebar />

            {/* Main Area: Gunakan overflow-x-clip agar sticky toolbar pada editor berfungsi */}
            <div className="flex-1 flex flex-col min-h-screen overflow-x-clip">
                {/* Header / Top Bar */}
                <header className="h-16 border-b border-[#D4BCAA]/20 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 lg:px-8 sticky top-0 z-30">
                    <div className="lg:hidden w-10" /> {/* Spacer untuk tombol toggle mobile */}
                    <h2 className="text-[#8C7A6B] font-semibold text-xs hidden lg:block uppercase tracking-widest">
                        Admin Management Console
                    </h2>
                    <div className="flex items-center gap-4">
                        <a
                            href="/"
                            target="_blank"
                            rel="noreferrer"
                            className="bg-white border border-[#D4BCAA]/30 text-xs font-semibold px-3.5 py-1.5 rounded-lg text-[#8C7A6B] hover:text-[#466A68] hover:border-[#466A68]/40 hover:bg-[#466A68]/5 transition-all shadow-sm flex items-center gap-1.5"
                        >
                            Lihat Website ↗
                        </a>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
```

---

### 6.2 Admin Overview Page (`app/admin/page.tsx`)

```tsx
import prisma from "@/lib/db/prisma"
import {
    FileText, FolderOpen, Tags, TrendingUp, Clock,
    PenTool, BarChart3, Sparkles, MessageSquare, Settings, ArrowRight,
    CheckCircle2, AlertTriangle, XCircle,
} from "lucide-react"
import Link from "next/link"

async function getStats() {
    const [postCount, draftCount, categoryCount, tagCount, scheduledCount, pageCount, mediaCount] = await Promise.all([
        prisma.post.count({ where: { status: "PUBLISHED" } }),
        prisma.post.count({ where: { status: "DRAFT" } }),
        prisma.category.count(),
        prisma.tag.count(),
        prisma.post.count({ where: { status: "SCHEDULED" } }),
        prisma.page.count(),
        prisma.media.count(),
    ])

    const recentPosts = await prisma.post.findMany({
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            publishedAt: true,
            updatedAt: true,
        },
    })

    return { postCount, draftCount, categoryCount, tagCount, scheduledCount, pageCount, mediaCount, recentPosts }
}

export default async function AdminDashboardPage() {
    const stats = await getStats()

    const statCards = [
        { label: "Published", value: stats.postCount, icon: <FileText className="h-5 w-5" />, bg: "bg-emerald-100", text: "text-emerald-700", href: "/admin/posts?status=PUBLISHED" },
        { label: "Draft", value: stats.draftCount, icon: <Clock className="h-5 w-5" />, bg: "bg-amber-100", text: "text-amber-700", href: "/admin/posts?status=DRAFT" },
        { label: "Scheduled", value: stats.scheduledCount, icon: <TrendingUp className="h-5 w-5" />, bg: "bg-blue-100", text: "text-blue-700", href: "/admin/posts?status=SCHEDULED" },
        { label: "Kategori", value: stats.categoryCount, icon: <FolderOpen className="h-5 w-5" />, bg: "bg-purple-100", text: "text-purple-700", href: "/admin/categories" },
        { label: "Tag", value: stats.tagCount, icon: <Tags className="h-5 w-5" />, bg: "bg-pink-100", text: "text-pink-700", href: "/admin/tags" },
    ]

    const quickActions = [
        { label: "Tulis Artikel Baru", href: "/admin/posts/new", icon: <PenTool className="h-5 w-5" />, color: "bg-emerald-500 shadow-emerald-500/20" },
        { label: "SEO Dashboard", href: "/admin/seo", icon: <BarChart3 className="h-5 w-5" />, color: "bg-blue-500 shadow-blue-500/20" },
        { label: "AI Content Audit", href: "/admin/ai/content-audit", icon: <Sparkles className="h-5 w-5" />, color: "bg-purple-500 shadow-purple-500/20" },
        { label: "AI Chat Assistant", href: "/admin/chat", icon: <MessageSquare className="h-5 w-5" />, color: "bg-[#466A68] shadow-[#466A68]/20" },
        { label: "Pengaturan Sistem", href: "/admin/settings", icon: <Settings className="h-5 w-5" />, color: "bg-stone-600 shadow-stone-600/20" },
    ]

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Welcome Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-white border border-[#D4BCAA]/20 p-8 shadow-sm">
                <div className="relative z-10">
                    <p className="text-[#466A68] text-xs font-bold tracking-widest uppercase mb-1">Selamat Datang 👋</p>
                    <h1 className="text-3xl lg:text-4xl font-extrabold text-[#0F0A09] mb-3 tracking-tight">
                        Admin Overview
                    </h1>
                    <p className="text-[#8C7A6B] text-sm font-medium">
                        <span className="text-[#0F0A09] font-bold">{stats.postCount}</span> artikel published · <span className="text-[#0F0A09] font-bold">{stats.draftCount}</span> draft · <span className="text-[#0F0A09] font-bold">{stats.pageCount}</span> halaman statis · <span className="text-[#0F0A09] font-bold">{stats.mediaCount}</span> media aset
                    </p>
                </div>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {statCards.map((card) => (
                    <Link
                        key={card.label}
                        href={card.href}
                        className="group bg-white border border-[#D4BCAA]/20 hover:border-[#466A68]/40 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300"
                    >
                        <div className={`w-11 h-11 ${card.bg} rounded-xl flex items-center justify-center ${card.text} mb-4 group-hover:scale-[1.15] group-hover:rotate-6 transition-transform duration-300`}>
                            {card.icon}
                        </div>
                        <p className="text-2xl lg:text-3xl font-extrabold text-[#0F0A09] tabular-nums tracking-tight mb-1">{card.value}</p>
                        <p className="text-xs text-[#8C7A6B] font-bold uppercase tracking-widest">{card.label}</p>
                    </Link>
                ))}
            </div>

            {/* Content & Quick Actions */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Recent Articles (2 Kolom) */}
                <div className="xl:col-span-2 bg-white border border-[#D4BCAA]/20 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-[#D4BCAA]/20 bg-[#F9F6F0]/40">
                        <h2 className="font-bold text-[#0F0A09] text-xs uppercase tracking-widest">Artikel Terbaru</h2>
                        <Link href="/admin/posts" className="text-xs font-bold text-[#466A68] hover:underline flex items-center gap-1">
                            Lihat Semua <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>
                    <div className="divide-y divide-[#D4BCAA]/20 flex-1">
                        {stats.recentPosts.map((post) => (
                            <Link
                                key={post.id}
                                href={`/admin/posts/${post.id}/edit`}
                                className="flex items-center justify-between px-6 py-4 hover:bg-[#F9F6F0]/60 transition-colors group"
                            >
                                <div className="min-w-0 flex-1 mr-4">
                                    <p className="text-sm font-semibold text-[#0F0A09] truncate group-hover:text-[#466A68] transition-colors">{post.title}</p>
                                    <p className="text-xs text-[#8C7A6B] mt-1">{new Date(post.updatedAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}</p>
                                </div>
                                <span className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-md border ${
                                    post.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                                    post.status === "SCHEDULED" ? "bg-blue-100 text-blue-700 border-blue-200" :
                                    "bg-amber-100 text-amber-700 border-amber-200"
                                }`}>
                                    {post.status}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Quick Actions (1 Kolom) */}
                <div className="space-y-3">
                    <h2 className="text-xs font-bold text-[#8C7A6B] px-2 uppercase tracking-widest mb-4">Aksi Cepat</h2>
                    {quickActions.map((action) => (
                        <Link
                            key={action.label}
                            href={action.href}
                            className="flex items-center gap-4 bg-white border border-[#D4BCAA]/20 rounded-2xl p-4 hover:border-[#466A68]/30 shadow-sm hover:shadow-md transition-all duration-300 group"
                        >
                            <div className={`w-11 h-11 ${action.color} rounded-xl flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-300`}>
                                {action.icon}
                            </div>
                            <span className="text-sm text-[#0F0A09] font-semibold group-hover:text-[#466A68] transition-colors">{action.label}</span>
                            <ArrowRight className="h-4 w-4 text-[#D4BCAA] ml-auto group-hover:text-[#466A68] group-hover:translate-x-1 transition-all" />
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
```

---

## 7. PANDUAN LANGKAH DEMI LANGKAH DUPLIKASI KE PROJECT BARU

Jika Anda ingin mereplikasi dashboard ini ke project baru, ikuti urutan berikut:

### Langkah 1: Install Dependencies
```bash
npm install @prisma/client @radix-ui/react-slot @radix-ui/react-avatar clsx tailwind-merge lucide-react next-auth@beta bcryptjs zod
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-heading @tiptap/extension-image @tiptap/extension-link @tiptap/extension-table @tiptap/extension-text-align @tiptap/extension-underline
npm install cloudinary next-cloudinary
npm install -D prisma @tailwindcss/postcss tailwindcss tw-animate-css typescript @types/node @types/react @types/bcryptjs
```

### Langkah 2: Setup Environment Variables (`.env`)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
AUTH_SECRET="your-super-secret-nextauth-key-32-chars-min"
NEXTAUTH_URL="http://localhost:3000"
ADMIN_EMAILS="admin@example.com,superadmin@example.com"
AI_ENCRYPTION_KEY="32_char_random_hex_string_for_aes_encryption"

# Cloudinary (Media Uploader)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

### Langkah 3: Setup Prisma & Database
1. Letakkan isi skema dari **Bagian 5** ke `prisma/schema.prisma`.
2. Jalankan migrasi:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

### Langkah 4: Copy Core Modules & Components
Salin direktori berikut dari project ini:
- `components/admin/` (Sidebar, Post Editor, Tiptap, Cloudinary Uploader, SEO Scanner)
- `lib/security/` (`admin.ts`, `csrf.ts`, `rate-limit.ts`, `api-key-crypto.ts`)
- `lib/ai/` (`key-rotary.ts`, `provider.ts`, `openai-compatible.ts`)
- `app/admin/` (Layout & Page routes)
- `app/api/admin/` (Backend route handlers)

---
*Dokumen ini merupakan cetak biru spesifikasi resmi arsitektur Admin Dashboard.*
