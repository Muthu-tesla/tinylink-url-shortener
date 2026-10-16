import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar } from "./components/Navbar";
import { HeroShortener } from "./components/HeroShortener";
import { Dashboard } from "./components/Dashboard";
import { AuthModal } from "./components/AuthModal";
import { StatsModal } from "./components/StatsModal";
import { ToastContainer, type ToastMessage } from "./components/Toast";
import { Footer } from "./components/Footer";


const MainContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [currentTab, setCurrentTab] = useState<"shortener" | "dashboard">("shortener");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Auth modal state
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    mode: "login" | "register";
  }>({
    isOpen: false,
    mode: "login",
  });

  // Stats modal state
  const [statsModal, setStatsModal] = useState<{
    isOpen: boolean;
    shortCode: string | null;
  }>({
    isOpen: false,
    shortCode: null,
  });

  const notify = (type: "success" | "error" | "info", message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleOpenAuth = (mode: "login" | "register") => {
    setAuthModal({ isOpen: true, mode });
  };

  const handleCloseAuth = () => {
    setAuthModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleViewStats = (shortCode: string) => {
    setStatsModal({ isOpen: true, shortCode });
  };

  const handleCloseStats = () => {
    setStatsModal({ isOpen: false, shortCode: null });
  };

  return (
    <div className="app-layout">
      <Navbar
        currentTab={currentTab}
        onTabChange={(tab) => {
          if (tab === "dashboard" && !isAuthenticated) {
            handleOpenAuth("login");
          } else {
            setCurrentTab(tab);
          }
        }}
        onOpenAuth={handleOpenAuth}
      />

      <main className="main-content">
        {currentTab === "shortener" ? (
          <HeroShortener
            onNotify={notify}
            onViewStats={handleViewStats}
          />

        ) : (
          <Dashboard
            onViewStats={handleViewStats}
            onNotify={notify}
            onNavigateHome={() => setCurrentTab("shortener")}
          />
        )}
      </main>

      <Footer />

      {/* Modals & Overlays */}
      <AuthModal
        initialMode={authModal.mode}
        isOpen={authModal.isOpen}
        onClose={handleCloseAuth}
        onNotify={notify}
      />

      <StatsModal
        shortCode={statsModal.shortCode}
        isOpen={statsModal.isOpen}
        onClose={handleCloseStats}
        onNotify={notify}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
