import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

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
