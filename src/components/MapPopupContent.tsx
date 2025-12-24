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

  // Clean preview text - limit to 200 chars
  const previewText = excerpt || fullStory;
  const displayPreview = previewText && previewText.length > 200 
    ? previewText.substring(0, 200) + '...' 
    : previewText;

  return (
    <div className="map-popup-content">
      <div className="map-popup-header">
        <h3>{title || "Story"}</h3>
        <div className="map-popup-meta">
          {author && <span className="popup-author">By {author}</span>}
          {country && <span className="popup-location">📍 {country}</span>}
        </div>
      </div>
      
      <div className="map-popup-body">
        <p className="map-popup-text">
          {displayPreview || 'No preview available'}
        </p>
      </div>
      
      <div className="map-popup-footer">
        <button
          className="map-popup-read-more"
          onClick={openFullPage}
          aria-label="Read full story in new tab"
        >
          Read Full Story →
        </button>
      </div>
    </div>
  );
}
