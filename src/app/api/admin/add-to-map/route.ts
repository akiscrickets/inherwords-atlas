import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { sql } from '@vercel/postgres'

// Simple geocoding function with fallback
async function getCoordinates(city: string, country: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const location = city ? `${city}, ${country}` : country
    
    // Add User-Agent header to avoid blocking
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`, {
      headers: {
        'User-Agent': 'InHerWords/1.0'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      }
    }
  } catch (error) {
    console.error('Geocoding error:', error)
  }
  
  // Fallback: return approximate coordinates for some major countries
  const countryFallbacks: { [key: string]: { lat: number; lng: number } } = {
    'United States': { lat: 39.8283, lng: -98.5795 },
    'Canada': { lat: 56.1304, lng: -106.3468 },
    'United Kingdom': { lat: 55.3781, lng: -3.4360 },
    'Australia': { lat: -25.2744, lng: 133.7751 },
    'Germany': { lat: 51.1657, lng: 10.4515 },
    'France': { lat: 46.2276, lng: 2.2137 },
    'India': { lat: 20.5937, lng: 78.9629 },
    'Brazil': { lat: -14.2350, lng: -51.9253 },
    'Mexico': { lat: 23.6345, lng: -102.5528 },
    'Ireland': { lat: 53.1424, lng: -7.6921 },
    'Italy': { lat: 41.8719, lng: 12.5674 },
    'Spain': { lat: 40.4637, lng: -3.7492 },
    'Netherlands': { lat: 52.1326, lng: 5.2913 },
    'Japan': { lat: 36.2048, lng: 138.2529 },
    'South Korea': { lat: 35.9078, lng: 127.7669 }
  }
  
  const fallback = countryFallbacks[country]
  if (fallback) {
    console.log(`Using fallback coordinates for ${country}`)
    return fallback
  }
  
  // Ultimate fallback: center of the world
  console.log(`No coordinates found for ${location}, using world center`)
  return { lat: 0, lng: 0 }
}

export async function POST(request: NextRequest) {
  try {
    const { storyId, title, story, country, city, category, type } = await request.json()

    // Clean any "Organization:" prefix from the story content
    const cleanStory = story ? story.replace(/^Organization:\s*/, '') : ''

    console.log('🔄 Adding to map - RAW DATA:', { storyId, title, story: cleanStory ? `"${cleanStory.substring(0, 50)}..."` : 'MISSING', country, city, category, type })
    console.log('🔍 TYPE DEBUG:', { 
      receivedType: type, 
      typeOfType: typeof type, 
      isOrganization: type === 'organization',
      categoryReceived: category 
    })

    // Validate required fields
    if (!storyId || !title || !country) {
      console.error('❌ Missing required fields:', { storyId, title, country })
      return NextResponse.json({ error: 'Missing required fields: storyId, title, and country are required' }, { status: 400 })
    }

    // Get coordinates for the location
    console.log('🌍 Getting coordinates for:', city ? `${city}, ${country}` : country)
    const coordinates = await getCoordinates(city || '', country)
    if (!coordinates) {
      console.error('❌ Could not find coordinates for location')
      return NextResponse.json({ error: 'Could not find coordinates for location' }, { status: 400 })
    }

    console.log('📍 Coordinates found:', coordinates)

    // Robust pin type determination with support for event and resource
    const normalizedType = (type || 'story').toLowerCase()
    const normalizedCategory = (category || '').toLowerCase()
    const lowerTitle = (title || '').toLowerCase()
    const storyText = cleanStory || ''
    let pinType: 'story' | 'organization' | 'event' | 'resource' = 'story'
    
    // Explicit type if valid
    if (['story', 'organization', 'event', 'resource'].includes(normalizedType)) {
      pinType = normalizedType as typeof pinType
    }
    
    // Category hints
    if (['organization', 'event', 'resource'].includes(normalizedCategory)) {
      pinType = normalizedCategory as typeof pinType
    }
    
    // Content markers
    if (storyText.startsWith('TYPE:organization')) pinType = 'organization'
    if (storyText.startsWith('TYPE:event')) pinType = 'event'
    if (storyText.startsWith('TYPE:resource')) pinType = 'resource'
    
    // Title/id heuristics
    if (storyId?.includes('organization') || lowerTitle.includes('organization') || lowerTitle.includes('foundation') || lowerTitle.includes('center') || lowerTitle.includes('institute') || lowerTitle.startsWith('[org]')) {
      pinType = 'organization'
    } else if (lowerTitle.includes('event') || lowerTitle.includes('conference') || lowerTitle.includes('workshop') || lowerTitle.includes('webinar') || lowerTitle.includes('rally') || lowerTitle.includes('march')) {
      pinType = 'event'
    } else if (lowerTitle.includes('resource') || lowerTitle.includes('hotline') || lowerTitle.includes('shelter') || lowerTitle.includes('clinic') || lowerTitle.includes('guide') || lowerTitle.includes('support')) {
      pinType = 'resource'
    }

    console.log('🎯 PIN TYPE LOGIC:', {
      inputType: type,
      inputCategory: category,
      storyId,
      finalPinType: pinType
    })

    // Clean the title and story for display
    const cleanTitle = title?.startsWith('[ORG]') ? title.substring(5).trim() : title
    const finalStory = cleanStory?.startsWith('TYPE:organization\n') 
      ? cleanStory.substring(18)
      : cleanStory?.startsWith('TYPE:event\n')
        ? cleanStory.substring(11)
        : cleanStory?.startsWith('TYPE:resource\n')
          ? cleanStory.substring(14)
          : cleanStory

    // Create new pin object
    const newPin = {
      id: storyId,
      title: cleanTitle,
      story: finalStory,
      lat: coordinates.lat,
      lng: coordinates.lng,
      type: pinType,
      category: category || 'general',
      country: country,
      city: city || ''
    }

    // Try database first in production, fallback to file system
    if (process.env.NODE_ENV === 'production' && process.env.POSTGRES_URL) {
      // Production with database: Use Vercel Postgres
      console.log('💾 Using Vercel Postgres database')
      console.log('POSTGRES_URL exists:', !!process.env.POSTGRES_URL)
      try {
        // Try to insert with story field, fallback if column doesn't exist
        try {
          console.log('🔄 Attempting INSERT with story column...')
          const insertResult = await sql`
            INSERT INTO map_pins (id, title, story, lat, lng, type, category, country, city)
            VALUES (${storyId}, ${cleanTitle}, ${finalStory}, ${coordinates.lat}, ${coordinates.lng}, ${pinType}, ${category || 'general'}, ${country}, ${city || ''})
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
          console.log('✅ INSERT successful:', insertResult.rowCount, 'row(s) affected')
        } catch (columnError) {
          console.log('⚠️ Story column does not exist, using basic insert')
          console.error('Column error:', columnError)
          const insertResult = await sql`
            INSERT INTO map_pins (id, title, lat, lng, type, category, country, city)
            VALUES (${storyId}, ${cleanTitle}, ${coordinates.lat}, ${coordinates.lng}, ${pinType}, ${category || 'general'}, ${country}, ${city || ''})
            ON CONFLICT (id) DO UPDATE SET 
              title = EXCLUDED.title,
              lat = EXCLUDED.lat,
              lng = EXCLUDED.lng,
              type = EXCLUDED.type,
              category = EXCLUDED.category,
              country = EXCLUDED.country,
              city = EXCLUDED.city
          `
          console.log('✅ Basic INSERT successful:', insertResult.rowCount, 'row(s) affected')
        }
        
        // Verify the insert by querying back
        console.log('🔍 Verifying insert by querying back...')
        const verifyResult = await sql`
          SELECT id, title, type FROM map_pins WHERE id = ${storyId}
        `
        console.log('✅ Verification query result:', verifyResult.rows[0])
        
        console.log(`✅ Added pin to database for ${cleanTitle} at ${coordinates.lat}, ${coordinates.lng}`)
        console.log(`📝 Story content saved: ${finalStory ? `"${finalStory.substring(0, 50)}..."` : 'NO STORY'}`)
        console.log(`🎯 Pin type: ${pinType}`)
        return NextResponse.json({ success: true, coordinates, pin: newPin })
      } catch (dbError) {
        console.error('❌ Database error:', dbError)
        console.error('Error name:', (dbError as Error).name)
        console.error('Error message:', (dbError as Error).message)
        return NextResponse.json({ error: 'Failed to save pin to database', details: String(dbError) }, { status: 500 })
      }
    } else {
      // Local development: Use file system
      const filePath = path.join(process.cwd(), 'src/data/map-pins.json')
      let pins = []
      
      try {
        const fileContents = await fs.readFile(filePath, 'utf8')
        pins = JSON.parse(fileContents)
      } catch (error) {
        console.log('Creating new map-pins.json file')
      }

      // Add new pin (avoid duplicates)
      const existingIndex = pins.findIndex((pin: { id: string }) => pin.id === storyId)
      if (existingIndex >= 0) {
        pins[existingIndex] = newPin // Update existing
      } else {
        pins.push(newPin) // Add new
      }

      // Write back to file
      await fs.writeFile(filePath, JSON.stringify(pins, null, 2))
      
      console.log(`✅ Added pin for ${title} at ${coordinates.lat}, ${coordinates.lng}`)
      console.log(`📊 Total pins: ${pins.length}`)

      return NextResponse.json({ success: true, coordinates, pin: newPin })
    }
  } catch (error) {
    console.error('❌ Error adding to map:', error)
    return NextResponse.json({ error: 'Failed to add to map', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
