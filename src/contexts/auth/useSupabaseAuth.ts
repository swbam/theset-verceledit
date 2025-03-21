
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { AuthState, UserProfile } from './types';
import { setUserId, trackEvent } from '@/integrations/google-analytics';

export function useSupabaseAuth(): AuthState & {
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithSpotify: () => Promise<void>;
  signup: (email: string, password: string, username?: string) => Promise<void>;
  logout: () => Promise<void>;
  login: () => void;
} {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      console.log("Fetching user profile for:", userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }
      
      console.log("User profile fetched:", data);
      setProfile(data);
      
      // Track user ID in Google Analytics
      setUserId(userId);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      try {
        setIsLoading(true);
        console.log("Checking session...");
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error checking session:', error);
          return;
        }

        console.log("Session check result:", data.session ? "Active session found" : "No active session");
        setSession(data.session);
        
        if (data.session?.user) {
          console.log("User found in session:", data.session.user.id);
          setUser(data.session.user);
          await fetchUserProfile(data.session.user.id);
        } else {
          console.log("No user in session");
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event);
        console.log('Current session:', currentSession ? "Present" : "None");
        
        setSession(currentSession);
        setUser(currentSession?.user || null);
        
        if (currentSession?.user) {
          console.log("User in auth change:", currentSession.user.id);
          await fetchUserProfile(currentSession.user.id);
        } else {
          console.log("No user in auth change");
          setProfile(null);
        }
        
        setIsLoading(false);
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [fetchUserProfile]);

  const login = useCallback(() => {
    navigate('/auth');
  }, [navigate]);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Track login event
      trackEvent('User', 'Login', 'Email');
      
      toast.success('Logged in successfully!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to login');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const loginWithGoogle = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?provider=google`,
        },
      });

      if (error) throw error;
      
      // Track login attempt
      trackEvent('User', 'Login Attempt', 'Google');
    } catch (error: any) {
      toast.error(error.message || 'Failed to login with Google');
      console.error('Google login error:', error);
    }
  }, []);

  const loginWithSpotify = useCallback(async () => {
    try {
      console.log('Starting Spotify login process');
      const { error, data } = await supabase.auth.signInWithOAuth({
        provider: 'spotify',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?provider=spotify`,
          scopes: 'user-read-email user-read-private user-top-read user-follow-read',
        },
      });

      if (error) {
        console.error('Spotify login error:', error);
        throw error;
      }
      
      // Track login attempt
      trackEvent('User', 'Login Attempt', 'Spotify');
      
      console.log('Spotify auth initiated successfully:', data);
    } catch (error: any) {
      console.error('Spotify login error:', error);
      toast.error(error.message || 'Failed to login with Spotify');
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, username?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username || email.split('@')[0],
          },
        },
      });

      if (error) throw error;
      
      // Track signup event
      trackEvent('User', 'Signup', 'Email');
      
      toast.success('Account created successfully!');
      
      if (data.user && !data.user.confirmed_at) {
        toast.info('Please check your email to confirm your account');
      } else {
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
      console.error('Signup error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      console.log("Logging out...");
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      console.log("Signed out successfully");
      setUser(null);
      setProfile(null);
      setSession(null);
      
      // Track logout event
      trackEvent('User', 'Logout');
      
      toast.info('Logged out successfully');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to log out');
      console.error('Logout error:', error);
    }
  }, [navigate]);

  return {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated: !!user,
    login,
    loginWithEmail,
    loginWithGoogle,
    loginWithSpotify,
    signup,
    logout,
  };
}
