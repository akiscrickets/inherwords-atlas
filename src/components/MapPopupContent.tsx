'use client';

import React from "react";

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

  function openFullPage() {
    // Open in new tab
    window.open(`/story/${encodeURIComponent(id)}`, '_blank');
  }

  // Clean preview text - limit to 150 chars for compact view
  const previewText = excerpt || fullStory;
  const displayPreview = previewText && previewText.length > 150 
    ? previewText.substring(0, 150) + '...' 
    : previewText;

  return (
    <div className="map-popup-simple">
      <h4>{title || "Story"}</h4>
      {country && <p className="popup-location">{country}</p>}
      <p className="popup-preview">{displayPreview || 'Click to read this story'}</p>
      <button onClick={openFullPage} className="popup-btn">
        Read More →
      </button>
    </div>
  );
}
