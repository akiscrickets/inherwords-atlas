import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { sql } from '@vercel/postgres'

export async function GET() {
  try {
    console.log('🔍 MAP-PINS GET REQUEST')
    console.log('Environment:', process.env.NODE_ENV)
    console.log('Has POSTGRES_URL:', !!process.env.POSTGRES_URL)
    
    if (process.env.NODE_ENV === 'production' && process.env.POSTGRES_URL) {
      // Production: Read from Vercel Postgres database
      console.log('💾 Loading map pins from database...')
      
      try {
        // Try to get story field, fallback if column doesn't exist
        let result
        let hasStoryColumn = true
        try {
          console.log('Attempting to query with story column...')
          result = await sql`
            SELECT id, title, story, lat, lng, type, category, country, city, created_at
            FROM map_pins
            ORDER BY created_at DESC
          `
          console.log(`✅ Query successful: ${result.rows.length} pins found`)
        } catch (columnError) {
          console.log('⚠️ Story column does not exist, using basic query')
          console.error('Column error:', columnError)
          hasStoryColumn = false
          result = await sql`
            SELECT id, title, lat, lng, type, category, country, city, created_at
            FROM map_pins
            ORDER BY created_at DESC
          `
          console.log(`✅ Basic query successful: ${result.rows.length} pins found`)
        }
        
        const pins = result.rows.map(row => {
          // Robust type detection for pins, supporting protection, resource, and violation
          const rawType = (row.type || 'story').toLowerCase()
          const rawCategory = (row.category || '').toLowerCase()
          const lowerTitle = (row.title || '').toLowerCase()
          let pinType: 'story' | 'organization' | 'protection' | 'resource' | 'violation' = 'story'
          
          // Prefer explicit correct types
          if (['story', 'organization', 'protection', 'resource', 'violation'].includes(rawType)) {
            pinType = rawType as typeof pinType
          }
          
          // Category hints
          if (['organization', 'protection', 'resource', 'violation'].includes(rawCategory)) {
            pinType = rawCategory as typeof pinType
          }
          
          // Heuristics by id/title
          if (row.id?.includes('organization') || lowerTitle.includes('organization') || lowerTitle.includes('foundation') || lowerTitle.includes('center') || lowerTitle.includes('institute')) {
            pinType = 'organization'
          } else if (lowerTitle.includes('protection') || lowerTitle.includes('rights') || lowerTitle.includes('advocacy') || lowerTitle.includes('activism') || lowerTitle.includes('campaign') || lowerTitle.includes('movement')) {
            pinType = 'protection'
          } else if (lowerTitle.includes('resource') || lowerTitle.includes('hotline') || lowerTitle.includes('shelter') || lowerTitle.includes('clinic') || lowerTitle.includes('guide') || lowerTitle.includes('support')) {
            pinType = 'resource'
          } else if (row.id?.includes('violation') || lowerTitle.includes('violation') || lowerTitle.includes('abuse') || lowerTitle.includes('discrimination') || lowerTitle.includes('assault') || lowerTitle.includes('harassment')) {
            pinType = 'violation'
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
      
      // Normalize types to include protection, resource, and violation heuristics
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
        let pinType: 'story' | 'organization' | 'protection' | 'resource' | 'violation' = 'story'
        
        if (['story', 'organization', 'protection', 'resource', 'violation'].includes(rawType)) pinType = rawType as typeof pinType
        if (['organization', 'protection', 'resource', 'violation'].includes(rawCategory)) pinType = rawCategory as typeof pinType
        if (storyText.startsWith('TYPE:organization')) pinType = 'organization'
        if (storyText.startsWith('TYPE:protection')) pinType = 'protection'
        if (storyText.startsWith('TYPE:resource')) pinType = 'resource'
        if (storyText.startsWith('TYPE:violation')) pinType = 'violation'
        if (row.id?.includes('organization') || lowerTitle.includes('organization') || lowerTitle.includes('foundation') || lowerTitle.includes('center') || lowerTitle.includes('institute')) pinType = 'organization'
        if (lowerTitle.includes('protection') || lowerTitle.includes('rights') || lowerTitle.includes('advocacy') || lowerTitle.includes('activism') || lowerTitle.includes('campaign') || lowerTitle.includes('movement')) pinType = 'protection'
        if (lowerTitle.includes('resource') || lowerTitle.includes('hotline') || lowerTitle.includes('shelter') || lowerTitle.includes('clinic') || lowerTitle.includes('guide') || lowerTitle.includes('support')) pinType = 'resource'
        if (row.id?.includes('violation') || lowerTitle.includes('violation') || lowerTitle.includes('abuse') || lowerTitle.includes('discrimination') || lowerTitle.includes('assault') || lowerTitle.includes('harassment')) pinType = 'violation'
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
    { title: 'London Workplace Rights Workshop', story: 'TYPE:protection\nCommunity workshop on workplace equality rights and advocacy', lat: 51.5074, lng: -0.1278, type: 'protection', category: 'workplace' }
  ]
  
  console.log('Using fallback pins due to error')
  return NextResponse.json({ pins: fallbackPins })
}
