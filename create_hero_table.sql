-- Create hero_sections table
CREATE TABLE IF NOT EXISTS "hero_sections" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "imageUrl" TEXT,
    "imagePublicId" TEXT,
    "ctaPrimaryText" TEXT NOT NULL DEFAULT 'Cek Harga Sewa',
    "ctaPrimaryLink" TEXT NOT NULL DEFAULT '/#pricing',
    "ctaSecondaryText" TEXT DEFAULT 'Konsultasi Gratis',
    "ctaSecondaryLink" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hero_sections_pkey" PRIMARY KEY ("id")
);

-- Insert default hero data
INSERT INTO "hero_sections" ("id", "title", "subtitle", "updatedAt")
VALUES (
    'default_hero',
    'Kualitas ASI Terjaga, Hati Ibu Tenang',
    'Layanan sewa freezer ASI premium dengan standar medis. Unit steril, hemat energi, dan pengiriman cepat se-Jabodetabek.',
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING;
