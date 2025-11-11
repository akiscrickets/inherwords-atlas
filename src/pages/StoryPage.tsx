import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import "../styles/StoryPage.css";

type StoryData = {
  id?: string;
  title?: string;
  author?: string;
  country?: string;
  story: string;
};

async function getStoryById(id: string | undefined): Promise<StoryData | null> {
  if (!id) return null;
  return {
    id,
    title: "Story not preloaded",
    author: "",
    country: "",
    story: "Full story not available client-side. Implement fetch by id in getStoryById.",
  };
}

export default function StoryPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [storyData, setStoryData] = useState<StoryData | null>(() => {
    const state = location.state as StoryData | undefined;
    return state?.story ? state : null;
  });
  const [loading, setLoading] = useState(!storyData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (storyData) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const s = await getStoryById(id);
        if (!mounted) return;
        if (s) {
          setStoryData(s);
          setError(null);
        } else {
          setStoryData(null);
          setError("Story not found.");
        }
      } catch (err) {
        setError("Failed to load story.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id, storyData]);

  return (
    <div className="story-page-root">
      <header className="story-page-header">
        <button className="story-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
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
        {storyData && !loading && !error && (
          <article className="story-article" aria-label="Full story">
            {storyData.story.split(/\r?\n/).map((p, i) => (
              <p key={i} className="story-paragraph">
                {p}
              </p>
            ))}
          </article>
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