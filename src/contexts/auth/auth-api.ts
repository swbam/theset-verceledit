import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/integrations/google-analytics';
import { toast } from 'sonner';

// Enhanced error handling helper
const formatAuthError = (error: any): string => {
  // Handle common Supabase auth errors with user-friendly messages
  if (error?.message?.includes('invalid login credentials')) {
    return 'Invalid email or password. Please try again.';
  } else if (error?.message?.includes('Email not confirmed')) {
    return 'Please confirm your email address before logging in.';
  } else if (error?.message?.includes('rate limited')) {
    return 'Too many login attempts. Please try again later.';
  }
  return error?.message || 'An authentication error occurred. Please try again.';
};

/**
 * Sign in with email and password
 */
export async function loginWithEmail(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    
    // Track login event in Google Analytics
    trackEvent('User', 'Login', 'Email');
    
    // Identify user in PostHog if available
    if (window.posthog && data.user) {
      window.posthog.identify(data.user.id, {
        email: data.user.email,
        name: data.user.user_metadata?.username || data.user.email
      });
    }
    
    toast.success('Logged in successfully!');
    return { data, error: null };
  } catch (error: any) {
    const errorMessage = formatAuthError(error);
    toast.error(errorMessage);
    console.error('Login error:', error);
    return { data: null, error };
  }
}

/**
 * Sign in with Google OAuth
 */
export async function loginWithGoogle() {
  try {
    const { error, data } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?provider=google`,
        queryParams: {
          access_type: 'offline', // Request a refresh token
          prompt: 'consent',      // Force consent screen for better UX
        }
      },
    });

    if (error) throw error;
    
    // Track login attempt
    trackEvent('User', 'Login Attempt', 'Google');
    
    return { success: true, error: null };
  } catch (error: any) {
    const errorMessage = formatAuthError(error);
    toast.error(errorMessage);
    console.error('Google login error:', error);
    return { success: false, error };
  }
}

/**
 * Sign in with Spotify OAuth
 */
export async function loginWithSpotify() {
  try {
    console.log('Starting Spotify login process');
    const { error, data } = await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?provider=spotify`,
        scopes: 'user-read-email user-read-private user-top-read user-follow-read playlist-read-private',
      },
    });

    if (error) {
      console.error('Spotify login error:', error);
      throw error;
    }
    
    // Track login attempt
    trackEvent('User', 'Login Attempt', 'Spotify');
    
    console.log('Spotify auth initiated successfully:', data);
    return { success: true, error: null };
  } catch (error: any) {
    const errorMessage = formatAuthError(error);
    console.error('Spotify login error:', error);
    toast.error(errorMessage);
    return { success: false, error };
  }
}

/**
 * Sign up with email and password
 */
export async function signup(email: string, password: string, username?: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username || email.split('@')[0],
          created_at: new Date().toISOString(),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?signup=true`,
      },
    });

    if (error) throw error;
    
    // Track signup event
    trackEvent('User', 'Signup', 'Email');
    
    // Identify user in PostHog if available
    if (window.posthog && data.user) {
      window.posthog.identify(data.user.id, {
        email: data.user.email,
        name: data.user.user_metadata?.username || data.user.email
      });
    }
    
    toast.success('Account created successfully!');
    
    return { data, error: null, needsEmailConfirmation: data.user && !data.user.confirmed_at };
  } catch (error: any) {
    const errorMessage = formatAuthError(error);
    toast.error(errorMessage);
    console.error('Signup error:', error);
    return { data: null, error, needsEmailConfirmation: false };
  }
}

/**
 * Sign out the current user
 */
export async function logout() {
  try {
    console.log("Logging out...");
    
    // Reset PostHog identity if available
    if (window.posthog) {
      window.posthog.reset();
    }
    
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    
    if (error) throw error;
    
    console.log("Signed out successfully");
    
    // Track logout event
    trackEvent('User', 'Logout');
    
    toast.info('Logged out successfully');
    return { success: true, error: null };
  } catch (error: any) {
    const errorMessage = formatAuthError(error);
    toast.error(errorMessage);
    console.error('Logout error:', error);
    return { success: false, error };
  }
}

/**
 * Get the current session
 */
export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) throw error;
    
    return { session: data.session, error: null };
  } catch (error: any) {
    const errorMessage = formatAuthError(error);
    console.error('Error checking session:', errorMessage);
    return { session: null, error };
  }
}
