'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Story {
  id: string
  title: string
  story: string
  type?: string
  organizationName?: string
  organizationDescription?: string
  website?: string
  focusAreas?: string[]
  country: string
  city: string
  email: string
  anonymous: boolean
  status: string
  submittedAt: string
}

interface MapPin {
  id: string
  title: string
  country: string
  city: string
  lat: number
  lng: number
  category: string
  type: string
}

export default function AdminPage() {
  const [stories, setStories] = useState<Story[]>([])
  const [currentPins, setCurrentPins] = useState<MapPin[]>([])
  const [activeTab, setActiveTab] = useState<'stories' | 'pins'>('stories')
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  const fetchStories = async () => {
    try {
      const response = await fetch('/api/admin/stories')
      const data = await response.json()
      console.log('API Response:', data) // Debug log
      console.log('Stories:', data.stories) // Debug log
      setStories(data.stories || [])
    } catch (error) {
      console.error('Failed to fetch stories:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCurrentPins = async () => {
    try {
      const response = await fetch('/api/map-pins')
      const data = await response.json()
      console.log('Current pins:', data.pins)
      setCurrentPins(data.pins || [])
    } catch (error) {
      console.error('Failed to fetch current pins:', error)
    }
  }

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('admin_token')
    
    if (!token) {
      router.push('/admin/login')
      return
    }

    try {
      const response = await fetch('/api/admin/auth', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        setIsAuthenticated(true)
        setLoading(false)
        fetchStories()
        fetchCurrentPins()
      } else {
        localStorage.removeItem('admin_token')
        router.push('/admin/login')
      }
    } catch (error) {
      localStorage.removeItem('admin_token')
      router.push('/admin/login')
    }
  }, [router])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const logout = () => {
    localStorage.removeItem('admin_token')
    router.push('/admin/login')
  }

  const addToMap = async (story: Story) => {
    setProcessingId(story.id)
    try {
      const requestData = {
        storyId: story.id,
        title: story.title,
        story: story.type === 'organization' ? story.organizationDescription : story.story,
        country: story.country,
        city: story.city,
        category: story.type === 'organization' ? 'organization' : 'story',
        type: story.type === 'organization' ? 'organization' : 'story'
      }
      
      console.log('🚀 ADMIN DEBUG - Sending to add-to-map:', {
        storyType: story.type,
        isOrganization: story.type === 'organization',
        requestData
      })
      
      const response = await fetch('/api/admin/add-to-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      if (response.ok) {
        // Refresh the stories list
        fetchStories()
        fetchCurrentPins()
        alert('✅ Story added to map successfully!')
      } else {
        alert('❌ Failed to add story to map')
      }
    } catch (error) {
      console.error('Error adding to map:', error)
      alert('❌ Error adding story to map')
    } finally {
      setProcessingId(null)
    }
  }

  const updateStatus = async (storyId: string, newStatus: string) => {
    setProcessingId(storyId)
    try {
      const response = await fetch('/api/admin/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, status: newStatus })
      })

      if (response.ok) {
        fetchStories()
        alert(`✅ Story ${newStatus}!`)
      } else {
        alert(`❌ Failed to ${newStatus} story`)
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('❌ Error updating story status')
    } finally {
      setProcessingId(null)
    }
  }

  const deleteStory = async (story: Story) => {
    if (!confirm(`Are you sure you want to permanently delete "${story.title}"? This action cannot be undone.`)) {
      return
    }

    setProcessingId(story.id)
    try {
      const response = await fetch('/api/admin/delete-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: story.id })
      })

      if (response.ok) {
        fetchStories()
        fetchCurrentPins()
        alert('✅ Story deleted permanently!')
      } else {
        const errorData = await response.json()
        alert(`❌ Failed to delete story: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting story:', error)
      alert('❌ Error deleting story')
    } finally {
      setProcessingId(null)
    }
  }

  const removeFromMap = async (story: Story) => {
    if (!confirm(`Are you sure you want to remove "${story.title}" from the map?`)) {
      return
    }

    setProcessingId(story.id)
    try {
      const response = await fetch('/api/admin/remove-from-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: story.id
        })
      })

      if (response.ok) {
        // Update story status back to approved
        await fetch('/api/admin/update-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storyId: story.id, status: 'approved' })
        })
        
        fetchStories()
        fetchCurrentPins()
        alert('✅ Story removed from map!')
      } else {
        const errorData = await response.json()
        alert(`❌ Failed to remove story from map: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error removing from map:', error)
      alert('❌ Error removing story from map')
    } finally {
      setProcessingId(null)
    }
  }

  const approveAndAddToMap = async (story: Story) => {
    setProcessingId(story.id)
    try {
      // First approve the story
      const approveResponse = await fetch('/api/admin/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId: story.id, status: 'approved' })
      })

      if (!approveResponse.ok) {
        throw new Error('Failed to approve story')
      }

      // Then add to map
      const mapRequestData = {
        storyId: story.id,
        title: story.title,
        story: story.type === 'organization' ? story.organizationDescription : story.story,
        country: story.country,
        city: story.city,
        category: story.type === 'organization' ? 'organization' : 'story',
        type: story.type === 'organization' ? 'organization' : 'story'
      }
      
      console.log('🚀 ADMIN APPROVE DEBUG - Sending to add-to-map:', {
        storyType: story.type,
        isOrganization: story.type === 'organization',
        mapRequestData
      })
      
      const mapResponse = await fetch('/api/admin/add-to-map', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(mapRequestData)
      })

      if (mapResponse.ok) {
        const result = await mapResponse.json()
        fetchStories()
        fetchCurrentPins()
        if (result.warning) {
          alert(`⚠️ Story approved and coordinates found, but pin not persisted in production.\n\nDatabase integration needed for full functionality.`)
        } else {
          alert('✅ Story approved and added to map!')
        }
      } else {
        const errorData = await mapResponse.json()
        console.error('Map API error:', errorData)
        alert(`❌ Story approved but failed to add to map: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error in approve and add to map:', error)
      alert('❌ Error processing story')
    } finally {
      setProcessingId(null)
    }
  }

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#c4b5d6' }}>
        <div className="text-center">
          <div className="text-2xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
            {!isAuthenticated ? 'Checking authentication...' : 'Loading Stories...'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#c4b5d6' }}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex justify-between items-start mb-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4" style={{ color: '#1a1a1a' }}>
              Story Admin Panel
            </h1>
            <p className="text-lg" style={{ color: '#1a1a1a' }}>
              Review submitted stories and manage map pins
            </p>
          </div>
          
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-white/20 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('stories')}
            className={`px-6 py-3 rounded-md transition-all font-medium ${
              activeTab === 'stories'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            📝 New Stories ({stories.length})
          </button>
          <button
            onClick={() => setActiveTab('pins')}
            className={`px-6 py-3 rounded-md transition-all font-medium ${
              activeTab === 'pins'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            📍 Current Pins ({currentPins.length})
          </button>
        </div>

        {/* Content */}
        <div className="grid gap-6">
          {activeTab === 'stories' ? (
            // Stories Tab
            stories.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-lg" style={{ color: '#1a1a1a' }}>No stories submitted yet</p>
              </div>
            ) : (
              stories.map((story) => (
                <div
                  key={story.id}
                  className="rounded-xl p-6 shadow-lg"
                  style={{ backgroundColor: '#f3ecf8' }}
                >
                  <div className="grid lg:grid-cols-3 gap-6">
                    {/* Story Info */}
                    <div className="lg:col-span-2">
                      <div className="flex items-center gap-4 mb-4">
                        <h3 className="text-xl font-bold" style={{ color: '#1a1a1a' }}>
                          {story.title}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            story.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : story.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : story.status === 'on-map'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {story.status}
                        </span>
                      </div>
                      
                      <div className="mb-4">
                        <strong>Location:</strong> {story.city ? `${story.city}, ` : ''}{story.country}
                      </div>
                      
                      <div className="mb-4">
                        <strong>Story:</strong>
                        <p className="mt-2 text-sm leading-relaxed" style={{ color: '#4a4a4a' }}>
                          {story.story && story.story.trim() 
                            ? (story.story.length > 300 
                                ? `${story.story.substring(0, 300)}...` 
                                : story.story)
                            : <em style={{ color: '#888' }}>No story content provided</em>
                          }
                        </p>
                      </div>

                      {story.email && !story.anonymous && (
                        <div className="mb-4">
                          <strong>Contact:</strong> {story.email}
                        </div>
                      )}

                      <div className="text-sm" style={{ color: '#6b7280' }}>
                        Submitted: {new Date(story.submittedAt).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3">
                      {story.status === 'pending' && (
                        <>
                          <button
                            onClick={() => approveAndAddToMap(story)}
                            disabled={processingId === story.id}
                            className="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                            style={{ backgroundColor: '#0f7c7c' }}
                          >
                            {processingId === story.id ? 'Processing...' : '✅ Approve & Add to Map'}
                          </button>
                          <button
                            onClick={() => updateStatus(story.id, 'approved')}
                            disabled={processingId === story.id}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            {processingId === story.id ? 'Processing...' : '✅ Approve Only'}
                          </button>
                          <button
                            onClick={() => updateStatus(story.id, 'rejected')}
                            disabled={processingId === story.id}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                          >
                            {processingId === story.id ? 'Processing...' : '❌ Reject'}
                          </button>
                        </>
                      )}

                      {story.status === 'approved' && (
                        <button
                          onClick={() => addToMap(story)}
                          disabled={processingId === story.id}
                          className="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                          style={{ backgroundColor: '#0f7c7c' }}
                        >
                          {processingId === story.id ? 'Adding...' : '📍 Add to Map'}
                        </button>
                      )}

                      {story.status === 'on-map' && (
                        <>
                          <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-center mb-2">
                            ✅ On Map
                          </div>
                          <button
                            onClick={() => removeFromMap(story)}
                            disabled={processingId === story.id}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                          >
                            {processingId === story.id ? 'Removing...' : '🗑️ Remove from Map'}
                          </button>
                        </>
                      )}

                      {/* Delete button - always available */}
                      <div className="border-t pt-3 mt-3">
                        <button
                          onClick={() => deleteStory(story)}
                          disabled={processingId === story.id}
                          className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 disabled:opacity-50 w-full"
                        >
                          {processingId === story.id ? 'Deleting...' : '🗑️ Delete Permanently'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            // Pins Tab
            currentPins.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-lg" style={{ color: '#1a1a1a' }}>No pins on the map yet</p>
              </div>
            ) : (
              currentPins.map((pin) => (
                <div
                  key={pin.id}
                  className="rounded-xl p-6 shadow-lg"
                  style={{ backgroundColor: '#f3ecf8' }}
                >
                  <div className="grid lg:grid-cols-4 gap-6 items-center">
                    <div className="lg:col-span-3">
                      <div className="flex items-center gap-4 mb-4">
                        <h3 className="text-xl font-bold" style={{ color: '#1a1a1a' }}>
                          📍 {pin.title}
                        </h3>
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {pin.category}
                        </span>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div><strong>Location:</strong> {pin.city ? `${pin.city}, ` : ''}{pin.country}</div>
                        <div><strong>Coordinates:</strong> {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}</div>
                        <div><strong>Type:</strong> {pin.type}</div>
                        <div><strong>ID:</strong> {pin.id}</div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => {
                          if (confirm(`Remove "${pin.title}" from the map?`)) {
                            // Handle manual pin removal
                            fetch('/api/admin/remove-from-map', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ storyId: pin.id })
                            }).then(() => {
                              fetchCurrentPins()
                              fetchStories()
                            })
                          }
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                      >
                        🗑️ Remove
                      </button>
                      <a
                        href={`https://www.google.com/maps?q=${pin.lat},${pin.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm text-center"
                      >
                        🗺️ View
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
    </div>
  )
}
