import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback initiated');
        
        // Parse query parameters
        const params = new URLSearchParams(location.search);
        const provider = params.get('provider');
        const returnUrl = params.get('returnTo') || '/my-artists'; // Default to /my-artists
        
        console.log('Provider:', provider);
        console.log('Return URL:', returnUrl);
        
        // Get the session to verify authentication was successful
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }
        
        if (session) {
          console.log('Session found:', session.user.id);
          console.log('Provider token exists:', !!session.provider_token);
          
          // Always show success message
          toast.success('Successfully signed in!');
          
          // If authentication was with Spotify, redirect to my-artists page
          if (provider === 'spotify' || session.provider_token) {
            console.log('Redirecting to personalized dashboard after Spotify login');
            
            try {
              // First, fetch user profile to ensure it exists
              const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                  id: session.user.id,
                  updated_at: new Date().toISOString(),
                  provider: 'spotify'
                });
                
              if (profileError) {
                console.error('Error updating profile:', profileError);
              }
              
              // Fetch Spotify user data to store in the profile
              try {
                // Attempt to fetch user's top artists from Spotify to verify token works
                const spotifyResponse = await fetch('/api/spotify/me/top-artists', {
                  headers: {
                    'Authorization': `Bearer ${session.access_token}`
                  }
                });
                
                if (spotifyResponse.ok) {
                  console.log('Successfully fetched Spotify data');
                }
              } catch (spotifyError) {
                console.error('Error fetching Spotify data:', spotifyError);
                // Continue with redirect even if this fails
              }
              
              // Delay navigation slightly to ensure database operations complete
              setTimeout(() => {
                // Force a hard redirect to ensure clean state
                window.location.href = '/my-artists';
              }, 800);
            } catch (error) {
              console.error('Error in Spotify auth flow:', error);
              // Fallback to normal redirect
              navigate('/my-artists', { replace: true });
              setProcessing(false);
            }
          } else {
            // For other auth methods, go to homepage or original destination
            setTimeout(() => {
              navigate(returnUrl, { replace: true });
              setProcessing(false);
            }, 500);
          }
        } else {
          console.log('No session found after redirect');
          // This might happen if the OAuth process wasn't completed
          setError('Authentication process was interrupted. Please try again.');
          setTimeout(() => {
            navigate('/auth');
            setProcessing(false);
          }, 2000);
        }
      } catch (err: any) {
        console.error('Error during auth callback:', err);
        setError(err.message || 'Authentication failed');
        toast.error(err.message || 'Authentication failed');
        setTimeout(() => {
          navigate('/auth');
          setProcessing(false);
        }, 2000);
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
