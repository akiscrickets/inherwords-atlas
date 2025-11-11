'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'

/*
 * INTERACTIVE MAP COMPONENT
 *
 * This component displays an interactive world map with pins for stories and organizations.
 */

// Pin interface for TypeScript
type PinType = 'story' | 'organization' | 'event' | 'resource' | 'Violation of Human Rights'

interface MapPin {
  id?: string
  lat: number
  lng: number
  type: PinType | string
  title: string
  category: string
  story?: string
  country?: string
  city?: string
}

export default function InteractiveMapClient() {
  const leafletMap = useRef<L.Map | null>(null)

  const derivePinType = (pin: MapPin): PinType => {
    const lowerTitle = (pin.title || '').toLowerCase()
    const lowerType = (pin.type || '').toString().toLowerCase()
    const lowerCategory = (pin.category || '').toLowerCase()
    const storyText = (pin.story || '').toLowerCase()

    if (lowerType === 'violation of human rights' || lowerType === 'violation_of_human_rights') return 'Violation of Human Rights'
    if (['story', 'organization', 'event', 'resource'].includes(lowerType)) return lowerType as PinType

    if (['organization', 'event', 'resource'].includes(lowerCategory)) return lowerCategory as PinType

    if (storyText.includes('violation of human rights') || storyText.includes('violation_of_human_rights')) return 'Violation of Human Rights'
    if (storyText.startsWith('type:organization')) return 'organization'
    if (storyText.startsWith('type:event')) return 'event'
    if (storyText.startsWith('type:resource')) return 'resource'

    if (pin.id?.includes('organization') || lowerTitle.includes('organization') || lowerTitle.includes('foundation') || lowerTitle.includes('center') || lowerTitle.includes('institute') || lowerTitle.startsWith('[org]')) return 'organization'

    const isResource = lowerTitle.includes('resource') || lowerTitle.includes('hotline') || lowerTitle.includes('shelter') || lowerTitle.includes('clinic') || lowerTitle.includes('guide') || lowerTitle.includes('support')
    if (isResource) return 'resource'

    return 'story'
  }

  const createPushpinIcon = (pin: MapPin) => {
    const pinType = derivePinType(pin)

    const palette: Record<PinType, { base: string; mid: string; dark: string }> = {
      story: { base: '#ff6b6b', mid: '#dc2626', dark: '#b91c1c' },
      organization: { base: '#3b82f6', mid: '#1e3a8a', dark: '#1e40af' },
      event: { base: '#a78bfa', mid: '#7c3aed', dark: '#5b21b6' },
      resource: { base: '#34d399', mid: '#059669', dark: '#065f46' },
      'Violation of Human Rights': { base: '#FFFF00', mid: '#FFD700', dark: '#E5C500' }
    }

    const colors = palette[pinType]

    return L.divIcon({
      className: 'custom-marker',
      html: `<div class=