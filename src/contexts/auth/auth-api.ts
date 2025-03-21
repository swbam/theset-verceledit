
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/integrations/google-analytics';
import { toast } from 'sonner';

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
    toast.error(error.message || 'Failed to login');
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
      },
    });

    if (error) throw error;
    
    // Track login attempt
    trackEvent('User', 'Login Attempt', 'Google');
    
    return { success: true, error: null };
  } catch (error: any) {
    toast.error(error.message || 'Failed to login with Google');
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
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Spotify login error:', error);
    toast.error(error.message || 'Failed to login with Spotify');
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
        },
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
    toast.error(error.message || 'Failed to create account');
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
    
    const { error } = await supabase.auth.signOut();
    
    if (error) throw error;
    
    console.log("Signed out successfully");
    
    // Track logout event
    trackEvent('User', 'Logout');
    
    toast.info('Logged out successfully');
    return { success: true, error: null };
  } catch (error: any) {
    toast.error(error.message || 'Failed to log out');
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
    console.error('Error checking session:', error);
    return { session: null, error };
  }
}
