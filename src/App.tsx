import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAppStore } from "@/stores/appStore";
import { BottomNav } from "@/components/BottomNav";

// Pages
import AuthPage from "./pages/AuthPage";
import CreateUserPage from "./pages/CreateUserPage";
import HomePage from "./pages/HomePage";
import LibrariesPage from "./pages/LibrariesPage";
import CreateLibraryPage from "./pages/CreateLibraryPage";
import LibraryDetailPage from "./pages/LibraryDetailPage";
import AddItemPage from "./pages/AddItemPage";
import ItemDetailPage from "./pages/ItemDetailPage";
import SyncPage from "./pages/SyncPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const { isInitialized, isAuthenticated, initialize } = useAppStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Routes>
        {/* Auth routes */}
        <Route path="/auth" element={!isAuthenticated ? <AuthPage /> : <Navigate to="/" />} />
        <Route path="/auth/create" element={<CreateUserPage />} />
        
        {/* Protected routes */}
        <Route path="/" element={isAuthenticated ? <HomePage /> : <Navigate to="/auth" />} />
        <Route path="/libraries" element={isAuthenticated ? <LibrariesPage /> : <Navigate to="/auth" />} />
        <Route path="/libraries/create" element={isAuthenticated ? <CreateLibraryPage /> : <Navigate to="/auth" />} />
        <Route path="/libraries/:libraryId" element={isAuthenticated ? <LibraryDetailPage /> : <Navigate to="/auth" />} />
        <Route path="/add" element={isAuthenticated ? <AddItemPage /> : <Navigate to="/auth" />} />
        <Route path="/items/:itemId" element={isAuthenticated ? <ItemDetailPage /> : <Navigate to="/auth" />} />
        <Route path="/sync" element={isAuthenticated ? <SyncPage /> : <Navigate to="/auth" />} />
        <Route path="/settings" element={isAuthenticated ? <SettingsPage /> : <Navigate to="/auth" />} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
      {isAuthenticated && <BottomNav />}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
