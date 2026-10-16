import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";

interface AuthModalProps {
  initialMode: "login" | "register";
  isOpen: boolean;
  onClose: () => void;
  onNotify: (type: "success" | "error" | "info", msg: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  initialMode,
  isOpen,
  onClose,
  onNotify,
}) => {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { login, register } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (!password) {
      setErrorMessage("Please enter your password.");
      return;
    }

    if (mode === "register") {
      if (!name.trim()) {
        setErrorMessage("Please enter your full name.");
        return;
      }
      if (password.length < 6) {
        setErrorMessage("Password must be at least 6 characters long.");
        return;
      }
    }

    setIsLoading(true);

    try {
      if (mode === "login") {
        await login(cleanEmail, password);
        onNotify("success", "Welcome back! Logged in successfully.");
      } else {
        await register(name.trim(), cleanEmail, password);
        onNotify("success", "Account created successfully! You are now logged in.");
      }
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(err.message || "Authentication failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="modal-card modal-md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="tab-switcher">
            <button
              type="button"
              className={`tab-btn ${mode === "login" ? "tab-btn-active" : ""}`}
              onClick={() => {
                setMode("login");
                setErrorMessage(null);
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`tab-btn ${mode === "register" ? "tab-btn-active" : ""}`}
              onClick={() => {
                setMode("register");
                setErrorMessage(null);
              }}
            >
              Create Account
            </button>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>
            &times;
          </button>
        </div>

        <form className="modal-body auth-form" onSubmit={handleSubmit}>
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

          {mode === "register" && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                autoFocus
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoFocus={mode === "login"}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder={mode === "register" ? "Minimum 6 characters" : "Enter your password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                {mode === "login" ? "Signing In..." : "Creating Account..."}
              </>
            ) : mode === "login" ? (
              "Sign In to Your Account"
            ) : (
              "Create Free Account"
            )}
          </button>
        </form>

        <div className="modal-footer auth-footer">
          {mode === "login" ? (
            <p className="auth-switch-text">
              Don't have an account yet?{" "}
              <button
                type="button"
                className="btn-link"
                onClick={() => {
                  setMode("register");
                  setErrorMessage(null);
                }}
              >
                Sign up free
              </button>
            </p>
          ) : (
            <p className="auth-switch-text">
              Already have an account?{" "}
              <button
                type="button"
                className="btn-link"
                onClick={() => {
                  setMode("login");
                  setErrorMessage(null);
                }}
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
