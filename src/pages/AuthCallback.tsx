import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AuthError } from '@supabase/supabase-js';
import { SyncManager } from '@/lib/syncManager';

// Define error types for better type safety
type AuthCallbackErrorType = AuthError | Error | unknown;

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Completing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback started');
        // Get URL parameters to check for the provider
        const searchParams = new URLSearchParams(window.location.search);
        const provider = searchParams.get('provider');
        const code = searchParams.get('code');
        
        console.log('Provider from URL:', provider);
        console.log('Auth code present:', code ? 'Yes' : 'No');

        if (code) {
          console.log('Code found, exchanging for session...');
          setStatus('Finalizing authentication...');
          
          // Explicitly exchange the code for a session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('Error exchanging code for session:', exchangeError);
            throw exchangeError;
          }
          
          if (data?.session) {
            console.log('Session obtained:', data.session.user.id);
            localStorage.setItem('user_id', data.session.user.id);
            
            if (provider) {
              localStorage.setItem('auth_provider', provider);
            }
            
            toast.success('Successfully signed in!');
            
            // Check if auth was with Spotify
            if (provider === 'spotify' || data.session.provider_token) {
              setStatus('Syncing your Spotify artists...');
              
              try {
                // Trigger background sync for Spotify top artists
                await syncSpotifyData(data.session.user.id);
              } catch (syncError: AuthCallbackErrorType) {
                console.error('Error syncing Spotify data:', syncError);
                // Continue with redirection even if sync fails
              }
              
              setStatus('Redirecting to your personalized dashboard...');
              navigate('/my-artists');
            } else {
              navigate('/');
            }
          } else {
            console.error('No session data after code exchange');
            throw new Error('Authentication failed. Please try again.');
          }
        } else {
          console.log('No code found in URL');
          setError('Authentication process was interrupted. Please try again.');
          setTimeout(() => navigate('/auth'), 2000);
        }
      } catch (err: AuthCallbackErrorType) {
        console.error('Error during auth callback:', err);
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
        setError(errorMessage);
        toast.error(errorMessage);
        setTimeout(() => navigate('/auth'), 2000);
      }
    };

    handleAuthCallback();
  }, [navigate, location]);

  // Function to sync Spotify data
  const syncSpotifyData = async (userId: string) => {
    console.log(`Starting Spotify data sync for user ${userId}`);
    
    try {
      // Fetch top artists from Spotify
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'spotify_sync',
          userId
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to sync Spotify data');
      }
      
      const result = await response.json();
      console.log('Spotify sync result:', result);
      
      // Queue background processing of artists
      if (result.data?.artists) {
        for (const artist of result.data.artists) {
          if (artist.id) {
            console.log(`Queueing background sync for artist ${artist.name}`);
            await SyncManager.queueBackgroundSync('artist', artist.id);
          }
        }
      }
      
      return result;
    } catch (error: AuthCallbackErrorType) {
      console.error('Error in syncSpotifyData:', error);
      throw error;
    }
  };

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
      <p className="text-lg">{status}</p>
      <p className="text-sm text-muted-foreground mt-2">Please wait while we set up your experience</p>
    </div>
  );
};

export default AuthCallback;
