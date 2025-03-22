import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback started');
        // Get URL parameters to check for the provider
        const searchParams = new URLSearchParams(window.location.search);
        const provider = searchParams.get('provider');
        
        console.log('Provider from URL:', provider);
        
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }
        
        if (session) {
          console.log('Session found:', session.user.id);
          console.log('Provider token:', session.provider_token ? 'Yes' : 'No');
          
          if (session.provider_token) {
            console.log('Provider token is available');
          } else {
            console.warn('Provider token is not available - this may cause issues with Spotify API calls');
          }
          
          toast.success('Successfully signed in!');
          
          // Check if auth was with Spotify - use both the URL parameter and session info
          if (provider === 'spotify' || session.provider_token) {
            console.log('Redirecting to personalized dashboard since this was a Spotify login');
            
            // Store authentication state in localStorage for persistence
            localStorage.setItem('auth_provider', 'spotify');
            localStorage.setItem('user_id', session.user.id);
            
            // Force a slight delay to ensure state updates are complete
            setTimeout(() => {
              console.log('Now navigating to /dashboard');
              navigate('/dashboard');
            }, 1000);
          } else {
            console.log('Non-Spotify login, redirecting to home page');
            navigate('/');
          }
        } else {
          console.log('No session found after redirect');
          setError('Authentication process was interrupted. Please try again.');
          setTimeout(() => navigate('/auth'), 2000);
        }
      } catch (err: any) {
        console.error('Error during auth callback:', err);
        setError(err.message || 'Authentication failed');
        toast.error(err.message || 'Authentication failed');
        setTimeout(() => navigate('/auth'), 2000);
      }
    };

    handleAuthCallback();
  }, [navigate, location]);

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <div className="text-destructive mb-4">{error}</div>
        <p>Redirecting to login page...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <p className="text-lg">Completing authentication...</p>
      <p className="text-sm text-muted-foreground mt-2">Please wait while we verify your identity</p>
    </div>
  );
};

export default AuthCallback;
