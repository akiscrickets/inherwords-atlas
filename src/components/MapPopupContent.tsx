'use client';

import React from "react";
import { useRouter } from "next/navigation";

type MapPopupContentProps = {
  id: string;
  title?: string;
  author?: string;
  country?: string;
  excerpt?: string;
  fullStory: string;
};

export default function MapPopupContent({ 
  id, 
  title, 
  author, 
  country, 
  excerpt, 
  fullStory 
}: MapPopupContentProps) {
  const router = useRouter();

  function openFullPage() {
    // Use Next.js routing with query params instead of state
    const params = new URLSearchParams({
      title: title || 'Story',
      author: author || '',
      country: country || '',
    });
    router.push(`/story/${encodeURIComponent(id)}?${params.toString()}`);
  }

  return (
    <div className="map-popup-content">
      <div className="map-popup-head">
        <strong>{title || "Story"}</strong>
        <div className="map-popup-meta">
          {author && <small>By {author}</small>}
          {country && <small> — {country}</small>}
        </div>
      </div>
      <div className="map-popup-excerpt">
        <small>
          {excerpt || (fullStory.length > 200 ? fullStory.slice(0, 200) + "…" : fullStory)}
        </small>
      </div>
      <div className="map-popup-actions">
        <button
          className="map-popup-open-full"
          onClick={openFullPage}
          aria-label="Open full story page"
        >
          Read full story
        </button>
      </div>
    </div>
  );
}
