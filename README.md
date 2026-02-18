# Mum 'n' Hun - Blog Parenting Indonesia

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

Copyright © 2026 Mum 'n' Hun. All rights reserved.
