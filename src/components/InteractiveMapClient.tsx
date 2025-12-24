'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { createRoot } from 'react-dom/client'
import MapPopupContent from './MapPopupContent'

/*
 * INTERACTIVE MAP COMPONENT
 * 
 * This component displays an interactive world map with pins for stories and organizations.
 * 
 * HOW TO ADD PINS TO THE MAP:
 * 1. Pins are loaded from the Google Sheet "Map Pins" via the /api/map-pins API
 * 2. To add new pins, edit the Google Sheet directly (see /api/map-pins/route.ts for details)
 * 3. Set Status to "published" in the sheet to make pins visible
 * 4. Pins will automatically appear when you refresh the page
 * 
 * FALLBACK PINS:
 * If the Google Sheet is unavailable, the map shows these sample pins below.
 * You can edit these for testing or as backup content.
 */

// Pin interface for TypeScript
type PinType = 'story' | 'organization' | 'event' | 'resource' | 'violation'

interface MapPin {
  id?: string
  lat: number
  lng: number
  type: PinType
  title: string
  category: string
  story?: string
  country?: string
  city?: string
}

// Fallback pins in case API fails
const fallbackPins: MapPin[] = []

export default function InteractiveMapClient() {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<L.Map | null>(null)
  const [storyPins, setStoryPins] = useState<MapPin[]>(fallbackPins)

  // Fetch pins from API - with auto-refresh every 30 seconds
  useEffect(() => {
    const fetchPins = async () => {
      console.log('🔍 Fetching pins from API...')
      try {
        const response = await fetch(`/api/map-pins?t=${Date.now()}`)
        console.log('📡 API Response status:', response.status)
        const data = await response.json()
        console.log('📊 API returned data:', data)
        if (data.pins && data.pins.length > 0) {
          console.log('✅ Setting pins:', data.pins.length, 'pins loaded')
          console.log('🔍 First pin story check:', data.pins[0] ? { 
            id: data.pins[0].id, 
            title: data.pins[0].title, 
            hasStory: !!data.pins[0].story,
            storyContent: data.pins[0].story ? data.pins[0].story.substring(0, 50) + '...' : 'NO STORY',
            storyLength: data.pins[0].story?.length || 0
          } : 'No pins')
          setStoryPins(data.pins)
        } else {
          console.log('⚠️ No pins returned, using fallback')
        }
      } catch (error) {
        console.error('❌ Failed to fetch map pins:', error)
        // Keep using fallback pins
      }
    }

    // Initial fetch
    fetchPins()
    
    // Refresh pins every 30 seconds to pick up new additions
    const interval = setInterval(fetchPins, 30000)
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return

    // Initialize the map with updated pin styles
    leafletMap.current = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 10,
      scrollWheelZoom: true,
      zoomControl: false
    })

    // Add custom zoom control
    L.control.zoom({
      position: 'topleft'
    }).addTo(leafletMap.current)

    // Add tile layer with clearer country borders
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(leafletMap.current)

    // Add country boundaries overlay for clearer borders
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(leafletMap.current)

    // Gender Inequality Index data - using exact country names from GeoJSON
    const giiData: Record<string, { value: number; level: string }> = {
      // High Inequality Countries (Red)
      'Yemen': { value: 0.82, level: 'high' },
      'Nigeria': { value: 0.68, level: 'high' },
      'Afghanistan': { value: 0.67, level: 'high' },
      'Chad': { value: 0.67, level: 'high' },
      'Somalia': { value: 0.67, level: 'high' },
      'Liberia': { value: 0.66, level: 'high' },
      'Mali': { value: 0.61, level: 'high' },
      'Niger': { value: 0.61, level: 'high' },
      'Guinea': { value: 0.61, level: 'high' },
      'Sierra Leone': { value: 0.61, level: 'high' },
      'Pakistan': { value: 0.52, level: 'high' },
      'Bangladesh': { value: 0.50, level: 'high' },
      'India': { value: 0.44, level: 'high' },
      'Indonesia': { value: 0.44, level: 'high' },
      'Iran': { value: 0.48, level: 'high' },
      'Iraq': { value: 0.56, level: 'high' },
      'Morocco': { value: 0.44, level: 'high' },

      // Medium Inequality Countries (Blue)
      'Brazil': { value: 0.39, level: 'medium' },
      'Egypt': { value: 0.39, level: 'medium' },
      'Philippines': { value: 0.39, level: 'medium' },
      'Colombia': { value: 0.39, level: 'medium' },
      'Mexico': { value: 0.35, level: 'medium' },
      'Thailand': { value: 0.31, level: 'medium' },
      'Argentina': { value: 0.29, level: 'medium' },
      'Turkey': { value: 0.26, level: 'medium' },
      'China': { value: 0.19, level: 'medium' },
      'United States': { value: 0.18, level: 'medium' },
      'Russia': { value: 0.18, level: 'medium' },
      'Ukraine': { value: 0.19, level: 'medium' },
      'Chile': { value: 0.19, level: 'medium' },
      'Peru': { value: 0.36, level: 'medium' },
      'Vietnam': { value: 0.38, level: 'medium' },
      'Viet Nam': { value: 0.38, level: 'medium' }, // Alternative name

      // Low Inequality Countries (Green)
      'Norway': { value: 0.01, level: 'low' },
      'Denmark': { value: 0.01, level: 'low' },
      'Sweden': { value: 0.02, level: 'low' },
      'Switzerland': { value: 0.02, level: 'low' },
      'Finland': { value: 0.03, level: 'low' },
      'Netherlands': { value: 0.03, level: 'low' },
      'Germany': { value: 0.07, level: 'low' },
      'Canada': { value: 0.07, level: 'low' },
      'France': { value: 0.08, level: 'low' },
      'Japan': { value: 0.08, level: 'low' },
      'United Kingdom': { value: 0.09, level: 'low' },
      'Australia': { value: 0.06, level: 'low' },
      'New Zealand': { value: 0.08, level: 'low' },
      'South Korea': { value: 0.06, level: 'low' },
      'Korea': { value: 0.06, level: 'low' }, // Alternative name
      'Spain': { value: 0.06, level: 'low' },
      'Italy': { value: 0.06, level: 'low' }
    }

    // Function to get color based on inequality level
    const getColorByLevel = (level: string) => {
      switch(level) {
        case 'high': return '#dc2626'    // Strong Red
        case 'medium': return '#f59e0b'  // Strong Orange 
        case 'low': return '#22c55e'     // Strong Green
        default: return '#6b7280'        // Gray for countries without data
      }
    }

    // Handle common name variations
    const nameVariations: Record<string, string> = {
      'United States of America': 'United States',
      'Russian Federation': 'Russia',
      'Republic of Korea': 'South Korea', 'Korea, Republic of': 'South Korea',
      'Viet Nam': 'Vietnam',
      'Islamic Republic of Iran': 'Iran',
      'Republic of the Philippines': 'Philippines',
      'People\'s Republic of China': 'China',
      'Republic of Turkey': 'Turkey',
      'Federal Republic of Germany': 'Germany',
      'French Republic': 'France',
      'Kingdom of Spain': 'Spain', 'Italian Republic': 'Italy',
      'Republic of India': 'India', 'Republic of Indonesia': 'Indonesia',
      'Islamic Republic of Pakistan': 'Pakistan',
      'People\'s Republic of Bangladesh': 'Bangladesh',
      'Kingdom of Thailand': 'Thailand',
      'Federative Republic of Brazil': 'Brazil',
      'Argentine Republic': 'Argentina',
      'Republic of Chile': 'Chile', 'Republic of Peru': 'Peru',
      'Arab Republic of Egypt': 'Egypt',
      'Kingdom of Morocco': 'Morocco',
      'Republic of Iraq': 'Iraq', 'Republic of Yemen': 'Yemen',
      'Federal Republic of Nigeria': 'Nigeria',
      'Islamic Republic of Afghanistan': 'Afghanistan',
      'Republic of Chad': 'Chad', 'Somali Republic': 'Somalia',
      'Republic of Liberia': 'Liberia', 'Republic of Mali': 'Mali',
      'Republic of Niger': 'Niger', 'Republic of Guinea': 'Guinea',
      'Republic of Sierra Leone': 'Sierra Leone',
      'Kingdom of Norway': 'Norway', 'Kingdom of Denmark': 'Denmark',
      'Kingdom of Sweden': 'Sweden', 'Swiss Confederation': 'Switzerland',
      'Republic of Finland': 'Finland',
      'Kingdom of the Netherlands': 'Netherlands',
      'Commonwealth of Australia': 'Australia',
      'Dominion of New Zealand': 'New Zealand', 'Dominion of Canada': 'Canada'
    }

    // Function to get color for a country based on GII data
    const getCountryColor = (countryName: string) => {
      const country = giiData[countryName] || giiData[nameVariations[countryName]]
      
      if (!country) {
        console.log(`No GII data found for: "${countryName}"`)
        return '#e5e7eb' // Light gray for countries without data
      }
      return getColorByLevel(country.level)
    }

    // Add choropleth layer for countries using world countries GeoJSON
    fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
      .then(response => response.json())
      .then(data => {
        if (!leafletMap.current) return

        // Debug: Log all country names from GeoJSON
        console.log('Countries in GeoJSON:', data.features.map((f: { properties: { name: string } }) => f.properties.name).sort())

        const geojsonLayer = L.geoJSON(data, {
          style: (feature) => {
            const countryName = feature?.properties?.name
            const color = getCountryColor(countryName)
            
            return {
              fillColor: color,
              weight: 1,
              opacity: 1,
              color: '#94a3b8', // Border color
              fillOpacity: 0.6
            }
          },
          onEachFeature: (feature, layer) => {
            const countryName = feature?.properties?.name
            const country = giiData[countryName] || giiData[nameVariations[countryName]]
            
            const tooltip = country 
              ? `<div style="text-align: center;">
                  <strong>${countryName}</strong><br/>
                  GII: ${country.value}<br/>
                  <span style="color: ${getColorByLevel(country.level)};">${country.level.toUpperCase()} Inequality</span>
                </div>`
              : `<div style="text-align: center;">
                  <strong>${countryName}</strong><br/>
                  GII: No data available
                </div>`
            
            layer.bindTooltip(tooltip)
          }
        }).addTo(leafletMap.current)
      })
      .catch(error => {
        console.error('Error loading world GeoJSON:', error)
      })

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove()
        leafletMap.current = null
      }
    }
  }, [])

  // Separate useEffect for adding/updating pins when storyPins changes
  useEffect(() => {
    if (!leafletMap.current) return

    console.log('🔄 Updating pins on map. Pin count:', storyPins.length)

    // Clear existing markers first (if we're updating)
    leafletMap.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        leafletMap.current!.removeLayer(layer)
      }
    })

    // Derive pin type from multiple hints
    const derivePinType = (pin: MapPin): PinType => {
      const normalizedType = (pin.type || 'story').toLowerCase() as PinType
      const normalizedCategory = (pin.category || '').toLowerCase()
      const lowerTitle = (pin.title || '').toLowerCase()
      const storyText = pin.story || ''
      
      // Explicit type wins if it's one of the supported values
      if (['story', 'organization', 'event', 'resource', 'violation'].includes(normalizedType)) {
        return normalizedType
      }
      
      // Category hints
      if (['organization', 'event', 'resource', 'violation'].includes(normalizedCategory)) {
        return normalizedCategory as PinType
      }
      
      // Content markers
      if (storyText.startsWith('TYPE:organization')) return 'organization'
      if (storyText.startsWith('TYPE:event')) return 'event'
      if (storyText.startsWith('TYPE:resource')) return 'resource'
      if (storyText.startsWith('TYPE:violation')) return 'violation'
      
      // Title heuristics
      const isOrg = lowerTitle.includes('organization') || lowerTitle.includes('foundation') || lowerTitle.includes('center') || lowerTitle.includes('institute') || lowerTitle.startsWith('[org]') || lowerTitle.includes(' ngo ')
      if (isOrg) return 'organization'
      
      const isEvent = lowerTitle.includes('event') || lowerTitle.includes('conference') || lowerTitle.includes('workshop') || lowerTitle.includes('webinar') || lowerTitle.includes('rally') || lowerTitle.includes('march')
      if (isEvent) return 'event'
      
      const isResource = lowerTitle.includes('resource') || lowerTitle.includes('hotline') || lowerTitle.includes('shelter') || lowerTitle.includes('clinic') || lowerTitle.includes('guide') || lowerTitle.includes('support')
      if (isResource) return 'resource'
      
      const isViolation = lowerTitle.includes('violation') || lowerTitle.includes('abuse') || lowerTitle.includes('discrimination') || lowerTitle.includes('assault') || lowerTitle.includes('harassment')
      if (isViolation) return 'violation'
      
      // Default
      return 'story'
    }

    // Create custom pushpin icon function with multi-type support
    const createPushpinIcon = (pin: MapPin) => {
      const pinType = derivePinType(pin)
      
      // Color palette by type
      const palette: Record<PinType, { base: string; mid: string; dark: string }> = {
        story: { base: '#ff6b6b', mid: '#dc2626', dark: '#b91c1c' },
        organization: { base: '#3b82f6', mid: '#1e3a8a', dark: '#1e40af' },
        event: { base: '#a78bfa', mid: '#7c3aed', dark: '#5b21b6' },
        resource: { base: '#34d399', mid: '#059669', dark: '#065f46' },
        violation: { base: '#ffd700', mid: '#eab308', dark: '#ca8a04' }
      }
      
      const colors = palette[pinType]
      
      console.log('🎨 PIN COLOR DEBUG:', {
        title: pin.title,
        resolvedType: pinType,
        type: pin.type,
        category: pin.category,
        id: pin.id,
        hasOrgPrefix: pin.title?.startsWith('[ORG]'),
        hasOrgMarker: pin.story?.startsWith('TYPE:organization'),
        colors
      })
      
      return L.divIcon({
        className: 'custom-marker',
        html: `<div class="pushpin-container">
          <div class="pushpin-head" style="background: radial-gradient(circle at 30% 30%, ${colors.base}, ${colors.mid}, ${colors.dark});"></div>
          <div class="pushpin-needle"></div>
        </div>`,
        iconSize: [26, 38],
        iconAnchor: [13, 38]
      })
    }

    // Add all pins to the map
    storyPins.forEach(pin => {
      console.log('📍 Adding pin:', pin.title)
      console.log('📖 Pin story debug:', { 
        title: pin.title, 
        hasStory: !!pin.story, 
        storyContent: pin.story ? pin.story.substring(0, 50) + '...' : 'NO STORY',
        storyLength: pin.story?.length || 0,
        type: pin.type,
        pinType: `"${pin.type}"`,
        isOrganization: pin.type === 'organization'
      })
      
      // DETAILED ORGANIZATION DETECTION DEBUG
      console.log('🔍 ORGANIZATION DETECTION DEBUG for', pin.title, {
        'pin.type': pin.type,
        'pin.category': pin.category,
        'pin.id': pin.id,
        'type === org': pin.type === 'organization',
        'category === org': pin.category === 'organization',
        'id includes org': pin.id?.includes('organization'),
        'title includes org': pin.title?.toLowerCase().includes('organization'),
        'title includes foundation': pin.title?.toLowerCase().includes('foundation')
      })
      
      const marker = L.marker([pin.lat, pin.lng], { icon: createPushpinIcon(pin) })
        .addTo(leafletMap.current!)

      // Determine type and clean display fields
      const resolvedType = derivePinType(pin)
      const displayTitle = pin.title?.startsWith('[ORG]') ? pin.title.substring(5).trim() : pin.title
      
      const storyRaw = pin.story || ''
      const displayStory = storyRaw.startsWith('TYPE:organization\n')
        ? storyRaw.substring(18)
        : storyRaw.startsWith('TYPE:event\n')
          ? storyRaw.substring(11)
          : storyRaw.startsWith('TYPE:resource\n')
            ? storyRaw.substring(14)
            : storyRaw.startsWith('TYPE:violation\n')
              ? storyRaw.substring(15)
              : storyRaw
      
      const badgeByType: Record<PinType, { label: string; classes: string; emptyText: string }> = {
        story: { label: 'Story', classes: 'bg-rose-100 text-rose-800', emptyText: 'Story content not available' },
        organization: { label: 'Organization', classes: 'bg-blue-100 text-blue-800', emptyText: 'Organization information not available' },
        event: { label: 'Event', classes: 'bg-purple-100 text-purple-800', emptyText: 'Event details not available' },
        resource: { label: 'Resource', classes: 'bg-emerald-100 text-emerald-800', emptyText: 'Resource information not available' },
        violation: { label: 'Violation of Human Rights', classes: 'bg-yellow-100 text-yellow-800', emptyText: 'Violation information not available' }
      }
      const badge = badgeByType[resolvedType]
      
      const storyPreview = displayStory && displayStory.trim()
        ? displayStory.substring(0, 150) + (displayStory.length > 150 ? '...' : '')
        : badge.emptyText
      
      // Create a div for the popup content
      const popupDiv = document.createElement('div')
      const root = createRoot(popupDiv)
      
      // Render React component into the popup
      root.render(
        <MapPopupContent
          id={pin.id || `pin-${pin.lat}-${pin.lng}`}
          title={displayTitle}
          author={resolvedType === 'story' ? 'Anonymous' : undefined}
          country={pin.country}
          excerpt={storyPreview}
          fullStory={displayStory || ''}
        />
      )
      
      // Bind popup with custom options for compact size
      marker.bindPopup(popupDiv, {
        maxWidth: 260,
        minWidth: 260,
        className: 'custom-popup'
      })
    })
  }, [storyPins]) // Re-run when storyPins changes

  return (
    <>
      <div ref={mapRef} className="w-full h-96 md:h-[500px] rounded-lg overflow-hidden" />
      
      {/* Gender Inequality Index Legend */}
      <div className="mt-6 bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="font-semibold text-gray-800">Map Legend</h3>
        </div>
        
        <div className="grid md:grid-cols-3 gap-4">
          {/* Pin Color Legend */}
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-3">Pin Types</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#dc2626' }}></div>
                <span className="text-sm text-gray-600">Stories</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#1e3a8a' }}></div>
                <span className="text-sm text-gray-600">Organizations</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#7c3aed' }}></div>
                <span className="text-sm text-gray-600">Events</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#059669' }}></div>
                <span className="text-sm text-gray-600">Resources</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#eab308' }}></div>
                <span className="text-sm text-gray-600">Violation of Human Rights</span>
              </div>
            </div>
          </div>
          
          {/* Legend Color Scale */}
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-3">Gender Inequality Index</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#22c55e' }}></div>
                <span className="text-sm text-gray-600">Low Inequality (0.01-0.15)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#f59e0b' }}></div>
                <span className="text-sm text-gray-600">Medium Inequality (0.16-0.39)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#dc2626' }}></div>
                <span className="text-sm text-gray-600">High Inequality (0.40+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#6b7280' }}></div>
                <span className="text-sm text-gray-600">No Data Available</span>
              </div>
            </div>
          </div>

          {/* GII Information */}
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-1">About the GII</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              The Gender Inequality Index (GII) measures inequality between women and men in three dimensions: 
              reproductive health, empowerment, and labor market participation. Values range from 0 (perfect equality) 
              to 1 (complete inequality). Higher values indicate greater disparities between women and men's achievements.
            </p>
            <p className="text-xs text-gray-500 mt-1 italic">
              Data source: UN Human Development Reports
            </p>
          </div>
        </div>
      </div>

      {/* Custom CSS for realistic pushpins - Medium Size */}
      <style jsx global>{`
        .pushpin-container {
          position: relative;
          width: 26px;
          height: 38px;
          cursor: pointer;
        }

        .pushpin-head {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          box-shadow: 
            0 2px 8px rgba(0,0,0,0.35),
            inset -1.5px -1.5px 4px rgba(0,0,0,0.2),
            inset 1.5px 1.5px 4px rgba(255,255,255,0.3);
          border: 1.5px solid rgba(0,0,0,0.1);
        }

        .pushpin-needle {
          width: 2px;
          height: 20px;
          background: linear-gradient(to bottom, #e5e5e5, #a3a3a3, #737373);
          position: absolute;
          top: 15px;
          left: 50%;
          transform: translateX(-50%);
          border-radius: 0 0 50% 50%;
          box-shadow: 
            0.8px 0 1.5px rgba(0,0,0,0.3),
            -0.8px 0 0.8px rgba(255,255,255,0.2);
        }

        .pushpin-container:hover {
          transform: scale(1.12);
          transition: transform 0.2s ease;
        }

        .pushpin-container:hover .pushpin-head {
          box-shadow: 
            0 4px 15px rgba(0,0,0,0.45),
            inset -2px -2px 5px rgba(0,0,0,0.2),
            inset 2px 2px 5px rgba(255,255,255,0.3);
        }

        .custom-popup .leaflet-popup-content {
          margin: 8px 12px;
          line-height: 1.4;
        }

        .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
        }

        .leaflet-control-zoom a {
          background-color: white !important;
          color: #475569 !important;
          border: 1px solid #e2e8f0 !important;
          width: 36px !important;
          height: 36px !important;
          line-height: 34px !important;
          font-size: 18px !important;
          font-weight: 500 !important;
        }

        .leaflet-control-zoom a:hover {
          background-color: #f8fafc !important;
          color: #1e293b !important;
        }
      `}</style>
    </>
  )
}
