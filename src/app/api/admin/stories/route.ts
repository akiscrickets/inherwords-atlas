import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export async function GET() {
  try {
    if (process.env.NODE_ENV === 'production') {
      // Production: Read from Vercel Postgres database
      console.log('Loading stories from database...')
      
      try {
        // Try to get organization columns first, fall back to basic columns
        let result
        try {
          result = await sql`
            SELECT 
              id, 
              type,
              title, 
              story, 
              organization_name,
              organization_description,
              website,
              focus_areas,
              country, 
              city, 
              email, 
              anonymous, 
              status, 
              submitted_at, 
              updated_at
            FROM stories
            ORDER BY submitted_at DESC
          `
        } catch (columnError) {
          console.log('Organization columns not found, using basic query')
          result = await sql`
            SELECT id, title, story, country, city, email, anonymous, status, submitted_at, updated_at
            FROM stories
            ORDER BY submitted_at DESC
          `
        }
        
        const stories = result.rows.map(row => {
          // BULLETPROOF organization detection - check ALL possible indicators
          const hasOrgId = row.id?.startsWith('organization_')
          const hasOrgType = row.type === 'organization'
          const hasOrgColumns = row.organization_name || row.organization_description
          
          // If ANY of these are true, it's an organization
          const isOrganization = hasOrgId || hasOrgType || hasOrgColumns
          
          console.log('🔍 STORY PROCESSING DEBUG:', {
            id: row.id,
            title: row.title,
            dbType: row.type,
            hasOrgId,
            hasOrgType, 
            hasOrgColumns,
            finalIsOrganization: isOrganization,
            finalTypeAssigned: isOrganization ? 'organization' : 'personal'
          })
          
          return {
            id: row.id,
            type: isOrganization ? 'organization' : 'personal', // FORCE the correct type
            title: row.title,
            story: row.story,
            organizationName: row.organization_name || (isOrganization ? row.title : undefined),
            organizationDescription: row.organization_description || 
              (isOrganization ? row.story?.split('\nWebsite:')[0] : undefined),
            website: row.website || 
              (isOrganization && row.story?.includes('\nWebsite:') ? 
                row.story.split('\nWebsite:')[1]?.split('\n')[0]?.trim() : undefined),
            focusAreas: row.focus_areas || 
              (isOrganization && row.story?.includes('\nFocus Areas:') ? 
                row.story.split('\nFocus Areas:')[1]?.trim().split(', ') : []),
            country: row.country,
            city: row.city || '',
            email: row.email || '',
            anonymous: Boolean(row.anonymous),
            status: row.status,
            submittedAt: row.submitted_at,
            updatedAt: row.updated_at
          }
        })
        
        console.log(`Returning ${stories.length} stories from database`)
        return NextResponse.json({ stories })
      } catch (dbError) {
        console.error('Database error:', dbError)
        return NextResponse.json({ stories: [] })
      }
    } else {
      // Local development: You can add local storage here or keep Google Sheets for dev
      console.log('Development mode: Add local story storage or use database')
      return NextResponse.json({ stories: [] })
    }
  } catch (error) {
    console.error('Error fetching stories:', error)
    return NextResponse.json({ error: 'Failed to fetch stories' }, { status: 500 })
  }
}
