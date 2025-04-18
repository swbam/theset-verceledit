
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
      // Correctly destructure 'count' from the response when using head: true
      const { count, error: adminCheckError } = await supabase
        .from('admins')
        .select('*', { count: 'exact', head: true }) // Select '*' is fine with head:true
        .eq('user_id', userId);

      if (adminCheckError) {
        console.error(`Error checking admin status for ${userId}:`, adminCheckError);
        // Continue without admin status if check fails
      } else {
        // Use the destructured 'count' variable
        isAdmin = (count ?? 0) > 0;
        console.log(`User ${userId} admin status: ${isAdmin} (Count: ${count})`);
      }
    } catch (adminCheckCatchError) {
       console.error(`Exception checking admin status for ${userId}:`, adminCheckCatchError);
    }


    // 2. Extract data from Auth user object (user_metadata)
    const metadata = user.user_metadata;
    const profile: UserProfile = {
      id: userId,
      // Prefer metadata, fallback to email parts
      username: metadata?.user_name || metadata?.full_name || user.email?.split('@')[0],
      full_name: metadata?.full_name,
      avatar_url: metadata?.avatar_url,
      // Provider info might be in app_metadata or identities array
      provider: user.app_metadata?.provider || user.identities?.[0]?.provider,
      // provider_id: user.identities?.[0]?.id, // Usually not needed directly
      is_admin: isAdmin,
      created_at: user.created_at, // Get creation time from Auth user
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
