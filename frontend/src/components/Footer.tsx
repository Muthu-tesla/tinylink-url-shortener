import React, { useState, useEffect } from "react";
import { api, API_BASE } from "../api/client";
import type { HealthResponse } from "../types/api";

export const Footer: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    api
      .getHealth()
      .then((data) => setHealth(data))
      .catch(() => {
        setHealth({ status: "disconnected", database: "disconnected", redis: "disabled" });
      });
  }, []);

  const isHealthy = health?.status === "ok";

  return (
    <footer className="app-footer">
      <div className="footer-container">
        <div className="footer-left">
          <div className="footer-brand">
            <span className="brand-name">
              Tiny<span className="brand-highlight">Link</span>
            </span>
            <span className="footer-copy">
              &copy; {new Date().getFullYear()} TinyLink. High-performance, production-ready URL shortener.
            </span>
          </div>
        </div>

        <div className="footer-right">
          <div className="footer-status-indicator">
            <span className={`status-dot ${isHealthy ? "status-dot-healthy" : "status-dot-offline"}`}></span>
            <span className="status-label">
              {isHealthy ? "Backend API Operational" : "API Connecting / Degraded"}
            </span>
          </div>

          <a
            href={`${API_BASE}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            Swagger Docs
          </a>
        </div>
      </div>
    </footer>
  );
};
