import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { sql } from '@vercel/postgres'

export async function GET() {
  try {
    if (process.env.NODE_ENV === 'production') {
      // Production: Read from Vercel Postgres database
      console.log('Loading map pins from database... (restart trigger)')
      
      try {
        // Try to get story field, fallback if column doesn't exist
        let result
        let hasStoryColumn = true
        try {
          result = await sql`
            SELECT id, title, story, lat, lng, type, category, country, city, created_at
            FROM map_pins
            ORDER BY created_at DESC
          `
        } catch (columnError) {
          console.log('Story column does not exist, using basic query')
          hasStoryColumn = false
          result = await sql`
            SELECT id, title, lat, lng, type, category, country, city, created_at
            FROM map_pins
            ORDER BY created_at DESC
          `
        }
        
        const pins = result.rows.map(row => {
          // Robust type detection for pins, supporting event and resource
          const rawType = (row.type || 'story').toLowerCase()
          const rawCategory = (row.category || '').toLowerCase()
          const lowerTitle = (row.title || '').toLowerCase()
          let pinType: 'story' | 'organization' | 'event' | 'resource' = 'story'
          
          // Prefer explicit correct types
          if (['story', 'organization', 'event', 'resource'].includes(rawType)) {
            pinType = rawType as typeof pinType
          }
          
          // Category hints
          if (['organization', 'event', 'resource'].includes(rawCategory)) {
            pinType = rawCategory as typeof pinType
          }
          
          // Heuristics by id/title
          if (row.id?.includes('organization') || lowerTitle.includes('organization') || lowerTitle.includes('foundation') || lowerTitle.includes('center') || lowerTitle.includes('institute')) {
            pinType = 'organization'
          } else if (lowerTitle.includes('event') || lowerTitle.includes('conference') || lowerTitle.includes('workshop') || lowerTitle.includes('webinar') || lowerTitle.includes('rally') || lowerTitle.includes('march')) {
            pinType = 'event'
          } else if (lowerTitle.includes('resource') || lowerTitle.includes('hotline') || lowerTitle.includes('shelter') || lowerTitle.includes('clinic') || lowerTitle.includes('guide') || lowerTitle.includes('support')) {
            pinType = 'resource'
          }
          
          return {
            id: row.id,
            title: row.title,
            story: hasStoryColumn ? (row.story || '') : '',
            lat: Number(row.lat),
            lng: Number(row.lng),
            type: pinType,
            category: row.category,
            country: row.country,
            city: row.city
          }
        })
        
        console.log(`Returning ${pins.length} pins from database`)
        console.log('Sample pin with story info:', pins[0] ? { id: pins[0].id, title: pins[0].title, story: pins[0].story ? 'HAS STORY' : 'NO STORY', storyLength: pins[0].story?.length || 0 } : 'No pins')
        return NextResponse.json({ pins })
      } catch (dbError) {
        console.error('Database error, using fallback pins:', dbError)
        // Fall through to fallback pins
      }
    } else {
      // Local development: Read from local JSON file
      console.log('Loading map pins from local file...')
      
      const filePath = path.join(process.cwd(), 'src/data/map-pins.json')
      const fileContents = await fs.readFile(filePath, 'utf8')
      const pinsRaw = JSON.parse(fileContents)
      
      // Normalize types to include event and resource heuristics
      const pins = pinsRaw.map((row: { 
        id?: string; 
        title?: string; 
        story?: string; 
        type?: string; 
        category?: string; 
        lat: number; 
        lng: number; 
        country?: string; 
        city?: string 
      }) => {
        const rawType = (row.type || 'story').toLowerCase()
        const rawCategory = (row.category || '').toLowerCase()
        const lowerTitle = (row.title || '').toLowerCase()
        const storyText = row.story || ''
        let pinType: 'story' | 'organization' | 'event' | 'resource' = 'story'
        
        if (['story', 'organization', 'event', 'resource'].includes(rawType)) pinType = rawType as typeof pinType
        if (['organization', 'event', 'resource'].includes(rawCategory)) pinType = rawCategory as typeof pinType
        if (storyText.startsWith('TYPE:organization')) pinType = 'organization'
        if (storyText.startsWith('TYPE:event')) pinType = 'event'
        if (storyText.startsWith('TYPE:resource')) pinType = 'resource'
        if (row.id?.includes('organization') || lowerTitle.includes('organization') || lowerTitle.includes('foundation') || lowerTitle.includes('center') || lowerTitle.includes('institute')) pinType = 'organization'
        if (lowerTitle.includes('event') || lowerTitle.includes('conference') || lowerTitle.includes('workshop') || lowerTitle.includes('webinar') || lowerTitle.includes('rally') || lowerTitle.includes('march')) pinType = 'event'
        if (lowerTitle.includes('resource') || lowerTitle.includes('hotline') || lowerTitle.includes('shelter') || lowerTitle.includes('clinic') || lowerTitle.includes('guide') || lowerTitle.includes('support')) pinType = 'resource'
        
        return { ...row, type: pinType }
      })
      
      console.log(`Returning ${pins.length} pins from local storage`)
      console.log('First pin with story:', pins[0])
      return NextResponse.json({ pins })
    }
  } catch (error) {
    console.error('Error loading map pins:', error)
  }
  
  // Return fallback pins if everything else fails
  const fallbackPins = [
    { title: 'NYC Healthcare Story', story: 'A healthcare access story from New York City', lat: 40.7128, lng: -74.0060, type: 'story', category: 'healthcare' },
    { title: 'LA Support Center', story: 'A local support resource for women and families', lat: 34.0522, lng: -118.2437, type: 'resource', category: 'support' },
    { title: 'London Workplace Rights Workshop', story: 'TYPE:event\nCommunity workshop on workplace equality rights and advocacy', lat: 51.5074, lng: -0.1278, type: 'event', category: 'workplace' }
  ]
  
  console.log('Using fallback pins due to error')
  return NextResponse.json({ pins: fallbackPins })
}
