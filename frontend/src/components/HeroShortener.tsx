import React, { useState } from "react";
import { api, ApiError } from "../api/client";
import type { URLItem } from "../types/api";
import { ResultCard } from "./ResultCard";

interface HeroShortenerProps {
  onNotify: (type: "success" | "error" | "info", msg: string) => void;
  onViewStats: (shortCode: string) => void;
  onUrlCreated?: (url: URLItem) => void;
}

export const HeroShortener: React.FC<HeroShortenerProps> = ({
  onNotify,
  onViewStats,
  onUrlCreated,
}) => {
  const [longUrl, setLongUrl] = useState<string>("");
  const [customAlias, setCustomAlias] = useState<string>("");
  const [expiryOption, setExpiryOption] = useState<string>("never");
  const [customExpiry, setCustomExpiry] = useState<string>("");
  const [showOptions, setShowOptions] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [latestUrl, setLatestUrl] = useState<URLItem | null>(null);

  const calculateExpiresAt = (): string | undefined => {
    if (expiryOption === "never") return undefined;
    const now = new Date();
    if (expiryOption === "24h") {
      now.setHours(now.getHours() + 24);
      return now.toISOString();
    }
    if (expiryOption === "7d") {
      now.setDate(now.getDate() + 7);
      return now.toISOString();
    }
    if (expiryOption === "30d") {
      now.setDate(now.getDate() + 30);
      return now.toISOString();
    }
    if (expiryOption === "custom" && customExpiry) {
      const selected = new Date(customExpiry);
      return selected.toISOString();
    }
    return undefined;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmed = longUrl.trim();
    if (!trimmed) {
      setErrorMessage("Please enter a destination URL to shorten.");
      return;
    }

    if (!/^https?:\/\//i.test(trimmed)) {
      setErrorMessage("URL must begin with http:// or https://");
      return;
    }

    setIsLoading(true);

    try {
      const expiresAt = calculateExpiresAt();
      const result = await api.shortenUrl(
        trimmed,
        customAlias.trim() || undefined,
        expiresAt
      );

      setLatestUrl(result);
      onNotify("success", "URL successfully shortened!");
      if (onUrlCreated) {
        onUrlCreated(result);
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
        onNotify("error", err.message);
      } else {
        const msg = err.message || "Failed to shorten URL. Please check connection.";
        setErrorMessage(msg);
        onNotify("error", msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setLongUrl(text.trim());
        setErrorMessage(null);
      }
    } catch {
      onNotify("info", "Please paste the URL manually using Ctrl+V / Cmd+V.");
    }
  };

  return (
    <section className="hero-section">
      <div className="hero-content">
        <div className="hero-badge">
          <span className="badge-glow"></span>
          Fast &middot; Reliable &middot; Free
        </div>

        <h1 className="hero-title">
          Shorten URLs. <span className="text-gradient">Share smarter.</span>
        </h1>

        <p className="hero-subtitle">
          Transform unwieldy long links into concise, trackable, and memorable short URLs.
          Protect your links with expiration dates and custom aliases.
        </p>

        <form className="shorten-form-card" onSubmit={handleSubmit}>
          <div className="input-group-main">
            <div className="input-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
            </div>

            <input
              type="text"
              className="url-input"
              placeholder="Paste a long URL here (e.g. https://example.com/very/long/link)..."
              value={longUrl}
              onChange={(e) => {
                setLongUrl(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              disabled={isLoading}
              autoFocus
            />

            {longUrl && (
              <button
                type="button"
                className="input-clear-btn"
                onClick={() => setLongUrl("")}
                title="Clear input"
              >
                &times;
              </button>
            )}

            {!longUrl && (
              <button
                type="button"
                className="btn-paste"
                onClick={handlePaste}
                title="Paste from clipboard"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                </svg>
                Paste
              </button>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Shortening...
                </>
              ) : (
                <>
                  Shorten URL
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </>
              )}
            </button>
          </div>

          <div className="form-toggle-row">
            <button
              type="button"
              className="btn-options-toggle"
              onClick={() => setShowOptions(!showOptions)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`toggle-chevron ${showOptions ? "toggle-chevron-open" : ""}`}
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
              {showOptions ? "Hide customization options" : "Customize alias & expiration"}
            </button>
          </div>

          {showOptions && (
            <div className="options-panel animate-fade-in">
              <div className="option-col">
                <label className="option-label">
                  Custom Alias (Optional)
                  <span className="option-hint">e.g. "my-project-2026"</span>
                </label>
                <div className="alias-input-wrapper">
                  <span className="alias-prefix">link/</span>
                  <input
                    type="text"
                    className="alias-input"
                    placeholder="custom-name"
                    value={customAlias}
                    onChange={(e) => setCustomAlias(e.target.value.replace(/\s+/g, "-"))}
                    maxLength={30}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="option-col">
                <label className="option-label">Link Expiration</label>
                <div className="expiry-buttons">
                  <button
                    type="button"
                    className={`btn-pill ${expiryOption === "never" ? "btn-pill-active" : ""}`}
                    onClick={() => setExpiryOption("never")}
                  >
                    Never
                  </button>
                  <button
                    type="button"
                    className={`btn-pill ${expiryOption === "24h" ? "btn-pill-active" : ""}`}
                    onClick={() => setExpiryOption("24h")}
                  >
                    24h
                  </button>
                  <button
                    type="button"
                    className={`btn-pill ${expiryOption === "7d" ? "btn-pill-active" : ""}`}
                    onClick={() => setExpiryOption("7d")}
                  >
                    7 Days
                  </button>
                  <button
                    type="button"
                    className={`btn-pill ${expiryOption === "30d" ? "btn-pill-active" : ""}`}
                    onClick={() => setExpiryOption("30d")}
                  >
                    30 Days
                  </button>
                  <button
                    type="button"
                    className={`btn-pill ${expiryOption === "custom" ? "btn-pill-active" : ""}`}
                    onClick={() => setExpiryOption("custom")}
                  >
                    Custom
                  </button>
                </div>

                {expiryOption === "custom" && (
                  <div className="custom-date-picker animate-fade-in">
                    <input
                      type="datetime-local"
                      className="date-input"
                      value={customExpiry}
                      onChange={(e) => setCustomExpiry(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="error-banner animate-fade-in" role="alert">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}
        </form>

        {latestUrl && (
          <ResultCard
            urlItem={latestUrl}
            onViewStats={onViewStats}
            onNotify={onNotify}
          />
        )}
      </div>
    </section>
  );
};
