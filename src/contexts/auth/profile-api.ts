import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from './types';
import { setUserId } from '@/integrations/google-analytics';
import { User } from '@supabase/supabase-js'; // Import Supabase User type

/**
 * Fetch user profile information by combining Auth data and admin status.
 * Note: This function now requires the full User object, not just the ID.
 */
export async function fetchUserProfile(user: User | null): Promise<UserProfile | null> {
  if (!user) return null;
  const userId = user.id;

  try {
    console.log("Fetching user profile data for:", userId);

    // 1. Check admin status
    let isAdmin = false;
    try {
      const { data: adminData, error: adminCheckError } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (adminCheckError) {
        // Only log error if it's not a "no rows returned" error
        if (adminCheckError.code !== 'PGRST116') {
          console.error(`Error checking admin status for ${userId}:`, adminCheckError);
        }
      } else {
        isAdmin = !!adminData;
      }
    } catch (adminCheckCatchError) {
      console.error(`Exception checking admin status for ${userId}:`, adminCheckCatchError);
    }

    // 2. Extract data from Auth user object (user_metadata)
    const metadata = user.user_metadata;
    const profile: UserProfile = {
      id: userId,
      username: metadata?.username || metadata?.preferred_username || metadata?.name || user.email?.split('@')[0] || userId,
      full_name: metadata?.full_name || metadata?.name || '',
      avatar_url: metadata?.avatar_url || metadata?.picture || null,
      provider: user.app_metadata?.provider || 'email',
      provider_id: user.app_metadata?.provider_id,
      is_admin: isAdmin,
      created_at: user.created_at, // Get creation time from Auth user
      updated_at: new Date().toISOString()
    };

    console.log("Constructed user profile:", profile);

    // Track user ID in Google Analytics
    setUserId(userId);

    // Identify user in PostHog if available
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.identify(userId, {
        name: profile.username || profile.full_name, // Use constructed profile data
        email: user.email, // Add email if available
        provider: profile.provider,
        is_admin: profile.is_admin,
        // Add any other relevant traits
      });
    }

    return profile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}
