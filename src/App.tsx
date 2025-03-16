
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/auth/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Search from "./pages/Search";
import Artists from "./pages/Artists"; 
import ArtistDetail from "./pages/ArtistDetail";
import ShowDetail from "./pages/ShowDetail";
import Shows from "./pages/Shows";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Profile from "./pages/Profile";
import MyArtists from "./pages/MyArtists";
import HowItWorks from "./pages/HowItWorks";
import CreateShow from "./pages/CreateShow";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <div className="app-gradient min-h-screen dark text-foreground bg-[#0A0A10]">
            <Toaster />
            <Sonner className="dark" theme="dark" />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/search" element={<Search />} />
              <Route path="/artists" element={<Artists />} />
              <Route path="/artists/:id" element={<ArtistDetail />} />
              <Route path="/shows" element={<Shows />} />
              <Route path="/shows/:id" element={<ShowDetail />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route 
                path="/my-artists" 
                element={
                  <ProtectedRoute>
                    <MyArtists />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route 
                path="/shows/create" 
                element={
                  <ProtectedRoute>
                    <CreateShow />
                  </ProtectedRoute>
                } 
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
