import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export async function GET() {
  try {
    // fetch pins from DB
    const result = await sql`SELECT * FROM map_pins`
    const rows = result.rows || []

    const pins = rows.map((row: any) => {
      const rawType = (row.type || 'story').toLowerCase()
      const rawCategory = (row.category || '').toLowerCase()
      const lowerTitle = (row.title || '').toLowerCase()

      let pinType: 'story' | 'organization' | 'event' | 'resource' | 'Violation of Human Rights' = 'story'

      if (['story', 'organization', 'event', 'resource', 'violation of human rights'].includes(rawType)) {
        pinType = rawType === 'violation of human rights' ? 'Violation of Human Rights' : rawType as typeof pinType
      }

      if (['organization', 'event', 'resource', 'violation of human rights'].includes(rawCategory)) {
        pinType = rawCategory === 'violation of human rights' ? 'Violation of Human Rights' : rawCategory as typeof pinType
      }

      if (row.id?.includes('organization') || lowerTitle.includes('organization') || lowerTitle.includes('foundation') || lowerTitle.includes('center') || lowerTitle.includes('institute')) {
        pinType = 'organization'
      }

      if ((row.story || '').toLowerCase().includes('violation of human rights')) {
        pinType = 'Violation of Human Rights'
      }

      return {
        id: row.id,
        title: row.title,
        story: row.story,
        lat: Number(row.lat),
        lng: Number(row.lng),
        type: pinType,
        category: row.category,
        country: row.country,
        city: row.city
      }
    })

    return NextResponse.json({ pins })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch pins' }, { status: 500 })
  }
}
