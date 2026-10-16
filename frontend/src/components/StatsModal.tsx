import React, { useState, useEffect } from "react";
import { api } from "../api/client";
import type { URLStatsResponse } from "../types/api";

interface StatsModalProps {
  shortCode: string | null;
  isOpen: boolean;
  onClose: () => void;
  onNotify: (type: "success" | "error" | "info", msg: string) => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  shortCode,
  isOpen,
  onClose,
  onNotify,
}) => {
  const [stats, setStats] = useState<URLStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !shortCode) {
      setStats(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    api
      .getUrlStats(shortCode)
      .then((data) => {
        if (isMounted) setStats(data);
      })
      .catch((err: any) => {
        if (isMounted) setError(err.message || "Failed to load link statistics.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, shortCode]);

  if (!isOpen || !shortCode) return null;

  const handleCopy = async () => {
    if (!stats) return;
    const url = stats.short_url || `${window.location.origin}/${stats.short_code}`;
    try {
      await navigator.clipboard.writeText(url);
      onNotify("success", "Short URL copied to clipboard!");
    } catch {
      onNotify("error", "Failed to copy URL.");
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Never";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="modal-card modal-md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="stats-modal-heading">
            <div className="stats-icon-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            </div>
            <h3 className="modal-title">Link Analytics & Info</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body stats-modal-body">
          {isLoading ? (
            <div className="modal-loading">
              <span className="spinner spinner-large"></span>
              <p>Fetching link analytics...</p>
            </div>
          ) : error ? (
            <div className="error-banner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{error}</span>
            </div>
          ) : stats ? (
            <div className="stats-details-flow">
              <div className="stat-hero-highlight">
                <span className="stat-hero-number">{stats.clicks}</span>
                <span className="stat-hero-label">Total Valid Clicks</span>
              </div>

              <div className="stats-meta-grid">
                <div className="stat-meta-item">
                  <span className="meta-item-label">Short Code</span>
                  <div className="meta-item-code-row">
                    <span className="meta-code-badge">{stats.short_code}</span>
                    <button
                      type="button"
                      className="btn btn-outline btn-xs"
                      onClick={handleCopy}
                    >
                      Copy Link
                    </button>
                  </div>
                </div>

                <div className="stat-meta-item">
                  <span className="meta-item-label">Status</span>
                  <span className={`status-pill ${stats.is_active ? "status-pill-active" : "status-pill-inactive"}`}>
                    {stats.is_active ? "Active" : "Expired / Inactive"}
                  </span>
                </div>

                <div className="stat-meta-item">
                  <span className="meta-item-label">Created At</span>
                  <span className="meta-item-value">{formatDate(stats.created_at)}</span>
                </div>

                <div className="stat-meta-item">
                  <span className="meta-item-label">Expiration</span>
                  <span className="meta-item-value">{formatDate(stats.expires_at)}</span>
                </div>
              </div>

              <div className="stat-target-box">
                <span className="meta-item-label">Destination URL</span>
                <a
                  href={stats.long_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="stat-destination-link"
                  title="Open destination"
                >
                  {stats.long_url}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>
              </div>

              <div className="stats-disclaimer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                <span>
                  Real-time click counter. Click counts increment accurately each time a visitor is successfully redirected.
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
