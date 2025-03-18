
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
        // Handle hash fragment for OAuth providers
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const provider = new URLSearchParams(window.location.search).get('provider');
        
        if (accessToken) {
          console.log('Access token found in URL');
          // Handle access token if present in the hash
        }
        
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }
        
        if (session) {
          console.log('Session found:', session.user.id);
          toast.success('Successfully signed in!');
          
          // If authentication was with Spotify, redirect to my-artists page
          if (provider === 'spotify' || (session.provider_token && provider === 'spotify')) {
            console.log('Redirecting to my-artists page');
            navigate('/my-artists');
          } else {
            navigate('/');
          }
        } else {
          console.log('No session found after redirect');
          // This might happen if the OAuth process wasn't completed
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
