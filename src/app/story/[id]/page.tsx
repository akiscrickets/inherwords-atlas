'use client';

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import "./story-page.css";

type StoryData = {
  id?: string;
  title?: string;
  author?: string;
  country?: string;
  story: string;
};

async function getStoryById(id: string): Promise<StoryData | null> {
  try {
    // First try to get from map pins (for stories added to map)
    try {
      const mapResponse = await fetch(`/api/map-pins`);
      if (mapResponse.ok) {
        const mapData = await mapResponse.json();
        const pins = mapData.pins || [];
        const pin = pins.find((p: { id: string }) => p.id === id);
        
        if (pin) {
          return {
            id: pin.id,
            title: pin.title,
            author: 'Anonymous',
            country: pin.country,
            story: pin.story || 'No story content available',
          };
        }
      }
    } catch (mapError) {
      console.log('Not found in map pins, trying stories API');
    }
    
    // Fall back to stories API
    const response = await fetch(`/api/admin/stories?id=${encodeURIComponent(id)}`);
    if (!response.ok) return null;
    const data = await response.json();
    
    // Assuming API returns array of stories, find the matching one
    const stories = Array.isArray(data) ? data : [data];
    const story = stories.find((s: { id: string }) => s.id === id);
    
    if (!story) return null;
    
    return {
      id: story.id,
      title: story.title,
      author: story.anonymous ? 'Anonymous' : story.email || 'Anonymous',
      country: story.country,
      story: story.story || story.description || '',
    };
  } catch (err) {
    console.error('Error fetching story:', err);
    return null;
  }
}

export default function StoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params.id as string;

  const [storyData, setStoryData] = useState<StoryData | null>(() => {
    // Try to get data from URL params first
    const title = searchParams.get('title');
    const author = searchParams.get('author');
    const country = searchParams.get('country');
    
    if (title) {
      return { id, title, author: author || '', country: country || '', story: '' };
    }
    return null;
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const data = await getStoryById(id);
        if (!mounted) return;
        
        if (data) {
          setStoryData(data);
          setError(null);
        } else {
          setError("Story not found.");
        }
      } catch (err) {
        if (!mounted) return;
        setError("Failed to load story.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [id]);

  return (
    <div className="story-page-root">
      <header className="story-page-header">
        <button 
          className="story-back-btn" 
          onClick={() => router.back()} 
          aria-label="Go back"
        >
          ← Back
        </button>
        <div className="story-page-header-title">
          <h1>{storyData?.title || (loading ? "Loading…" : "Story")}</h1>
          <div className="story-meta">
            {storyData?.author && <span>By {storyData.author}</span>}
            {storyData?.country && <span className="story-country"> — {storyData.country}</span>}
          </div>
        </div>
      </header>

      <main className="story-page-body" role="main">
        {loading && <p className="story-loading">Loading story…</p>}
        {error && <p className="story-error">{error}</p>}
        {storyData && !loading && !error && storyData.story && (
          <article className="story-article" aria-label="Full story">
            {storyData.story.split(/\r?\n/).map((p, i) => (
              <p key={i} className="story-paragraph">
                {p}
              </p>
            ))}
          </article>
        )}
        {storyData && !loading && !error && !storyData.story && (
          <p className="story-loading">Story content is being loaded...</p>
        )}
      </main>

      <footer className="story-page-footer">
        <small>
          Share this story: <code>{typeof window !== "undefined" ? window.location.href : ""}</code>
        </small>
      </footer>
    </div>
  );
}
