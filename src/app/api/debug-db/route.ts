import { NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export async function GET() {
  try {
    console.log('🔍 Debug DB: Checking database contents...')
    
    // Check if table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'map_pins'
      )
    `
    
    console.log('Table exists:', tableCheck.rows[0].exists)
    
    if (!tableCheck.rows[0].exists) {
      return NextResponse.json({ 
        error: 'Table map_pins does not exist',
        tableExists: false
      })
    }
    
    // Get table schema
    const schemaQuery = await sql`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'map_pins'
      ORDER BY ordinal_position
    `
    
    console.log('Table schema:', schemaQuery.rows)
    
    // Get all pins
    const pinsQuery = await sql`
      SELECT * FROM map_pins ORDER BY created_at DESC
    `
    
    console.log('Total pins in database:', pinsQuery.rows.length)
    
    return NextResponse.json({
      tableExists: true,
      schema: schemaQuery.rows,
      totalPins: pinsQuery.rows.length,
      pins: pinsQuery.rows,
      environment: process.env.NODE_ENV,
      hasPostgresUrl: !!process.env.POSTGRES_URL
    })
  } catch (error) {
    console.error('❌ Debug DB error:', error)
    return NextResponse.json({ 
      error: String(error),
      environment: process.env.NODE_ENV,
      hasPostgresUrl: !!process.env.POSTGRES_URL
    }, { status: 500 })
  }
}
