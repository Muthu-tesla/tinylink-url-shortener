import React from "react";
import { useAuth } from "../context/AuthContext";

interface NavbarProps {
  currentTab: "shortener" | "dashboard";
  onTabChange: (tab: "shortener" | "dashboard") => void;
  onOpenAuth: (mode: "login" | "register") => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onOpenAuth,
}) => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand" onClick={() => onTabChange("shortener")}>
          <div className="brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
          </div>
          <span className="brand-name">
            Tiny<span className="brand-highlight">Link</span>
          </span>
        </div>

        <nav className="navbar-nav">
          <button
            type="button"
            className={`nav-link ${currentTab === "shortener" ? "nav-link-active" : ""}`}
            onClick={() => onTabChange("shortener")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
            Shorten
          </button>

          <button
            type="button"
            className={`nav-link ${currentTab === "dashboard" ? "nav-link-active" : ""}`}
            onClick={() => {
              if (isAuthenticated) {
                onTabChange("dashboard");
              } else {
                onOpenAuth("login");
              }
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            Dashboard
            {!isAuthenticated && <span className="nav-badge-lock">Sign in</span>}
          </button>
        </nav>

        <div className="navbar-actions">
          {isAuthenticated && user ? (
            <div className="user-profile-menu">
              <div className="user-avatar-badge" title={user.email}>
                <span className="avatar-letter">{user.name.charAt(0).toUpperCase()}</span>
                <span className="user-display-name">{user.name}</span>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={logout}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="auth-buttons">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => onOpenAuth("login")}
              >
                Sign In
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onOpenAuth("register")}
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
