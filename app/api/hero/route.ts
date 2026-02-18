import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

function authorizeAdminMutation(request: Request): NextResponse | null {
  const configuredSecret = process.env.ADMIN_API_SECRET

  if (!configuredSecret) {
    console.error('ADMIN_API_SECRET is not configured for hero mutation endpoint')
    return NextResponse.json(
      { error: 'Service temporarily unavailable' },
      { status: 503 }
    )
  }

  const providedSecret = request.headers.get('x-admin-secret')

  if (!providedSecret || providedSecret !== configuredSecret) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return null
}

export async function GET() {
  try {
    const slides = await prisma.heroSection.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    })

    return NextResponse.json(slides)
  } catch (error) {
    console.error('Error fetching hero slides:', error)
    return NextResponse.json(
      { error: 'Failed to fetch hero slides' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const authError = authorizeAdminMutation(request)
  if (authError) {
    return authError
  }

  try {
    const body = await request.json()
    const { imageUrl, imagePublicId } = body

    const hero = await prisma.heroSection.upsert({
      where: { id: 'default_hero' },
      update: {
        imageUrl,
        imagePublicId,
        updatedAt: new Date()
      },
      create: {
        id: 'default_hero',
        title: 'Kualitas ASI Terjaga, Hati Ibu Tenang',
        subtitle: 'Layanan sewa freezer ASI premium dengan standar medis.',
        imageUrl,
        imagePublicId
      }
    })

    return NextResponse.json(hero)
  } catch (error) {
    console.error('Error updating hero:', error)
    return NextResponse.json(
      { error: 'Failed to update hero image' },
      { status: 500 }
    )
  }
}
