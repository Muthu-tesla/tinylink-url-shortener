import React, { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import type { URLItem } from "../types/api";


interface DashboardProps {
  onViewStats: (shortCode: string) => void;
  onNotify: (type: "success" | "error" | "info", msg: string) => void;
  onNavigateHome: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onViewStats,
  onNotify,
  onNavigateHome,
}) => {
  const [urls, setUrls] = useState<URLItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Deletion state
  const [urlToDelete, setUrlToDelete] = useState<URLItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchUrls = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getUserUrls(searchTerm, page, limit);
      setUrls(data.items);
      setTotalCount(data.total);
    } catch (err: any) {
      onNotify("error", err.message || "Failed to load URLs.");
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, page, limit, onNotify]);

  useEffect(() => {
    fetchUrls();
  }, [fetchUrls]);

  const handleCopy = async (url: URLItem) => {
    const shortUrl = url.short_url || `${window.location.origin}/${url.short_code}`;
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopiedId(url.id);
      onNotify("success", `Copied ${url.short_code} to clipboard!`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      onNotify("error", "Failed to copy URL.");
    }
  };

  const confirmDelete = async () => {
    if (!urlToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteUrl(urlToDelete.id);
      onNotify("success", `Link '${urlToDelete.short_code}' deleted successfully.`);
      setUrlToDelete(null);
      // Reload current page or previous if last item deleted
      if (urls.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        fetchUrls();
      }
    } catch (err: any) {
      onNotify("error", err.message || "Failed to delete link.");
    } finally {
      setIsDeleting(false);
    }
  };

  const totalClicks = urls.reduce((acc, u) => acc + (u.clicks || 0), 0);
  const totalPages = Math.ceil(totalCount / limit) || 1;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="dashboard-header">
        <div>
          <h2 className="dashboard-title">Link Management Dashboard</h2>
          <p className="dashboard-subtitle">
            Manage, inspect analytics, and monitor performance of all your shortened URLs.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onNavigateHome}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Create New Link
        </button>
      </div>

      <div className="stats-cards-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Links</span>
            <div className="stat-icon-wrapper stat-icon-indigo">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
            </div>
          </div>
          <div className="stat-card-value">{totalCount}</div>
          <div className="stat-card-desc">Active links in your account</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Total Clicks (Visible)</span>
            <div className="stat-icon-wrapper stat-icon-green">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                <polyline points="17 6 23 6 23 12"></polyline>
              </svg>
            </div>
          </div>
          <div className="stat-card-value">{totalClicks}</div>
          <div className="stat-card-desc">Combined visitor engagements</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Current Page</span>
            <div className="stat-icon-wrapper stat-icon-amber">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
          </div>
          <div className="stat-card-value">
            {page} / {totalPages}
          </div>
          <div className="stat-card-desc">Showing up to {limit} links/page</div>
        </div>
      </div>

      <div className="dashboard-content-card">
        <div className="table-toolbar">
          <div className="search-input-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search by short code or destination URL..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
            {searchTerm && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchTerm("")}
              >
                &times;
              </button>
            )}
          </div>

          <button
            type="button"
            className="btn btn-outline btn-sm btn-refresh"
            onClick={fetchUrls}
            disabled={isLoading}
            title="Refresh links"
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
              className={isLoading ? "animate-spin" : ""}
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
            </svg>
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="dashboard-loading">
            <span className="spinner spinner-large"></span>
            <p>Loading your links...</p>
          </div>
        ) : urls.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
            </div>
            <h3>No shortened links found</h3>
            <p>
              {searchTerm
                ? "No URLs matched your search query. Try clearing the filter."
                : "You haven't shortened any links yet. Create your first link to start tracking clicks!"}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onNavigateHome}
            >
              Shorten a URL Now
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="urls-table">
              <thead>
                <tr>
                  <th>Short Link</th>
                  <th>Destination URL</th>
                  <th>Clicks</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {urls.map((url) => {
                  const shortUrl = url.short_url || `${window.location.origin}/${url.short_code}`;
                  const isCopied = copiedId === url.id;

                  return (
                    <tr key={url.id}>
                      <td className="cell-short">
                        <div className="short-code-cell">
                          <a
                            href={shortUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="short-link-anchor"
                          >
                            {url.short_code}
                          </a>
                          <button
                            type="button"
                            className="btn-icon-copy"
                            onClick={() => handleCopy(url)}
                            title="Copy link"
                          >
                            {isCopied ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="cell-target">
                        <div className="target-url-wrapper" title={url.long_url}>
                          <span className="target-url-text">{url.long_url}</span>
                        </div>
                      </td>

                      <td className="cell-clicks">
                        <span className="clicks-badge">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                            <polyline points="17 6 23 6 23 12"></polyline>
                          </svg>
                          {url.clicks}
                        </span>
                      </td>

                      <td className="cell-date">
                        <span className="date-text">{formatDate(url.created_at)}</span>
                      </td>

                      <td className="cell-status">
                        {url.is_active ? (
                          <span className="status-pill status-pill-active">Active</span>
                        ) : (
                          <span className="status-pill status-pill-inactive">Inactive</span>
                        )}
                      </td>

                      <td className="cell-actions text-right">
                        <div className="actions-cluster">
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => onViewStats(url.short_code)}
                            title="View Statistics"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="20" x2="18" y2="10"></line>
                              <line x1="12" y1="20" x2="12" y2="4"></line>
                              <line x1="6" y1="20" x2="6" y2="14"></line>
                            </svg>
                            Stats
                          </button>

                          <a
                            href={shortUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost btn-xs"
                            title="Visit Link"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                              <polyline points="15 3 21 3 21 9"></polyline>
                              <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                          </a>

                          <button
                            type="button"
                            className="btn btn-danger-ghost btn-xs"
                            onClick={() => setUrlToDelete(url)}
                            title="Delete link"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination-bar">
            <span className="pagination-info">
              Showing page {page} of {totalPages} ({totalCount} total links)
            </span>

            <div className="pagination-buttons">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1 || isLoading}
              >
                Previous
              </button>

              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages || isLoading}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {urlToDelete && (
        <div className="modal-backdrop animate-fade-in" onClick={() => setUrlToDelete(null)}>
          <div className="modal-card modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm Deletion</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setUrlToDelete(null)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete short link <strong>{urlToDelete.short_code}</strong>?
              </p>
              <p className="modal-warning-text">
                Anyone visiting this link in the future will receive a 404 Not Found error. This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setUrlToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
