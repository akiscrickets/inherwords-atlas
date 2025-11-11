import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const { title, story, lat, lng, type, category, country, city, id } = data

    const normalizedType = (type || 'story').toLowerCase()
    const normalizedCategory = (category || '').toLowerCase()
    const lowerTitle = (title || '').toLowerCase()
    const storyText = (story || '').toLowerCase()

    let pinType: 'story' | 'organization' | 'event' | 'resource' | 'Violation of Human Rights' = 'story'

    if (['story', 'organization', 'event', 'resource', 'violation of human rights'].includes(normalizedType)) {
      pinType = normalizedType === 'violation of human rights' ? 'Violation of Human Rights' : normalizedType as typeof pinType
    }

    if (['organization', 'event', 'resource', 'violation of human rights'].includes(normalizedCategory)) {
      pinType = normalizedCategory === 'violation of human rights' ? 'Violation of Human Rights' : normalizedCategory as typeof pinType
    }

    if (lowerTitle.includes('event') || lowerTitle.includes('conference') || lowerTitle.includes('workshop') || lowerTitle.includes('webinar') || lowerTitle.includes('rally') || lowerTitle.includes('march')) {
      pinType = 'event'
    } else if (lowerTitle.includes('resource') || lowerTitle.includes('hotline') || lowerTitle.includes('shelter') || lowerTitle.includes('clinic') || lowerTitle.includes('guide') || lowerTitle.includes('support')) {
      pinType = 'resource'
    }

    if (storyText.includes('violation of human rights')) pinType = 'Violation of Human Rights'

    await sql`
      INSERT INTO map_pins (id, title, story, lat, lng, type, category, country, city)
      VALUES (${id}, ${title}, ${story}, ${lat}, ${lng}, ${pinType}, ${category || 'general'}, ${country}, ${city || ''})
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        story = EXCLUDED.story,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        type = EXCLUDED.type,
        category = EXCLUDED.category,
        country = EXCLUDED.country,
        city = EXCLUDED.city
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add pin' }, { status: 500 })
  }
}