import React from "react";
import { useNavigate } from "react-router-dom";

type MapPopupContentProps = {
  id: string;
  title?: string;
  author?: string;
  country?: string;
  excerpt?: string;
  fullStory: string;
};

export default function MapPopupContent({ id, title, author, country, excerpt, fullStory }: MapPopupContentProps) {
  const navigate = useNavigate();

  function openFullPage() {
    navigate(`/story/${encodeURIComponent(id)}`, {
      state: { id, title, author, country, story: fullStory },
    });
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
        <small>{excerpt || (fullStory.length > 200 ? fullStory.slice(0, 200) + "…" : fullStory)}</small>
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