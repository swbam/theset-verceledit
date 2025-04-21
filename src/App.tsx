import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from './contexts/auth/AuthContext';
import { initGA, trackPageView } from './integrations/google-analytics';
import Index from './pages/Index';
import ArtistDetail from './pages/ArtistDetail';
import ShowDetail from './pages/ShowDetail';
import Shows from './pages/Shows';
import Artists from './pages/Artists';
import Search from './pages/Search';
import HowItWorks from './pages/HowItWorks';
import Login from './pages/Login';
import Auth from './pages/Auth';
import AuthCallback from './pages/AuthCallback';
import Profile from './pages/Profile';
import ProtectedRoute from './components/auth/ProtectedRoute';
import MyArtists from './pages/MyArtists';
import CreateShow from './pages/CreateShow';
import NotFound from './pages/NotFound';
import TestJourney from './pages/TestJourney';
import Admin from './pages/Admin';
import Dashboard from './pages/Dashboard';
import AdminSetup from './pages/AdminSetup';
import Import from './pages/Import';
import SyncTest from './pages/admin/SyncTest';
import { ThemeProvider } from 'next-themes';

const GA_TRACKING_ID = "G-CNM6621HGW"; 

const RouteChangeTracker = () => {
  const location = useLocation();
  
  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location]);
  
  return null;
};

const GradientDefinitions = () => {
  return (
    <svg width="0" height="0" className="hidden">
      <defs>
        <linearGradient id="app-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#40e6bf" />
          <stop offset="100%" stopColor="#01ec8d" />
        </linearGradient>
      </defs>
    </svg>
  );
};

function App() {
  useEffect(() => {
    initGA(GA_TRACKING_ID);
    
    const applyGradientToIcons = () => {
      document.querySelectorAll('svg:not(.ignore-gradient) path').forEach(path => {
        if (path.getAttribute('stroke') && path.getAttribute('stroke') !== 'none') {
          path.setAttribute('stroke', 'url(#app-gradient)');
        }
        if (path.getAttribute('fill') && path.getAttribute('fill') !== 'none') {
          path.setAttribute('fill', 'url(#app-gradient)');
        }
      });
    };
    
    applyGradientToIcons();
    
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length) {
          applyGradientToIcons();
        }
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    return () => observer.disconnect();
  }, []);

  return (
    <QueryClientProvider client={new QueryClient()}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <BrowserRouter>
          <TooltipProvider>
            <AuthProvider>
              <RouteChangeTracker />
              <GradientDefinitions />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/artists/:id" element={<ArtistDetail />} />
                <Route path="/shows/:id" element={<ShowDetail />} />
                <Route path="/shows" element={<Shows />} />
                <Route path="/artists" element={<Artists />} />
                <Route path="/search" element={<Search />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/login" element={<Login />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/my-artists" element={<ProtectedRoute><MyArtists /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/create-show" element={<ProtectedRoute><CreateShow /></ProtectedRoute>} />
                <Route path="/import" element={<Import />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/setup" element={<AdminSetup />} />
                <Route path="/admin/sync-test" element={<SyncTest />} />
                <Route path="/test-journey" element={<TestJourney />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </TooltipProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
