import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import type { URLItem } from "../types/api";

interface ResultCardProps {
  urlItem: URLItem;
  onViewStats: (shortCode: string) => void;
  onNotify: (type: "success" | "error" | "info", msg: string) => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  urlItem,
  onViewStats,
  onNotify,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [showQr, setShowQr] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const displayShortUrl =
    urlItem.short_url ||
    `${window.location.origin}/${urlItem.short_code}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayShortUrl);
      setCopied(true);
      onNotify("success", "Short URL copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onNotify("error", "Failed to copy URL automatically. Please copy manually.");
    }
  };

  useEffect(() => {
    if (showQr && canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        displayShortUrl,
        {
          width: 180,
          margin: 1.5,
          color: {
            dark: "#1e1b4b",
            light: "#ffffff",
          },
        },
        (error) => {
          if (error) console.error("QR Code generation error:", error);
        }
      );
    }
  }, [showQr, displayShortUrl]);

  const handleDownloadQr = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `tinylink-${urlItem.short_code}-qr.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
    onNotify("info", "QR Code downloaded!");
  };

  return (
    <div className="result-card animate-fade-in">
      <div className="result-header">
        <div className="result-badge">
          <span className="pulse-dot"></span>
          Link Ready!
        </div>
        <span className="result-created">
          Code: <strong>{urlItem.short_code}</strong>
        </span>
      </div>

      <div className="result-body">
        <div className="result-link-box">
          <a
            href={displayShortUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="result-short-url"
            title="Open short link"
          >
            {displayShortUrl}
          </a>

          <div className="result-link-actions">
            <button
              type="button"
              className={`btn btn-sm ${copied ? "btn-success" : "btn-primary"}`}
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  Copy Link
                </>
              )}
            </button>

            <a
              href={displayShortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              Visit
            </a>

            <button
              type="button"
              className={`btn btn-secondary btn-sm ${showQr ? "btn-active" : ""}`}
              onClick={() => setShowQr(!showQr)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
              QR Code
            </button>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => onViewStats(urlItem.short_code)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
              Stats
            </button>
          </div>
        </div>

        <div className="result-original">
          <span className="result-original-label">Target:</span>
          <span className="result-original-url" title={urlItem.long_url}>
            {urlItem.long_url}
          </span>
        </div>

        {showQr && (
          <div className="qr-container animate-fade-in">
            <div className="qr-canvas-wrapper">
              <canvas ref={canvasRef}></canvas>
            </div>
            <div className="qr-actions">
              <span className="qr-hint">Scan with any mobile camera to open</span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleDownloadQr}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download PNG
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
